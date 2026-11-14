package requisition

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"factoryhub-go/config"
	"factoryhub-go/internal/database"
	"factoryhub-go/internal/idempiere"
)

type attachmentCacheEntry struct {
	items    []AttachmentItem
	rawZip   []byte
	cachedAt time.Time
}

type Service struct {
	db              *database.DBInstance
	idempiereClient *idempiere.Client
	cfg             *config.Config
	attCacheMu      sync.RWMutex
	attCache        map[int]attachmentCacheEntry
}

func NewService(db *database.DBInstance, idempiereClient *idempiere.Client, cfg *config.Config) *Service {
	return &Service{
		db:              db,
		idempiereClient: idempiereClient,
		cfg:             cfg,
		attCache:        make(map[int]attachmentCacheEntry),
	}
}

func (s *Service) GetRequisitions(clientID, orgID int, search, status string, costCenterID int, dateDocStart, dateDocEnd string, page, limit int, sortBy, sortDir string) (*RequisitionListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	resp := &RequisitionListResponse{
		Stats:        RequisitionStats{},
		Requisitions: []RequisitionListItem{},
		Total:        0,
		Page:         page,
		Limit:        limit,
	}

	// 1. Fetch Month Statistics
	statsQuery := `
		SELECT 
			COUNT(1) as total_month,
			COUNT(CASE WHEN docstatus IN ('CO', 'CL') THEN 1 END) as completed,
			COUNT(CASE WHEN docstatus IN ('IP', 'AP') THEN 1 END) as in_progress,
			COUNT(CASE WHEN docstatus IN ('DR', 'IN') THEN 1 END) as draft
		FROM m_requisition
		WHERE datedoc >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(statsQuery, clientID, clientID, orgID, orgID).Scan(&resp.Stats).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch requisition stats: %w", err)
	}

	// 2. Build List Query & Filters
	baseQuery := `
		FROM m_requisition r
		LEFT JOIN ad_org o ON o.ad_org_id = r.ad_org_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = r.m_warehouse_id
		LEFT JOIN c_costcenter cc ON cc.c_costcenter_id = r.c_costcenter_id
		LEFT JOIN c_department dept ON dept.c_department_id = r.c_department_id
		LEFT JOIN ad_user u ON u.ad_user_id = r.createdby
		WHERE 1=1
	`
	var conditions []string
	var args []interface{}

	if clientID > 0 {
		conditions = append(conditions, "r.ad_client_id = ?")
		args = append(args, clientID)
	}
	if orgID > 0 {
		conditions = append(conditions, "r.ad_org_id = ?")
		args = append(args, orgID)
	}
	if strings.TrimSpace(search) != "" {
		conditions = append(conditions, "(r.documentno ILIKE ? OR r.description ILIKE ?)")
		searchTerm := "%" + strings.TrimSpace(search) + "%"
		args = append(args, searchTerm, searchTerm)
	}
	if strings.TrimSpace(status) != "" && strings.ToUpper(status) != "ALL" {
		conditions = append(conditions, "r.docstatus = ?")
		args = append(args, strings.ToUpper(status))
	}
	if costCenterID > 0 {
		conditions = append(conditions, "r.c_costcenter_id = ?")
		args = append(args, costCenterID)
	}
	if strings.TrimSpace(dateDocStart) != "" {
		conditions = append(conditions, "r.datedoc >= ?")
		args = append(args, strings.TrimSpace(dateDocStart))
	}
	if strings.TrimSpace(dateDocEnd) != "" {
		conditions = append(conditions, "r.datedoc <= ?")
		args = append(args, strings.TrimSpace(dateDocEnd))
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " AND " + strings.Join(conditions, " AND ")
	}

	// Count Total matching
	countSQL := "SELECT COUNT(1) " + baseQuery + whereClause
	if err := s.db.DB.Raw(countSQL, args...).Scan(&resp.Total).Error; err != nil {
		return nil, fmt.Errorf("failed to count requisitions: %w", err)
	}

	// Fetch Records with Line Count
	dataSQL := `
		SELECT 
			r.m_requisition_id as id,
			r.documentno,
			r.datedoc,
			r.daterequired,
			r.docstatus,
			CASE 
				WHEN r.docstatus = 'DR' THEN 'Draft'
				WHEN r.docstatus = 'IP' THEN 'In Progress'
				WHEN r.docstatus = 'AP' THEN 'Approved'
				WHEN r.docstatus = 'CO' THEN 'Completed'
				WHEN r.docstatus = 'CL' THEN 'Closed'
				WHEN r.docstatus = 'VO' THEN 'Voided'
				WHEN r.docstatus = 'RE' THEN 'Reversed'
				ELSE COALESCE(r.docstatus, 'Draft')
			END as status_label,
			r.ad_org_id as org_id,
			COALESCE(o.name, '-') as org_name,
			r.m_warehouse_id as warehouse_id,
			COALESCE(w.name, '-') as warehouse_name,
			r.c_costcenter_id as cost_center_id,
			COALESCE(cc.name, '-') as cost_center_name,
			r.c_department_id as department_id,
			COALESCE(dept.name, '-') as department_name,
			COALESCE(r.description, '') as description,
			COALESCE(r.totallines, 0) as totallines,
			COALESCE(u.name, '-') as createdby,
			(SELECT COUNT(1) FROM m_requisitionline rl WHERE rl.m_requisition_id = r.m_requisition_id AND rl.isactive = 'Y') as line_count
	` + baseQuery + whereClause

	// Whitelisted Server-side sorting
	orderColumn := "r.datedoc"
	switch strings.ToLower(sortBy) {
	case "documentno":
		orderColumn = "r.documentno"
	case "org_name":
		orderColumn = "o.name"
	case "datedoc":
		orderColumn = "r.datedoc"
	case "cost_center_name":
		orderColumn = "cc.name"
	case "description":
		orderColumn = "r.description"
	case "totallines":
		orderColumn = "r.totallines"
	case "docstatus":
		orderColumn = "r.docstatus"
	}

	orderDir := "DESC"
	if strings.ToUpper(sortDir) == "ASC" {
		orderDir = "ASC"
	}

	dataSQL += fmt.Sprintf(" ORDER BY %s %s, r.m_requisition_id DESC LIMIT ? OFFSET ?", orderColumn, orderDir)

	dataArgs := append(args, limit, offset)
	if err := s.db.DB.Raw(dataSQL, dataArgs...).Scan(&resp.Requisitions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch requisitions: %w", err)
	}

	return resp, nil
}

func (s *Service) GetRequisitionDetail(requisitionID int) (*RequisitionDetail, error) {
	detail := &RequisitionDetail{
		Lines: []RequisitionLineItem{},
	}

	headerSQL := `
		SELECT 
			r.m_requisition_id as id,
			r.ad_client_id,
			r.documentno,
			r.datedoc,
			r.daterequired,
			r.docstatus,
			CASE 
				WHEN r.docstatus = 'DR' THEN 'Draft'
				WHEN r.docstatus = 'IP' THEN 'In Progress'
				WHEN r.docstatus = 'AP' THEN 'Approved'
				WHEN r.docstatus = 'CO' THEN 'Completed'
				WHEN r.docstatus = 'CL' THEN 'Closed'
				WHEN r.docstatus = 'VO' THEN 'Voided'
				WHEN r.docstatus = 'RE' THEN 'Reversed'
				ELSE COALESCE(r.docstatus, 'Draft')
			END as status_label,
			r.ad_org_id as org_id,
			COALESCE(o.name, '-') as org_name,
			r.m_warehouse_id as warehouse_id,
			COALESCE(w.name, '-') as warehouse_name,
			r.c_costcenter_id as cost_center_id,
			COALESCE(cc.name, '-') as cost_center_name,
			r.c_department_id as department_id,
			COALESCE(dept.name, '-') as department_name,
			COALESCE(r.description, '') as description,
			COALESCE(r.totallines, 0) as totallines,
			COALESCE(u.name, '-') as createdby,
			(SELECT COUNT(1) FROM m_requisitionline rl WHERE rl.m_requisition_id = r.m_requisition_id AND rl.isactive = 'Y') as line_count,
			r.c_bpartner_id as c_bpartner_id,
			COALESCE(bp.name, '') as customer_name,
			r.c_period_id as c_period_id,
			COALESCE(per.name, '') as period_name,
			r.m_pricelist_id as pricelist_id,
			COALESCE(pl.name, '') as pricelist_name,
			COALESCE(pl.priceprecision, 2) as pricelist_precision,
			COALESCE(r.priorityrule, '5') as priority_rule,
			r.adw_ad_user_checked_id as adw_ad_user_checked_id,
			COALESCE(u_chk.name, '') as checked_by_name,
			r.adw_ad_user_approved_id as adw_ad_user_approved_id,
			COALESCE(u_app.name, '') as approved_by_name,
			r.created as created_at,
			COALESCE(cc.value, '') as cost_center_value,
			COALESCE(r.adw_checked_isapproved, '') as checked_isapproved,
			r.adw_checked_date as checked_date,
			COALESCE(r.adw_approve_isapproved, '') as approved_isapproved,
			r.adw_approved_date as approved_date
		FROM m_requisition r
		LEFT JOIN ad_org o ON o.ad_org_id = r.ad_org_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = r.m_warehouse_id
		LEFT JOIN c_costcenter cc ON cc.c_costcenter_id = r.c_costcenter_id
		LEFT JOIN c_department dept ON dept.c_department_id = r.c_department_id
		LEFT JOIN ad_user u ON u.ad_user_id = r.createdby
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = r.c_bpartner_id
		LEFT JOIN c_period per ON per.c_period_id = r.c_period_id
		LEFT JOIN m_pricelist pl ON pl.m_pricelist_id = r.m_pricelist_id
		LEFT JOIN ad_user u_chk ON u_chk.ad_user_id = r.adw_ad_user_checked_id
		LEFT JOIN ad_user u_app ON u_app.ad_user_id = r.adw_ad_user_approved_id
		WHERE r.m_requisition_id = ?
	`
	if err := s.db.DB.Raw(headerSQL, requisitionID).Scan(&detail.Header).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch requisition header: %w", err)
	}

	// Fetch Tenant Logo from ad_clientinfo -> ad_image
	var logoBinary []byte
	logoSQL := `
		SELECT img.binarydata
		FROM m_requisition r
		JOIN ad_clientinfo ci ON ci.ad_client_id = r.ad_client_id
		JOIN ad_image img ON img.ad_image_id = COALESCE(ci.logo_id, ci.logoreport_id, ci.logoweb_id)
		WHERE r.m_requisition_id = ?
		  AND img.binarydata IS NOT NULL
		LIMIT 1
	`
	if err := s.db.DB.Raw(logoSQL, requisitionID).Row().Scan(&logoBinary); err == nil && len(logoBinary) > 0 {
		detail.Header.LogoBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(logoBinary)
	} else {
		// Fallback to active tenant logo in ad_clientinfo
		var fallbackBinary []byte
		fallbackSQL := `
			SELECT img.binarydata
			FROM ad_clientinfo ci
			JOIN ad_image img ON img.ad_image_id = COALESCE(ci.logo_id, ci.logoreport_id, ci.logoweb_id)
			WHERE img.binarydata IS NOT NULL
			LIMIT 1
		`
		if err := s.db.DB.Raw(fallbackSQL).Row().Scan(&fallbackBinary); err == nil && len(fallbackBinary) > 0 {
			detail.Header.LogoBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(fallbackBinary)
		}
	}

	lines, err := s.GetRequisitionLines(requisitionID)
	if err == nil {
		detail.Lines = lines
	}

	return detail, nil
}

func (s *Service) GetRequisitionLines(requisitionID int) ([]RequisitionLineItem, error) {
	lines := []RequisitionLineItem{}

	linesSQL := `
		SELECT 
			rl.m_requisitionline_id as id,
			rl.m_requisition_id as requisition_id,
			rl.line,
			rl.m_product_id as product_id,
			COALESCE(p.value, '') as product_code,
			COALESCE(p.name, '') as product_name,
			rl.c_uom_id as uom_id,
			COALESCE(uom.uomsymbol, uom.name, '-') as uom_name,
			COALESCE(uom.stdprecision, 0) as uom_precision,
			rl.qty,
			rl.priceactual,
			rl.linenetamt,
			rl.daterequired as daterequired,
			COALESCE(rl.description, '') as description
		FROM m_requisitionline rl
		LEFT JOIN m_product p ON p.m_product_id = rl.m_product_id
		LEFT JOIN c_uom uom ON uom.c_uom_id = rl.c_uom_id
		WHERE rl.m_requisition_id = ?
		  AND rl.isactive = 'Y'
		ORDER BY rl.line ASC, rl.m_requisitionline_id ASC
	`
	if err := s.db.DB.Raw(linesSQL, requisitionID).Scan(&lines).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch requisition lines: %w", err)
	}

	if len(lines) == 0 {
		return lines, nil
	}

	// Optimized batch query for PO link info across all requisition lines
	type poOrderedSum struct {
		ReqLineID int     `gorm:"column:m_requisitionline_id"`
		Qty       float64 `gorm:"column:total_ordered_qty"`
	}
	var poSums []poOrderedSum
	poSQL := `
		SELECT 
			ol.m_requisitionline_id,
			SUM(ol.qtyordered) as total_ordered_qty
		FROM c_orderline ol
		JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		JOIN c_order o ON o.c_order_id = ol.c_order_id
		WHERE rl.m_requisition_id = ?
		  AND o.docstatus NOT IN ('VO', 'RE')
		  AND ol.isactive = 'Y'
		GROUP BY ol.m_requisitionline_id
	`
	if err := s.db.DB.Raw(poSQL, requisitionID).Scan(&poSums).Error; err == nil && len(poSums) > 0 {
		poMap := make(map[int]float64, len(poSums))
		for _, ps := range poSums {
			poMap[ps.ReqLineID] = ps.Qty
		}
		for i := range lines {
			if sumQty, exists := poMap[lines[i].ID]; exists {
				lines[i].TotalOrderedQty = sumQty
				lines[i].IsPOLinked = true
			}
		}
	}

	return lines, nil
}

func (s *Service) GetMasterOptions(clientID, orgID int) (*MasterOptionsResponse, error) {
	opts := &MasterOptionsResponse{
		Organizations: []DropdownOption{},
		Warehouses:    []DropdownOption{},
		PriceLists:    []DropdownOption{},
		CostCenters:   []DropdownOption{},
		Departments:   []DropdownOption{},
		Priorities:    []PriorityOption{},
		Customers:     []DropdownOption{},
		Periods:       []DropdownOption{},
		Users:         []DropdownOption{},
		ClientName:    "PT. Adyawinsa Plastics Industry",
	}

	if s.cfg != nil && s.cfg.ERP != nil && s.cfg.ERP.DefaultClientName != "" {
		opts.ClientName = s.cfg.ERP.DefaultClientName
	}

	// Organizations
	orgSQL := `
		SELECT ad_org_id as id, name as text
		FROM ad_org
		WHERE isactive = 'Y' AND ad_org_id <> 0 AND (? = 0 OR ad_client_id = ?)
		ORDER BY name ASC
	`
	s.db.DB.Raw(orgSQL, clientID, clientID).Scan(&opts.Organizations)

	// Warehouses
	whSQL := `
		SELECT m_warehouse_id as id, name as text
		FROM m_warehouse
		WHERE isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		ORDER BY name ASC
	`
	s.db.DB.Raw(whSQL, clientID, clientID, orgID, orgID).Scan(&opts.Warehouses)

	// PriceLists
	plSQL := `
		SELECT m_pricelist_id as id, name as text, COALESCE(priceprecision, 2) as precision
		FROM m_pricelist
		WHERE isactive = 'Y' AND (? = 0 OR ad_client_id = ?)
		ORDER BY name ASC
	`
	s.db.DB.Raw(plSQL, clientID, clientID).Scan(&opts.PriceLists)

	// Cost Centers
	ccSQL := `
		SELECT c_costcenter_id as id, name as text
		FROM c_costcenter
		WHERE isactive = 'Y' AND (? = 0 OR ad_client_id = ?)
		ORDER BY name ASC
	`
	s.db.DB.Raw(ccSQL, clientID, clientID).Scan(&opts.CostCenters)

	// Departments
	deptSQL := `
		SELECT c_department_id as id, name as text
		FROM c_department
		WHERE isactive = 'Y' AND (? = 0 OR ad_client_id = ?)
		ORDER BY name ASC
	`
	s.db.DB.Raw(deptSQL, clientID, clientID).Scan(&opts.Departments)

	// Priorities (_PriorityRule)
	prioSQL := `
		SELECT rl.value as value, rl.name as name
		FROM ad_ref_list rl
		JOIN ad_reference r ON r.ad_reference_id = rl.ad_reference_id
		WHERE r.name = '_PriorityRule' AND rl.isactive = 'Y'
		ORDER BY rl.value ASC
	`
	s.db.DB.Raw(prioSQL).Scan(&opts.Priorities)

	// Customers
	custSQL := `
		SELECT c_bpartner_id as id, name as text
		FROM c_bpartner
		WHERE isactive = 'Y' AND iscustomer = 'Y' AND (? = 0 OR ad_client_id = ?)
		ORDER BY name ASC
		LIMIT 100
	`
	s.db.DB.Raw(custSQL, clientID, clientID).Scan(&opts.Customers)

	// Periods
	periodSQL := `
		SELECT c_period_id as id, name as text
		FROM c_period
		WHERE isactive = 'Y' AND (? = 0 OR ad_client_id = ?)
		ORDER BY startdate DESC
		LIMIT 36
	`
	s.db.DB.Raw(periodSQL, clientID, clientID).Scan(&opts.Periods)

	// Users (for Checked By & Approved By)
	userSQL := `
		SELECT DISTINCT u.ad_user_id as id, u.name as text
		FROM ad_user u
		WHERE u.isactive = 'Y' AND (? = 0 OR u.ad_client_id = ?)
		ORDER BY u.name ASC
		LIMIT 100
	`
	s.db.DB.Raw(userSQL, clientID, clientID).Scan(&opts.Users)

	// Client Name
	var clientName string
	clientSQL := `SELECT name FROM ad_client WHERE ad_client_id = ? LIMIT 1`
	if err := s.db.DB.Raw(clientSQL, clientID).Scan(&clientName).Error; err == nil && clientName != "" {
		opts.ClientName = clientName
	}

	// Client Logo from ad_clientinfo -> ad_image
	var logoBinary []byte
	logoSQL := `
		SELECT img.binarydata
		FROM ad_clientinfo ci
		JOIN ad_image img ON img.ad_image_id = COALESCE(ci.logo_id, ci.logoreport_id, ci.logoweb_id)
		WHERE (ci.ad_client_id = ? OR ? = 0)
		  AND img.binarydata IS NOT NULL
		ORDER BY CASE WHEN ci.ad_client_id = ? THEN 0 ELSE 1 END
		LIMIT 1
	`
	if err := s.db.DB.Raw(logoSQL, clientID, clientID, clientID).Row().Scan(&logoBinary); err == nil && len(logoBinary) > 0 {
		opts.LogoBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(logoBinary)
	}

	return opts, nil
}

func (s *Service) SearchProducts(clientID int, query string) ([]ProductOption, error) {
	var products []ProductOption

	sql := `
		SELECT 
			p.m_product_id as id,
			COALESCE(p.value, '') as code,
			COALESCE(p.name, '') as name,
			COALESCE(p.c_uom_id, 0) as uom_id,
			COALESCE(uom.uomsymbol, uom.name, '-') as uom_name,
			COALESCE(uom.stdprecision, 0) as uom_precision,
			0.0 as price_list
		FROM m_product p
		LEFT JOIN c_uom uom ON uom.c_uom_id = p.c_uom_id
		WHERE p.isactive = 'Y'
		  AND (? = 0 OR p.ad_client_id = ?)
		  AND (p.name ILIKE ? OR p.value ILIKE ?)
		ORDER BY p.name ASC
		LIMIT 30
	`
	qTerm := "%" + strings.TrimSpace(query) + "%"
	if err := s.db.DB.Raw(sql, clientID, clientID, qTerm, qTerm).Scan(&products).Error; err != nil {
		return nil, fmt.Errorf("failed to search products: %w", err)
	}

	return products, nil
}

func (s *Service) CreateRequisition(token string, clientID int, userID int, req CreateRequisitionRequest) (map[string]interface{}, error) {
	docTypeID := 1000018
	if s.cfg != nil && s.cfg.ERP != nil && s.cfg.ERP.PRDocTypeID > 0 {
		docTypeID = s.cfg.ERP.PRDocTypeID
	}

	payload := map[string]interface{}{
		"AD_Client_ID":   clientID,
		"AD_Org_ID":      req.OrgID,
		"M_Warehouse_ID": req.WarehouseID,
		"M_PriceList_ID": req.PriceListID,
		"PriorityRule":   req.PriorityRule,
		"DateDoc":        req.DateDoc,
		"DateRequired":   req.DateRequired,
		"C_DocType_ID":   docTypeID, // Purchase Requisition
		"Description":    req.Description,
		"IsActive":       true,
	}

	if userID > 0 {
		payload["AD_User_ID"] = userID
	}
	if req.CostCenterID != nil && *req.CostCenterID > 0 {
		payload["C_CostCenter_ID"] = *req.CostCenterID
	}
	if req.DepartmentID != nil && *req.DepartmentID > 0 {
		payload["C_Department_ID"] = *req.DepartmentID
	}
	if req.CBPartnerID != nil && *req.CBPartnerID > 0 {
		payload["C_BPartner_ID"] = *req.CBPartnerID
	}
	if req.CPeriodID != nil && *req.CPeriodID > 0 {
		payload["C_Period_ID"] = *req.CPeriodID
	}
	if req.CheckedByID != nil && *req.CheckedByID > 0 {
		payload["ADW_AD_User_Checked_ID"] = *req.CheckedByID
	}
	if req.ApprovedByID != nil && *req.ApprovedByID > 0 {
		payload["ADW_AD_User_Approved_ID"] = *req.ApprovedByID
	}

	res, err := s.idempiereClient.PostModel(token, "m_requisition", payload)
	if err != nil {
		return nil, fmt.Errorf("failed to create requisition via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) CreateRequisitionLine(token string, requisitionID int, req CreateRequisitionLineRequest) (map[string]interface{}, error) {
	productID := req.ProductID
	uomID := req.UOMID

	if productID <= 0 && strings.TrimSpace(req.ProductCode) != "" {
		code := strings.TrimSpace(req.ProductCode)
		var p struct {
			ProductID int `gorm:"column:m_product_id"`
			UOMID     int `gorm:"column:c_uom_id"`
		}
		err := s.db.DB.Raw(`
			SELECT m_product_id, c_uom_id 
			FROM m_product 
			WHERE isactive = 'Y' AND (value = ? OR name = ?)
			LIMIT 1
		`, code, code).Scan(&p).Error
		if err != nil || p.ProductID <= 0 {
			return nil, fmt.Errorf("product '%s' not found", code)
		}
		productID = p.ProductID
		if uomID <= 0 {
			uomID = p.UOMID
		}
	} else if productID <= 0 {
		return nil, fmt.Errorf("product is required")
	}

	priceActual := req.PriceActual
	if priceActual <= 0 {
		var plPrice float64
		_ = s.db.DB.Raw(`
			SELECT COALESCE(pp.pricestd, 0)
			FROM m_requisition r
			JOIN m_pricelist_version plv ON plv.m_pricelist_id = r.m_pricelist_id AND plv.isactive = 'Y'
			JOIN m_productprice pp ON pp.m_pricelist_version_id = plv.m_pricelist_version_id AND pp.m_product_id = ? AND pp.isactive = 'Y'
			WHERE r.m_requisition_id = ?
			ORDER BY plv.validfrom DESC
			LIMIT 1
		`, productID, requisitionID).Scan(&plPrice)
		if plPrice > 0 {
			priceActual = plPrice
		}
	}

	payload := map[string]interface{}{
		"M_Requisition_ID": requisitionID,
		"M_Product_ID":     productID,
		"Qty":              req.Qty,
		"PriceActual":      priceActual,
		"Description":      req.Description,
		"IsActive":         true,
	}

	if uomID > 0 {
		payload["C_UOM_ID"] = uomID
	} else {
		var defaultUomID int
		if err := s.db.DB.Raw("SELECT c_uom_id FROM m_product WHERE m_product_id = ?", productID).Scan(&defaultUomID).Error; err == nil && defaultUomID > 0 {
			payload["C_UOM_ID"] = defaultUomID
		}
	}

	res, err := s.idempiereClient.PostModel(token, "m_requisitionline", payload)
	if err != nil {
		return nil, fmt.Errorf("failed to add requisition line via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) UpdateRequisitionLine(token string, lineID int, req CreateRequisitionLineRequest) (map[string]interface{}, error) {
	// 1. Fetch current line data
	var currentLine struct {
		ProductID int     `gorm:"column:m_product_id"`
		Qty       float64 `gorm:"column:qty"`
	}
	if err := s.db.DB.Raw("SELECT m_product_id, qty FROM m_requisitionline WHERE m_requisitionline_id = ?", lineID).Scan(&currentLine).Error; err != nil {
		return nil, fmt.Errorf("requisition line not found: %w", err)
	}

	// 2. Check relation with c_orderline
	var poRelation struct {
		LinkedCount     int     `gorm:"column:linked_count"`
		TotalOrderedQty float64 `gorm:"column:total_ordered_qty"`
	}
	poSQL := `
		SELECT 
			COUNT(ol.c_orderline_id) as linked_count,
			COALESCE(SUM(ol.qtyordered), 0) as total_ordered_qty
		FROM c_orderline ol
		JOIN c_order o ON o.c_order_id = ol.c_order_id
		WHERE ol.m_requisitionline_id = ?
		  AND o.docstatus NOT IN ('VO', 'RE')
		  AND ol.isactive = 'Y'
	`
	if err := s.db.DB.Raw(poSQL, lineID).Scan(&poRelation).Error; err != nil {
		return nil, fmt.Errorf("failed to check purchase order relations: %w", err)
	}

	if poRelation.LinkedCount > 0 {
		// Validation A: Product item cannot be changed
		if req.ProductID > 0 && req.ProductID != currentLine.ProductID {
			return nil, fmt.Errorf("Product item cannot be changed because this requisition line is already linked to Purchase Order line(s).")
		}

		// Validation B: Qty cannot be less than SUM of qtyordered in related c_orderline
		if req.Qty < poRelation.TotalOrderedQty {
			return nil, fmt.Errorf("Quantity cannot be less than total Quantity Ordered on Purchase Order (%v). Current Quantity Ordered: %v.", poRelation.TotalOrderedQty, poRelation.TotalOrderedQty)
		}
	}

	payload := map[string]interface{}{
		"Qty":         req.Qty,
		"PriceActual": req.PriceActual,
		"Description": req.Description,
	}
	if req.ProductID > 0 {
		payload["M_Product_ID"] = req.ProductID
	}
	if req.UOMID > 0 {
		payload["C_UOM_ID"] = req.UOMID
	} else if req.ProductID > 0 {
		var uomID int
		if err := s.db.DB.Raw("SELECT c_uom_id FROM m_product WHERE m_product_id = ?", req.ProductID).Scan(&uomID).Error; err == nil && uomID > 0 {
			payload["C_UOM_ID"] = uomID
		}
	}

	res, err := s.idempiereClient.PutModel(token, "m_requisitionline", lineID, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to update requisition line via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) DeleteRequisitionLine(token string, lineID int) error {
	var linkedCount int
	poSQL := `
		SELECT COUNT(ol.c_orderline_id)
		FROM c_orderline ol
		JOIN c_order o ON o.c_order_id = ol.c_order_id
		WHERE ol.m_requisitionline_id = ?
		  AND o.docstatus NOT IN ('VO', 'RE')
		  AND ol.isactive = 'Y'
	`
	if err := s.db.DB.Raw(poSQL, lineID).Scan(&linkedCount).Error; err == nil && linkedCount > 0 {
		return fmt.Errorf("Cannot delete requisition line because it is already linked to Purchase Order line(s).")
	}

	if err := s.idempiereClient.DeleteModel(token, "m_requisitionline", lineID); err != nil {
		return fmt.Errorf("failed to delete requisition line via API Engine: %w", err)
	}
	return nil
}

func (s *Service) UpdateRequisition(token string, requisitionID int, req CreateRequisitionRequest) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"AD_Org_ID":      req.OrgID,
		"M_Warehouse_ID": req.WarehouseID,
		"M_PriceList_ID": req.PriceListID,
		"PriorityRule":   req.PriorityRule,
		"DateDoc":        req.DateDoc,
		"DateRequired":   req.DateRequired,
		"Description":    req.Description,
	}

	if req.CostCenterID != nil && *req.CostCenterID > 0 {
		payload["C_CostCenter_ID"] = *req.CostCenterID
	}
	if req.DepartmentID != nil && *req.DepartmentID > 0 {
		payload["C_Department_ID"] = *req.DepartmentID
	}
	if req.CBPartnerID != nil && *req.CBPartnerID > 0 {
		payload["C_BPartner_ID"] = *req.CBPartnerID
	}
	if req.CPeriodID != nil && *req.CPeriodID > 0 {
		payload["C_Period_ID"] = *req.CPeriodID
	}
	if req.CheckedByID != nil && *req.CheckedByID > 0 {
		payload["ADW_AD_User_Checked_ID"] = *req.CheckedByID
	}
	if req.ApprovedByID != nil && *req.ApprovedByID > 0 {
		payload["ADW_AD_User_Approved_ID"] = *req.ApprovedByID
	}

	res, err := s.idempiereClient.PutModel(token, "m_requisition", requisitionID, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to update requisition via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) ProcessRequisition(token string, requisitionID int, docAction string) (map[string]interface{}, error) {
	// 1. Fetch current status from database
	var current struct {
		DocStatus  string `gorm:"column:docstatus"`
		DocumentNo string `gorm:"column:documentno"`
	}
	err := s.db.DB.Raw(`SELECT docstatus, documentno FROM m_requisition WHERE m_requisition_id = ?`, requisitionID).Scan(&current).Error
	if err != nil || current.DocStatus == "" {
		return nil, fmt.Errorf("requisition not found")
	}

	// 2. Validate action based on workflow reference in api-web-portal-v2
	switch docAction {
	case "RE": // Re-Activate
		if current.DocStatus != "CO" {
			return nil, fmt.Errorf("this requisition cannot be re-activated from its current status (%s)", current.DocStatus)
		}

		// As implemented in api-web-portal-v2: direct database update for Re-Active
		// because standard iDempiere M_Requisition workflow does not implement reActivateIt()
		updateQuery := `
			UPDATE m_requisition 
			SET docstatus = 'DR',
			    docaction = 'CO',
			    processed = 'N',
			    processing = 'N',
			    processedon = 0,
			    updated = NOW()
			WHERE m_requisition_id = ?
		`
		if err := s.db.DB.Exec(updateQuery, requisitionID).Error; err != nil {
			return nil, fmt.Errorf("failed to re-activate requisition: %w", err)
		}

		return map[string]interface{}{
			"m_requisition_id": requisitionID,
			"docstatus":        "DR",
			"docaction":        "CO",
		}, nil

	case "CO", "VO":
		if current.DocStatus != "DR" && current.DocStatus != "IP" && current.DocStatus != "IN" {
			return nil, fmt.Errorf("action %s cannot be executed on document with status %s", docAction, current.DocStatus)
		}

	case "CL":
		if current.DocStatus != "CO" {
			return nil, fmt.Errorf("action Close (CL) cannot be executed on document with status %s", current.DocStatus)
		}

	default:
		return nil, fmt.Errorf("unsupported document action: %s", docAction)
	}

	// 3. For standard actions (CO, VO, CL), call iDempiere REST API with TrekGlobal directive 'doc-action'
	payload := map[string]interface{}{
		"doc-action": docAction,
	}

	res, err := s.idempiereClient.PutModel(token, "m_requisition", requisitionID, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to process requisition via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) DeleteRequisition(token string, requisitionID int) error {
	var linkedCount int
	poSQL := `
		SELECT COUNT(ol.c_orderline_id)
		FROM c_orderline ol
		JOIN c_order o ON o.c_order_id = ol.c_order_id
		JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		WHERE rl.m_requisition_id = ?
		  AND o.docstatus NOT IN ('VO', 'RE')
		  AND ol.isactive = 'Y'
	`
	if err := s.db.DB.Raw(poSQL, requisitionID).Scan(&linkedCount).Error; err == nil && linkedCount > 0 {
		return fmt.Errorf("Cannot delete requisition document because one or more lines are already linked to Purchase Order line(s).")
	}

	if err := s.idempiereClient.DeleteModel(token, "m_requisition", requisitionID); err != nil {
		return fmt.Errorf("failed to delete requisition via API Engine: %w", err)
	}
	return nil
}

type tailReaderAt struct {
	tail       []byte
	totalSize  int64
	tailOffset int64
}

func (t *tailReaderAt) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 || off > t.totalSize {
		return 0, io.EOF
	}
	if off < t.tailOffset {
		return 0, fmt.Errorf("offset %d before tail offset %d", off, t.tailOffset)
	}
	relOff := off - t.tailOffset
	if relOff >= int64(len(t.tail)) {
		return 0, io.EOF
	}
	n = copy(p, t.tail[relOff:])
	if n < len(p) {
		return n, io.EOF
	}
	return n, nil
}

func (s *Service) parseZipEntries(zr *zip.Reader, attachmentID, requisitionID int, created time.Time) []AttachmentItem {
	var items []AttachmentItem
	for _, f := range zr.File {
		ext := strings.ToLower(filepath.Ext(f.Name))
		isImg := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
		isPDF := ext == ".pdf"
		mime := "application/octet-stream"
		if isImg {
			if ext == ".jpg" || ext == ".jpeg" {
				mime = "image/jpeg"
			} else if ext == ".png" {
				mime = "image/png"
			} else if ext == ".webp" {
				mime = "image/webp"
			} else if ext == ".gif" {
				mime = "image/gif"
			}
		} else if isPDF {
			mime = "application/pdf"
		} else if ext == ".docx" {
			mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		} else if ext == ".xlsx" {
			mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		}

		items = append(items, AttachmentItem{
			AttachmentID: attachmentID,
			RecordID:     requisitionID,
			FileName:     f.Name,
			FileSize:     int64(f.UncompressedSize64),
			MimeType:     mime,
			IsImage:      isImg,
			IsPDF:        isPDF,
			CreatedAt:    created,
			DownloadURL:  fmt.Sprintf("/api/v1/requisitions/%d/attachments/%s", requisitionID, url.PathEscape(f.Name)),
		})
	}
	return items
}

func (s *Service) GetRequisitionAttachments(requisitionID int) ([]AttachmentItem, error) {
	// 1. Check in-memory cache
	s.attCacheMu.RLock()
	entry, exists := s.attCache[requisitionID]
	s.attCacheMu.RUnlock()
	if exists && time.Since(entry.cachedAt) < 15*time.Minute {
		return entry.items, nil
	}

	// 2. Query metadata and binary length first
	var meta struct {
		ADAttachmentID int       `gorm:"column:ad_attachment_id"`
		RecordID       int       `gorm:"column:record_id"`
		Created        time.Time `gorm:"column:created"`
		TotalLen       int64     `gorm:"column:total_len"`
	}
	checkSQL := `
		SELECT ad_attachment_id, record_id, created, COALESCE(length(binarydata), 0) as total_len
		FROM ad_attachment 
		WHERE ad_table_id = 702 
		  AND record_id = ? 
		  AND isactive = 'Y'
		ORDER BY ad_attachment_id DESC
		LIMIT 1
	`
	if err := s.db.DB.Raw(checkSQL, requisitionID).Scan(&meta).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch attachments: %w", err)
	}

	if meta.ADAttachmentID == 0 || meta.TotalLen == 0 {
		s.attCacheMu.Lock()
		s.attCache[requisitionID] = attachmentCacheEntry{
			items:    []AttachmentItem{},
			cachedAt: time.Now(),
		}
		s.attCacheMu.Unlock()
		return []AttachmentItem{}, nil
	}

	// 3. Fast Tail Reading: Read only central directory at tail (last 128KB)
	tailSize := int64(131072) // 128 KB
	if tailSize > meta.TotalLen {
		tailSize = meta.TotalLen
	}
	startPos := meta.TotalLen - tailSize + 1 // PostgreSQL substring is 1-indexed

	var tailBytes []byte
	tailSQL := `SELECT substring(binarydata from ? for ?) FROM ad_attachment WHERE ad_attachment_id = ?`
	if err := s.db.DB.Raw(tailSQL, startPos, tailSize, meta.ADAttachmentID).Row().Scan(&tailBytes); err == nil && len(tailBytes) > 0 {
		tr := &tailReaderAt{
			tail:       tailBytes,
			totalSize:  meta.TotalLen,
			tailOffset: meta.TotalLen - int64(len(tailBytes)),
		}
		zr, err := zip.NewReader(tr, meta.TotalLen)
		if err == nil {
			items := s.parseZipEntries(zr, meta.ADAttachmentID, requisitionID, meta.Created)
			s.attCacheMu.Lock()
			s.attCache[requisitionID] = attachmentCacheEntry{
				items:    items,
				cachedAt: time.Now(),
			}
			s.attCacheMu.Unlock()
			return items, nil
		}
		log.Printf("[GetRequisitionAttachments] Tail reader fallback for req %d (%v)", requisitionID, err)
	}

	// 4. Fallback to full download if tail reader could not parse
	var fullBinary []byte
	if err := s.db.DB.Raw("SELECT binarydata FROM ad_attachment WHERE ad_attachment_id = ?", meta.ADAttachmentID).Row().Scan(&fullBinary); err != nil {
		return nil, fmt.Errorf("failed to fetch full attachment: %w", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(fullBinary), int64(len(fullBinary)))
	if err != nil {
		return nil, fmt.Errorf("failed to read zip: %w", err)
	}

	items := s.parseZipEntries(zr, meta.ADAttachmentID, requisitionID, meta.Created)
	s.attCacheMu.Lock()
	s.attCache[requisitionID] = attachmentCacheEntry{
		items:    items,
		rawZip:   fullBinary,
		cachedAt: time.Now(),
	}
	s.attCacheMu.Unlock()

	return items, nil
}

func (s *Service) GetAttachmentFileContent(requisitionID int, fileName string) ([]byte, string, error) {
	s.attCacheMu.RLock()
	entry, exists := s.attCache[requisitionID]
	s.attCacheMu.RUnlock()

	var zipBytes []byte
	if exists && len(entry.rawZip) > 0 {
		zipBytes = entry.rawZip
	} else {
		query := `
			SELECT binarydata 
			FROM ad_attachment 
			WHERE ad_table_id = 702 
			  AND record_id = ? 
			  AND isactive = 'Y'
			ORDER BY ad_attachment_id DESC
			LIMIT 1
		`
		if err := s.db.DB.Raw(query, requisitionID).Row().Scan(&zipBytes); err != nil {
			return nil, "", fmt.Errorf("failed to fetch attachment: %w", err)
		}
		s.attCacheMu.Lock()
		if cur, ok := s.attCache[requisitionID]; ok {
			cur.rawZip = zipBytes
			s.attCache[requisitionID] = cur
		}
		s.attCacheMu.Unlock()
	}

	if len(zipBytes) == 0 {
		return nil, "", fmt.Errorf("no attachment data found")
	}

	zr, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return nil, "", fmt.Errorf("failed to read zip archive: %w", err)
	}

	for _, f := range zr.File {
		if f.Name == fileName || strings.EqualFold(f.Name, fileName) {
			rc, err := f.Open()
			if err != nil {
				return nil, "", fmt.Errorf("failed to open file in zip: %w", err)
			}
			defer rc.Close()

			data, err := io.ReadAll(rc)
			if err != nil {
				return nil, "", fmt.Errorf("failed to read file in zip: %w", err)
			}

			ext := strings.ToLower(filepath.Ext(fileName))
			mime := "application/octet-stream"
			if ext == ".jpg" || ext == ".jpeg" {
				mime = "image/jpeg"
			} else if ext == ".png" {
				mime = "image/png"
			} else if ext == ".pdf" {
				mime = "application/pdf"
			} else if ext == ".webp" {
				mime = "image/webp"
			}
			return data, mime, nil
		}
	}

	return nil, "", fmt.Errorf("file not found: %s", fileName)
}

func (s *Service) UploadRequisitionAttachment(token string, requisitionID int, fileName string, fileBytes []byte) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"name": fileName,
		"data": base64.StdEncoding.EncodeToString(fileBytes),
	}

	endpoint := fmt.Sprintf("m_requisition/%d/attachments", requisitionID)
	res, err := s.idempiereClient.PostModel(token, endpoint, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to upload attachment via API Engine: %w", err)
	}

	// Invalidate cache
	s.attCacheMu.Lock()
	delete(s.attCache, requisitionID)
	s.attCacheMu.Unlock()

	return res, nil
}

func (s *Service) DeleteRequisitionAttachment(token string, requisitionID int, fileName string) error {
	encodedName := url.PathEscape(fileName)
	endpoint := fmt.Sprintf("models/m_requisition/%d/attachments/%s", requisitionID, encodedName)
	if err := s.idempiereClient.DeleteEndpoint(token, endpoint); err != nil {
		return fmt.Errorf("failed to delete attachment via API Engine: %w", err)
	}

	// Invalidate cache
	s.attCacheMu.Lock()
	delete(s.attCache, requisitionID)
	s.attCacheMu.Unlock()

	return nil
}

type RequisitionCounts struct {
	Lines       int `json:"lines"`
	Attachments int `json:"attachments"`
	Chats       int `json:"chats"`
	Orders      int `json:"orders"`
	ChangeLogs  int `json:"change_logs"`
}

func (s *Service) GetRequisitionCounts(requisitionID int) (*RequisitionCounts, error) {
	counts := &RequisitionCounts{}

	// 1. Lines count
	_ = s.db.DB.Raw(`
		SELECT COUNT(*) 
		FROM m_requisitionline 
		WHERE m_requisition_id = ? AND isactive = 'Y'
	`, requisitionID).Scan(&counts.Lines)

	// 2. Attachments count (from cache if exists, or fast check)
	s.attCacheMu.RLock()
	entry, hasAttCache := s.attCache[requisitionID]
	s.attCacheMu.RUnlock()
	if hasAttCache {
		counts.Attachments = len(entry.items)
	} else {
		var attCount int
		_ = s.db.DB.Raw(`
			SELECT COUNT(*) 
			FROM ad_attachment 
			WHERE ad_table_id = 702 AND record_id = ? AND isactive = 'Y' AND COALESCE(length(binarydata), 0) > 0
		`, requisitionID).Scan(&attCount)
		if attCount > 0 {
			if items, err := s.GetRequisitionAttachments(requisitionID); err == nil {
				counts.Attachments = len(items)
			} else {
				counts.Attachments = attCount
			}
		} else {
			counts.Attachments = 0
		}
	}

	// 3. Chats count
	_ = s.db.DB.Raw(`
		SELECT COUNT(e.cm_chatentry_id)
		FROM cm_chatentry e
		JOIN cm_chat c ON c.cm_chat_id = e.cm_chat_id
		WHERE c.ad_table_id = 702 AND c.record_id = ? 
		  AND e.isactive = 'Y' AND c.isactive = 'Y'
	`, requisitionID).Scan(&counts.Chats)

	// 4. Linked Orders count
	_ = s.db.DB.Raw(`
		SELECT COUNT(DISTINCT o.c_order_id)
		FROM c_order o
		JOIN c_orderline ol ON ol.c_order_id = o.c_order_id
		JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		WHERE rl.m_requisition_id = ? AND ol.isactive = 'Y'
	`, requisitionID).Scan(&counts.Orders)

	// 5. Change Logs count
	_ = s.db.DB.Raw(`
		SELECT COUNT(*)
		FROM ad_changelog cl
		JOIN ad_table t ON t.ad_table_id = cl.ad_table_id
		WHERE (LOWER(t.tablename) = 'm_requisition' AND cl.record_id = ?)
		   OR (LOWER(t.tablename) = 'm_requisitionline' AND cl.record_id IN (
		       SELECT m_requisitionline_id FROM m_requisitionline WHERE m_requisition_id = ?
		   ))
	`, requisitionID, requisitionID).Scan(&counts.ChangeLogs)

	return counts, nil
}

func getIDFromResult(res map[string]interface{}) int {
	if v, ok := res["id"]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		case int64:
			return int(n)
		}
	}
	return 0
}

func (s *Service) GetRequisitionChat(requisitionID int) ([]ChatEntryItem, error) {
	var chatID int
	_ = s.db.DB.Raw("SELECT cm_chat_id FROM cm_chat WHERE ad_table_id = 702 AND record_id = ? AND isactive = 'Y' LIMIT 1", requisitionID).Scan(&chatID)
	if chatID == 0 {
		return []ChatEntryItem{}, nil
	}

	var entries []ChatEntryItem
	query := `
		SELECT 
			e.cm_chatentry_id,
			e.cm_chat_id,
			e.created,
			e.createdby,
			e.characterdata,
			COALESCE(u.name, '') as user_name,
			COALESCE(u.description, '') as user_description
		FROM cm_chatentry e
		LEFT JOIN ad_user u ON u.ad_user_id = e.createdby
		WHERE e.cm_chat_id = ? AND e.isactive = 'Y'
		ORDER BY e.created ASC, e.cm_chatentry_id ASC
	`
	if err := s.db.DB.Raw(query, chatID).Scan(&entries).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch chat entries: %w", err)
	}

	if len(entries) == 0 {
		return []ChatEntryItem{}, nil
	}

	// Fetch attachments for these entries (ad_table_id = 877)
	entryIDs := make([]int, len(entries))
	entryMap := make(map[int]int)
	for i, e := range entries {
		entryIDs[i] = e.ID
		entryMap[e.ID] = i
		entries[i].Attachments = []ChatAttachmentItem{}
	}

	var atts []struct {
		RecordID   int    `gorm:"column:record_id"`
		BinaryData []byte `gorm:"column:binarydata"`
	}
	if err := s.db.DB.Raw("SELECT record_id, binarydata FROM ad_attachment WHERE ad_table_id = 877 AND record_id IN (?) AND isactive = 'Y'", entryIDs).Scan(&atts).Error; err == nil {
		for _, a := range atts {
			if len(a.BinaryData) == 0 {
				continue
			}
			idx, ok := entryMap[a.RecordID]
			if !ok {
				continue
			}
			zr, err := zip.NewReader(bytes.NewReader(a.BinaryData), int64(len(a.BinaryData)))
			if err != nil {
				continue
			}
			for _, f := range zr.File {
				ext := strings.ToLower(filepath.Ext(f.Name))
				mime := "application/octet-stream"
				if ext == ".jpg" || ext == ".jpeg" {
					mime = "image/jpeg"
				} else if ext == ".png" {
					mime = "image/png"
				} else if ext == ".gif" {
					mime = "image/gif"
				} else if ext == ".webp" {
					mime = "image/webp"
				}
				entries[idx].Attachments = append(entries[idx].Attachments, ChatAttachmentItem{
					Name:     f.Name,
					Size:     int64(f.UncompressedSize64),
					MimeType: mime,
					URL:      fmt.Sprintf("/api/v1/requisitions/chat/attachments/%d/%s", a.RecordID, url.PathEscape(f.Name)),
				})
			}
		}
	}

	return entries, nil
}

func (s *Service) GetChatAttachmentContent(chatEntryID int, fileName string) ([]byte, string, error) {
	var atts []struct {
		BinaryData []byte `gorm:"column:binarydata"`
	}
	query := `
		SELECT binarydata 
		FROM ad_attachment 
		WHERE ad_table_id = 877 
		  AND record_id = ? 
		  AND isactive = 'Y'
		ORDER BY ad_attachment_id DESC
	`
	if err := s.db.DB.Raw(query, chatEntryID).Scan(&atts).Error; err != nil {
		return nil, "", fmt.Errorf("failed to fetch chat attachment: %w", err)
	}

	for _, a := range atts {
		if len(a.BinaryData) == 0 {
			continue
		}
		zr, err := zip.NewReader(bytes.NewReader(a.BinaryData), int64(len(a.BinaryData)))
		if err != nil {
			continue
		}

		for _, f := range zr.File {
			if f.Name == fileName || strings.EqualFold(f.Name, fileName) {
				rc, err := f.Open()
				if err != nil {
					return nil, "", fmt.Errorf("failed to open chat attachment in zip: %w", err)
				}
				defer rc.Close()

				data, err := io.ReadAll(rc)
				if err != nil {
					return nil, "", fmt.Errorf("failed to read chat attachment in zip: %w", err)
				}

				ext := strings.ToLower(filepath.Ext(fileName))
				mime := "application/octet-stream"
				if ext == ".jpg" || ext == ".jpeg" {
					mime = "image/jpeg"
				} else if ext == ".png" {
					mime = "image/png"
				} else if ext == ".gif" {
					mime = "image/gif"
				} else if ext == ".webp" {
					mime = "image/webp"
				}
				return data, mime, nil
			}
		}
	}

	return nil, "", fmt.Errorf("file not found: %s", fileName)
}

func (s *Service) SendChatMessage(token string, requisitionID int, message string, fileName string, fileBytes []byte) (map[string]interface{}, error) {
	var chatID int
	_ = s.db.DB.Raw("SELECT cm_chat_id FROM cm_chat WHERE ad_table_id = 702 AND record_id = ? AND isactive = 'Y' LIMIT 1", requisitionID).Scan(&chatID)

	if chatID == 0 {
		chatPayload := map[string]interface{}{
			"AD_Table_ID":      702,
			"Record_ID":        requisitionID,
			"Description":      "Requisition Chat",
			"ConfidentialType": "A",
			"ModerationType":   "N",
		}
		res, err := s.idempiereClient.PostModel(token, "cm_chat", chatPayload)
		if err != nil {
			return nil, fmt.Errorf("failed to create chat header via API Engine: %w", err)
		}
		chatID = getIDFromResult(res)
		if chatID == 0 {
			return nil, fmt.Errorf("failed to obtain chat header ID from API response")
		}
	}

	entryPayload := map[string]interface{}{
		"CM_Chat_ID":       chatID,
		"CharacterData":    message,
		"ChatEntryType":    "N",
		"ConfidentialType": "A",
	}

	entryRes, err := s.idempiereClient.PostModel(token, "cm_chatentry", entryPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to create chat entry via API Engine: %w", err)
	}

	entryID := getIDFromResult(entryRes)
	if len(fileBytes) > 0 && entryID > 0 {
		attPayload := map[string]interface{}{
			"name": fileName,
			"data": base64.StdEncoding.EncodeToString(fileBytes),
		}
		endpoint := fmt.Sprintf("cm_chatentry/%d/attachments", entryID)
		if _, err := s.idempiereClient.PostModel(token, endpoint, attPayload); err != nil {
			log.Printf("[SendChatMessage] Warning: failed to upload attachment to chat entry %d: %v", entryID, err)
		}
	}

	return entryRes, nil
}

func (s *Service) GetRequisitionChangeLogs(requisitionID int) ([]ChangeLogItem, error) {
	var logs []ChangeLogItem

	query := `
		SELECT 
			cl.ad_changelog_id,
			cl.ad_table_id,
			t.tablename as table_name,
			cl.record_id,
			cl.updated,
			COALESCE(cl.eventchangelog, 'U') as eventchangelog,
			COALESCE(cl.oldvalue, '') as oldvalue,
			COALESCE(cl.newvalue, '') as newvalue,
			COALESCE(cl.description, '') as description,
			COALESCE(col.columnname, '') as columnname,
			COALESCE(col.name, col.columnname, '-') as column_label,
			COALESCE(u.name, 'System') as updated_by_name
		FROM ad_changelog cl
		JOIN ad_table t ON t.ad_table_id = cl.ad_table_id
		LEFT JOIN ad_column col ON col.ad_column_id = cl.ad_column_id
		LEFT JOIN ad_user u ON u.ad_user_id = cl.updatedby
		WHERE (LOWER(t.tablename) = 'm_requisition' AND cl.record_id = ?)
		   OR (LOWER(t.tablename) = 'm_requisitionline' AND cl.record_id IN (
		       SELECT m_requisitionline_id FROM m_requisitionline WHERE m_requisition_id = ?
		   ))
		ORDER BY cl.updated DESC, cl.ad_changelog_id DESC
		LIMIT 500
	`

	if err := s.db.DB.Raw(query, requisitionID, requisitionID).Scan(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to get changelogs: %w", err)
	}

	return logs, nil
}

func (s *Service) GetRequisitionOrders(requisitionID int) ([]RequisitionPOItem, error) {
	orders := []RequisitionPOItem{}

	ordersSQL := `
		SELECT DISTINCT
			o.c_order_id as id,
			o.documentno,
			o.dateordered,
			o.c_bpartner_id as bpartner_id,
			COALESCE(bp.name, '-') as bpartner_name,
			o.docstatus,
			CASE 
				WHEN o.docstatus = 'DR' THEN 'Draft'
				WHEN o.docstatus = 'IP' THEN 'In Progress'
				WHEN o.docstatus = 'AP' THEN 'Approved'
				WHEN o.docstatus = 'CO' THEN 'Completed'
				WHEN o.docstatus = 'CL' THEN 'Closed'
				WHEN o.docstatus = 'VO' THEN 'Voided'
				WHEN o.docstatus = 'RE' THEN 'Reversed'
				ELSE COALESCE(o.docstatus, 'Draft')
			END as status_label,
			COALESCE(o.description, '') as description
		FROM c_order o
		JOIN c_orderline ol ON ol.c_order_id = o.c_order_id
		JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE rl.m_requisition_id = ?
		  AND ol.isactive = 'Y'
		ORDER BY o.dateordered DESC, o.c_order_id DESC
	`

	if err := s.db.DB.Raw(ordersSQL, requisitionID).Scan(&orders).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch linked purchase orders: %w", err)
	}

	if len(orders) == 0 {
		return orders, nil
	}

	linesSQL := `
		SELECT
			ol.c_orderline_id as id,
			ol.c_order_id as order_id,
			ol.line,
			ol.m_requisitionline_id as requisitionline_id,
			rl.line as requisition_line,
			ol.m_product_id as product_id,
			COALESCE(p.value, '') as product_code,
			COALESCE(p.name, '') as product_name,
			ol.c_uom_id as uom_id,
			COALESCE(uom.uomsymbol, uom.name, '-') as uom_name,
			COALESCE(uom.stdprecision, 0) as uom_precision,
			ol.qtyordered,
			COALESCE(ol.qtydelivered, 0) as qtydelivered,
			COALESCE(ol.description, '') as description
		FROM c_orderline ol
		JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		LEFT JOIN m_product p ON p.m_product_id = ol.m_product_id
		LEFT JOIN c_uom uom ON uom.c_uom_id = ol.c_uom_id
		WHERE rl.m_requisition_id = ?
		  AND ol.isactive = 'Y'
		ORDER BY ol.c_order_id DESC, ol.line ASC, ol.c_orderline_id ASC
	`

	var lines []RequisitionPOLineItem
	if err := s.db.DB.Raw(linesSQL, requisitionID).Scan(&lines).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch linked purchase order lines: %w", err)
	}

	lineMap := make(map[int][]RequisitionPOLineItem)
	for _, l := range lines {
		lineMap[l.OrderID] = append(lineMap[l.OrderID], l)
	}

	for i := range orders {
		if l, exists := lineMap[orders[i].ID]; exists {
			orders[i].Lines = l
			orders[i].TotalLines = len(l)
		} else {
			orders[i].Lines = []RequisitionPOLineItem{}
			orders[i].TotalLines = 0
		}
	}

	return orders, nil
}
