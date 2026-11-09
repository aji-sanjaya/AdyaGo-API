package order

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

	"factoryhub-go/config"
	"factoryhub-go/internal/database"
	"factoryhub-go/internal/idempiere"
)

type Service struct {
	db              *database.DBInstance
	idempiereClient *idempiere.Client
	cfg             *config.Config
}

func NewService(db *database.DBInstance, idempiereClient *idempiere.Client, cfg *config.Config) *Service {
	return &Service{
		db:              db,
		idempiereClient: idempiereClient,
		cfg:             cfg,
	}
}

// Map status codes to human readable labels
func mapDocStatusLabel(status string) string {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "DR":
		return "Draft"
	case "IP":
		return "In Progress"
	case "CO":
		return "Completed"
	case "CL":
		return "Closed"
	case "VO":
		return "Voided"
	case "RE":
		return "Reversed"
	case "AP":
		return "Approved"
	case "NA":
		return "Not Approved"
	case "IN":
		return "Invalid"
	default:
		return status
	}
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
	if v, ok := res["recordID"]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		case int64:
			return int(n)
		}
	}
	if v, ok := res["C_Order_ID"]; ok {
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

// 1. Get Orders List with Stats & Pagination
func (s *Service) GetOrders(clientID, orgID int, search, status string, costCenterID, bpartnerID, createdByID int, description, dateStart, dateEnd string, page, limit int, sortBy, sortDir string) (*OrderListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	resp := &OrderListResponse{
		Stats:  OrderStats{},
		Orders: []OrderListItem{},
		Total:  0,
		Page:   page,
		Limit:  limit,
	}

	poDocTypeID := s.cfg.ERP.PODocTypeID

	// 1. Fetch Month Statistics
	statsQuery := `
		SELECT 
			COUNT(1) as total_month,
			COUNT(CASE WHEN docstatus IN ('CO', 'CL') THEN 1 END) as completed,
			COUNT(CASE WHEN docstatus IN ('IP', 'AP') THEN 1 END) as in_progress,
			COUNT(CASE WHEN docstatus IN ('DR', 'IN') THEN 1 END) as draft
		FROM c_order
		WHERE dateordered >= DATE_TRUNC('month', CURRENT_DATE)
		  AND issotrx = 'N'
		  AND isactive = 'Y'
		  AND (c_doctypetarget_id = ? OR c_doctype_id = ?)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(statsQuery, poDocTypeID, poDocTypeID, clientID, clientID, orgID, orgID).Scan(&resp.Stats).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch order stats: %w", err)
	}

	// 2. Build Query & Filters
	baseQuery := `
		FROM c_order o
		LEFT JOIN ad_org org ON org.ad_org_id = o.ad_org_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = o.m_warehouse_id
		LEFT JOIN c_bpartner cb ON cb.c_bpartner_id = o.c_bpartner_id
		LEFT JOIN ad_user u ON u.ad_user_id = o.createdby
		WHERE o.issotrx = 'N'
		  AND o.isactive = 'Y'
		  AND (o.c_doctypetarget_id = ? OR o.c_doctype_id = ?)
	`
	args := []interface{}{poDocTypeID, poDocTypeID}

	if clientID > 0 {
		baseQuery += " AND o.ad_client_id = ?"
		args = append(args, clientID)
	}
	if orgID > 0 {
		baseQuery += " AND o.ad_org_id = ?"
		args = append(args, orgID)
	}
	if strings.TrimSpace(status) != "" && strings.ToUpper(status) != "ALL" {
		baseQuery += " AND o.docstatus = ?"
		args = append(args, strings.ToUpper(status))
	}
	if strings.TrimSpace(search) != "" {
		baseQuery += " AND (o.documentno ILIKE ? OR o.description ILIKE ? OR cb.name ILIKE ? OR cb.value ILIKE ?)"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st, st, st, st)
	}
	if costCenterID > 0 {
		baseQuery += " AND o.c_costcenter_id = ?"
		args = append(args, costCenterID)
	}
	if bpartnerID > 0 {
		baseQuery += " AND o.c_bpartner_id = ?"
		args = append(args, bpartnerID)
	}
	if createdByID > 0 {
		baseQuery += " AND o.createdby = ?"
		args = append(args, createdByID)
	}
	if strings.TrimSpace(description) != "" {
		baseQuery += " AND o.description ILIKE ?"
		args = append(args, "%"+strings.TrimSpace(description)+"%")
	}
	if strings.TrimSpace(dateStart) != "" {
		baseQuery += " AND o.dateordered >= ?"
		args = append(args, dateStart+" 00:00:00")
	}
	if strings.TrimSpace(dateEnd) != "" {
		baseQuery += " AND o.dateordered <= ?"
		args = append(args, dateEnd+" 23:59:59")
	}

	// Count Total
	countQuery := "SELECT COUNT(1) " + baseQuery
	if err := s.db.DB.Raw(countQuery, args...).Scan(&resp.Total).Error; err != nil {
		return nil, fmt.Errorf("failed to count orders: %w", err)
	}

	// Sorting
	orderClause := " ORDER BY o.dateordered DESC, o.c_order_id DESC"
	if sortBy != "" {
		dir := "ASC"
		if strings.ToUpper(sortDir) == "DESC" {
			dir = "DESC"
		}
		switch sortBy {
		case "documentno":
			orderClause = fmt.Sprintf(" ORDER BY o.documentno %s", dir)
		case "dateordered":
			orderClause = fmt.Sprintf(" ORDER BY o.dateordered %s, o.c_order_id %s", dir, dir)
		case "grandtotal":
			orderClause = fmt.Sprintf(" ORDER BY o.grandtotal %s", dir)
		case "docstatus":
			orderClause = fmt.Sprintf(" ORDER BY o.docstatus %s", dir)
		}
	}

	selectQuery := `
		SELECT
			o.c_order_id,
			o.documentno,
			o.docstatus,
			o.dateordered,
			o.datepromised,
			COALESCE(o.description, '') as description,
			COALESCE(o.grandtotal, 0) as grandtotal,
			COALESCE(o.totallines, 0) as totallines,
			o.ad_org_id,
			COALESCE(org.name, '') as org_name,
			o.m_warehouse_id,
			COALESCE(w.name, '') as warehouse_name,
			COALESCE(o.c_bpartner_id, 0) as c_bpartner_id,
			COALESCE(cb.value, '') as bpartner_value,
			COALESCE(cb.name, '') as bpartner_name,
			COALESCE(u.name, '') as createdby_name
	` + baseQuery + orderClause + " LIMIT ? OFFSET ?"

	pagedArgs := append(args, limit, offset)
	if err := s.db.DB.Raw(selectQuery, pagedArgs...).Scan(&resp.Orders).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch orders: %w", err)
	}

	for i := range resp.Orders {
		resp.Orders[i].StatusLabel = mapDocStatusLabel(resp.Orders[i].DocStatus)
	}

	return resp, nil
}

// 2. Get Master Options for Purchase Order
func (s *Service) GetMasterOptions(clientID, orgID int, roleID int) (*MasterOptionsResponse, error) {
	resp := &MasterOptionsResponse{
		Organizations: []SelectOption{},
		Warehouses:    []SelectOption{},
		PriceLists:    []SelectOption{},
		DocTypes:      []SelectOption{},
		Priorities:    []SelectOption{},
		PaymentTerms:  []SelectOption{},
		Taxes:         []TaxOption{},
		Projects:      []SelectOption{},
		CostCenters:   []SelectOption{},
		Approvers:     []SelectOption{},
		Users:         []SelectOption{},
		Vendors:       []VendorOption{},
	}

	// 1. Organizations
	orgQuery := `
		SELECT o.ad_org_id AS id, o.name AS text
		FROM ad_org o
		JOIN ad_role_orgaccess roa ON roa.ad_org_id = o.ad_org_id
		WHERE o.isactive = 'Y' AND roa.isactive = 'Y' AND roa.ad_role_id = ? AND o.ad_org_id <> 0
		ORDER BY o.name
	`
	_ = s.db.DB.Raw(orgQuery, roleID).Scan(&resp.Organizations).Error
	if len(resp.Organizations) == 0 {
		fallbackOrgQuery := `
			SELECT ad_org_id AS id, name AS text
			FROM ad_org
			WHERE ad_client_id = ? AND isactive = 'Y' AND ad_org_id <> 0
			ORDER BY name
		`
		_ = s.db.DB.Raw(fallbackOrgQuery, clientID).Scan(&resp.Organizations).Error
	}

	// 2. Warehouses
	currentOrg := orgID
	if currentOrg == 0 && len(resp.Organizations) > 0 {
		currentOrg = resp.Organizations[0].ID
	}
	whQuery := `
		SELECT DISTINCT w.m_warehouse_id AS id, w.name AS text
		FROM m_warehouse w
		WHERE w.isactive = 'Y' AND (? = 0 OR w.ad_org_id = ?)
		ORDER BY w.name
	`
	_ = s.db.DB.Raw(whQuery, currentOrg, currentOrg).Scan(&resp.Warehouses).Error

	// 3. PriceLists (Purchase)
	plQuery := `
		SELECT pl.m_pricelist_id AS id, pl.name AS text
		FROM m_pricelist pl
		WHERE pl.isactive = 'Y' AND pl.ad_client_id = ? AND pl.issopricelist = 'N'
		ORDER BY pl.name
	`
	_ = s.db.DB.Raw(plQuery, clientID).Scan(&resp.PriceLists).Error

	// 4. DocTypes for PO
	dtQuery := `
		SELECT dt.c_doctype_id AS id, dt.name AS text
		FROM c_doctype dt
		WHERE dt.isactive = 'Y'
		  AND dt.docbasetype = 'POO'
		  AND dt.issotrx = 'N'
		  AND dt.ad_client_id = ?
		  AND dt.ad_org_id IN (0, ?)
		  AND dt.docsubtypeso IS NULL
		ORDER BY dt.c_doctype_id DESC
	`
	_ = s.db.DB.Raw(dtQuery, clientID, clientID).Scan(&resp.DocTypes).Error

	// 5. Priorities
	prioQuery := `
		SELECT rl.value AS id, rl.name AS text
		FROM ad_ref_list rl
		JOIN ad_reference r ON r.ad_reference_id = rl.ad_reference_id
		WHERE r.name = '_PriorityRule' AND rl.isactive = 'Y'
		ORDER BY rl.value
	`
	_ = s.db.DB.Raw(prioQuery).Scan(&resp.Priorities).Error

	// 6. Payment Terms
	ptQuery := `
		SELECT c_paymentterm_id AS id, name AS text
		FROM c_paymentterm
		WHERE isactive = 'Y' AND ad_client_id = ?
		ORDER BY name
	`
	_ = s.db.DB.Raw(ptQuery, clientID).Scan(&resp.PaymentTerms).Error

	// 7. Taxes (Purchase only: P or B)
	taxQuery := `
		SELECT c_tax_id AS id, name AS text, rate
		FROM c_tax
		WHERE ad_client_id = ? 
		  AND isactive = 'Y' 
		  AND (sopotype = 'P' OR sopotype = 'B')
		ORDER BY name
	`
	_ = s.db.DB.Raw(taxQuery, clientID).Scan(&resp.Taxes).Error

	// 8. Projects
	projQuery := `
		SELECT c_project_id AS id, value || ' - ' || name AS text
		FROM c_project
		WHERE ad_client_id = ? AND isactive = 'Y' AND issummary = 'N'
		ORDER BY value
	`
	_ = s.db.DB.Raw(projQuery, clientID).Scan(&resp.Projects).Error

	// 9. Cost Centers
	ccQuery := `
		SELECT c_costcenter_id AS id, value || ' - ' || name AS text
		FROM c_costcenter
		WHERE isactive = 'Y' AND ad_client_id = ?
		ORDER BY value
	`
	_ = s.db.DB.Raw(ccQuery, clientID).Scan(&resp.CostCenters).Error

	// 10. Approvers / Users
	usersQuery := `
		SELECT DISTINCT u.ad_user_id AS id, u.name AS text
		FROM ad_user u
		JOIN ad_user_roles ur ON ur.ad_user_id = u.ad_user_id
		WHERE u.isactive = 'Y' AND u.ad_client_id = ?
		ORDER BY u.name
	`
	_ = s.db.DB.Raw(usersQuery, clientID).Scan(&resp.Approvers).Error

	// 11. Users (Creators)
	userQuery := `
		SELECT DISTINCT u.ad_user_id AS id, u.name AS text
		FROM ad_user u
		WHERE u.isactive = 'Y' AND u.ad_client_id = ?
		ORDER BY u.name
	`
	_ = s.db.DB.Raw(userQuery, clientID).Scan(&resp.Users).Error

	// 12. Vendors (Business Partners)
	vendorQuery := `
		SELECT c_bpartner_id AS id, COALESCE(value || ' - ' || name, name) AS text
		FROM c_bpartner
		WHERE isactive = 'Y' AND isvendor = 'Y' AND ad_client_id = ?
		ORDER BY name
		LIMIT 200
	`
	_ = s.db.DB.Raw(vendorQuery, clientID).Scan(&resp.Vendors).Error

	return resp, nil
}

// 3. Search Vendors (c_bpartner where isvendor = 'Y')
func (s *Service) GetVendors(clientID int, search string, page, limit int) ([]VendorOption, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	query := `
		SELECT c_bpartner_id AS id, COALESCE(value || ' - ' || name, name) AS text
		FROM c_bpartner
		WHERE isactive = 'Y' AND isvendor = 'Y' AND ad_client_id = ?
	`
	var args []interface{}
	args = append(args, clientID)

	if strings.TrimSpace(search) != "" {
		query += " AND (name ILIKE ? OR value ILIKE ?)"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st, st)
	}

	query += " ORDER BY name LIMIT ? OFFSET ?"
	args = append(args, limit+1, offset)

	var results []VendorOption
	if err := s.db.DB.Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, false, err
	}

	hasMore := len(results) > limit
	if hasMore {
		results = results[:limit]
	}

	return results, hasMore, nil
}

// 4. Get Contacts of a Vendor
func (s *Service) GetContacts(bpartnerID int, search string) ([]ContactOption, error) {
	query := `
		SELECT 
			ad_user_id AS id,
			name || CASE WHEN phone IS NOT NULL AND phone != '' THEN ' (' || phone || ')' ELSE '' END AS text,
			name,
			COALESCE(phone, '') as phone,
			COALESCE(email, '') as email
		FROM ad_user
		WHERE c_bpartner_id = ? AND isactive = 'Y'
	`
	var args []interface{}
	args = append(args, bpartnerID)

	if strings.TrimSpace(search) != "" {
		query += " AND (name ILIKE ? OR phone ILIKE ? OR email ILIKE ?)"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st, st, st)
	}

	query += " ORDER BY name"

	var contacts []ContactOption
	if err := s.db.DB.Raw(query, args...).Scan(&contacts).Error; err != nil {
		return nil, err
	}

	return contacts, nil
}

// 5. Search Products
func (s *Service) GetProducts(clientID int, search string, page, limit int) ([]ProductOption, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			p.m_product_id AS id,
			p.value || ' - ' || p.name AS text,
			COALESCE(p.c_uom_id, 0) AS c_uom_id,
			COALESCE(u.name, '') AS uom_name,
			COALESCE(u.uomsymbol, '') AS uom_symbol
		FROM m_product p
		LEFT JOIN c_uom u ON u.c_uom_id = p.c_uom_id
		WHERE p.isactive = 'Y' AND p.issummary = 'N' AND p.ad_client_id = ?
	`
	args := []interface{}{clientID}

	if strings.TrimSpace(search) != "" {
		query += " AND (p.name ILIKE ? OR p.value ILIKE ?)"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st, st)
	}

	query += " ORDER BY p.name LIMIT ? OFFSET ?"
	args = append(args, limit+1, offset)

	var products []ProductOption
	if err := s.db.DB.Raw(query, args...).Scan(&products).Error; err != nil {
		return nil, false, err
	}

	hasMore := len(products) > limit
	if hasMore {
		products = products[:limit]
	}

	return products, hasMore, nil
}

// 6. Search Charges
func (s *Service) GetCharges(clientID int, search string, page, limit int) ([]ChargeOption, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	offset := (page - 1) * limit

	query := `
		SELECT c_charge_id AS id, name AS text
		FROM c_charge
		WHERE isactive = 'Y' AND ad_client_id = ?
	`
	args := []interface{}{clientID}

	if strings.TrimSpace(search) != "" {
		query += " AND name ILIKE ?"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st)
	}

	query += " ORDER BY name LIMIT ? OFFSET ?"
	args = append(args, limit+1, offset)

	var charges []ChargeOption
	if err := s.db.DB.Raw(query, args...).Scan(&charges).Error; err != nil {
		return nil, false, err
	}

	hasMore := len(charges) > limit
	if hasMore {
		charges = charges[:limit]
	}

	return charges, hasMore, nil
}

// 7. Get Requisition Lines available for PO
func (s *Service) GetRequisitionLines(clientID, costCenterID int, search string, page, limit int) ([]RequisitionLineOption, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 15
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			rl.m_requisitionline_id AS id,
			r.documentno || ' - ' || p.value || ' - ' || p.name || ' (Qty: ' || rl.qty || ' ' || COALESCE(uom.uomsymbol, uom.name, '') || ')' AS text,
			r.documentno AS po_number,
			p.name AS product_name,
			p.value AS product_value,
			COALESCE(rl.m_product_id, 0) AS m_product_id,
			COALESCE(rl.c_uom_id, 0) AS c_uom_id,
			COALESCE(uom.name, '') AS uom_name,
			COALESCE(uom.uomsymbol, '') AS uom_symbol,
			rl.qty,
			rl.qty AS remaining_qty,
			COALESCE(r.c_costcenter_id, 0) AS c_costcenter_id,
			COALESCE(rl.priceactual, 0) AS price,
			COALESCE(rl.description, '') AS description
		FROM m_requisitionline rl
		JOIN m_requisition r ON r.m_requisition_id = rl.m_requisition_id
		JOIN m_product p ON p.m_product_id = rl.m_product_id
		LEFT JOIN c_uom uom ON uom.c_uom_id = rl.c_uom_id
		WHERE r.docstatus = 'CO'
		  AND rl.isactive = 'Y'
		  AND rl.ad_client_id = ?
	`
	args := []interface{}{clientID}

	if costCenterID > 0 {
		query += " AND r.c_costcenter_id = ?"
		args = append(args, costCenterID)
	}

	if strings.TrimSpace(search) != "" {
		query += " AND (r.documentno ILIKE ? OR p.name ILIKE ? OR p.value ILIKE ? OR rl.description ILIKE ?)"
		st := "%" + strings.TrimSpace(search) + "%"
		args = append(args, st, st, st, st)
	}

	query += " ORDER BY r.documentno DESC, rl.line ASC LIMIT ? OFFSET ?"
	args = append(args, limit+1, offset)

	var items []RequisitionLineOption
	if err := s.db.DB.Raw(query, args...).Scan(&items).Error; err != nil {
		return nil, false, err
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	return items, hasMore, nil
}

// 8. Get Single Requisition Line Detail with Remaining Qty
func (s *Service) GetRequisitionLineDetail(clientID, reqLineID int) (*RequisitionLineOption, error) {
	query := `
		SELECT 
			rl.m_requisitionline_id AS id,
			r.documentno AS po_number,
			COALESCE(rl.m_product_id, 0) AS m_product_id,
			p.name AS product_name,
			p.value AS product_value,
			COALESCE(rl.c_uom_id, 0) AS c_uom_id,
			COALESCE(uom.name, '') AS uom_name,
			COALESCE(uom.uomsymbol, '') AS uom_symbol,
			rl.qty,
			COALESCE(rl.priceactual, 0) AS price,
			COALESCE(rl.description, '') AS description,
			COALESCE(r.c_costcenter_id, 0) AS c_costcenter_id
		FROM m_requisitionline rl
		JOIN m_requisition r ON r.m_requisition_id = rl.m_requisition_id
		JOIN m_product p ON p.m_product_id = rl.m_product_id
		LEFT JOIN c_uom uom ON uom.c_uom_id = rl.c_uom_id
		WHERE rl.m_requisitionline_id = ? AND rl.ad_client_id = ?
	`
	var item RequisitionLineOption
	if err := s.db.DB.Raw(query, reqLineID, clientID).First(&item).Error; err != nil {
		return nil, fmt.Errorf("requisition line not found: %w", err)
	}

	var usedQty float64
	usedQtyQuery := `
		SELECT COALESCE(SUM(ol.qtyentered), 0)
		FROM c_orderline ol
		JOIN c_order o ON o.c_order_id = ol.c_order_id
		WHERE ol.m_requisitionline_id = ?
		  AND o.docstatus NOT IN ('VO', 'RE')
	`
	_ = s.db.DB.Raw(usedQtyQuery, reqLineID).Scan(&usedQty).Error

	remaining := item.Qty - usedQty
	if remaining < 0 {
		remaining = 0
	}
	item.RemainingQty = remaining

	return &item, nil
}

// 9. Get Order Detail (Header + Lines + Taxes + Workflow)
func (s *Service) GetOrderDetail(orderID int) (*OrderDetailResponse, error) {
	// Header Query
	headerQuery := `
		SELECT 
			o.c_order_id,
			o.documentno,
			o.docstatus,
			o.docaction,
			o.c_doctype_id,
			o.c_doctypetarget_id,
			o.dateordered,
			o.datepromised,
			COALESCE(o.description, '') AS description,
			o.ad_org_id,
			COALESCE(org.name, '') AS org_name,
			o.m_warehouse_id,
			COALESCE(w.name, '') AS warehouse_name,
			o.c_bpartner_id,
			COALESCE(cb.value, '') AS bpartner_value,
			COALESCE(cb.name, '') AS bpartner_name,
			COALESCE(o.c_bpartner_location_id, 0) AS c_bpartner_location_id,
			o.ad_user_id,
			COALESCE(u.name, '') AS contact_name,
			o.m_pricelist_id,
			COALESCE(pl.name, '') AS pricelist_name,
			COALESCE(o.paymentrule, 'P') AS paymentrule,
			COALESCE(o.c_paymentterm_id, 0) AS c_paymentterm_id,
			COALESCE(pt.name, '') AS paymentterm_name,
			COALESCE(o.priorityrule, '5') AS priorityrule,
			COALESCE(o.salesrep_id, 0) AS salesrep_id,
			COALESCE(rep.name, '') AS salesrep_name,
			o.c_costcenter_id,
			COALESCE(cc.value || ' - ' || cc.name, '') AS costcenter_name,
			o.c_project_id,
			COALESCE(proj.value || ' - ' || proj.name, '') AS project_name,
			COALESCE(o.c_tax_id, 0) AS c_tax_id,
			COALESCE(tx.name, '') AS tax_name,
			o.adw_ad_user_checked_id,
			COALESCE(chk.name, '') AS checkedby_name,
			o.adw_ad_user_approved_id,
			COALESCE(appr.name, '') AS approvedby_name,
			COALESCE(o.totallines, 0) AS totallines,
			COALESCE(o.grandtotal, 0) AS grandtotal,
			COALESCE(o.adw_withholdingamount, o.withholdingamount, 0) AS withholdingamount
		FROM c_order o
		LEFT JOIN ad_org org ON org.ad_org_id = o.ad_org_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = o.m_warehouse_id
		LEFT JOIN c_bpartner cb ON cb.c_bpartner_id = o.c_bpartner_id
		LEFT JOIN ad_user u ON u.ad_user_id = o.ad_user_id
		LEFT JOIN m_pricelist pl ON pl.m_pricelist_id = o.m_pricelist_id
		LEFT JOIN c_paymentterm pt ON pt.c_paymentterm_id = o.c_paymentterm_id
		LEFT JOIN ad_user rep ON rep.ad_user_id = o.salesrep_id
		LEFT JOIN c_costcenter cc ON cc.c_costcenter_id = o.c_costcenter_id
		LEFT JOIN c_project proj ON proj.c_project_id = o.c_project_id
		LEFT JOIN c_tax tx ON tx.c_tax_id = o.c_tax_id
		LEFT JOIN ad_user chk ON chk.ad_user_id = o.adw_ad_user_checked_id
		LEFT JOIN ad_user appr ON appr.ad_user_id = o.adw_ad_user_approved_id
		WHERE o.c_order_id = ?
	`
	var header OrderHeader
	if err := s.db.DB.Raw(headerQuery, orderID).First(&header).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch order header: %w", err)
	}

	header.DocStatusLabel = mapDocStatusLabel(header.DocStatus)
	header.IsDraft = header.DocStatus == "DR" || header.DocStatus == "IN"
	header.IsReadOnly = header.DocStatus == "CO" || header.DocStatus == "CL" || header.DocStatus == "VO" || header.DocStatus == "RE"

	// Check Active Workflow
	var wfCount int64
	wfCheckQuery := `
		SELECT COUNT(1)
		FROM ad_wf_activity wa
		JOIN ad_table t ON t.ad_table_id = wa.ad_table_id
		WHERE t.tablename = 'C_Order'
		  AND wa.record_id = ?
		  AND wa.processed = 'N'
	`
	_ = s.db.DB.Raw(wfCheckQuery, orderID).Scan(&wfCount).Error
	header.HasActiveWorkflow = wfCount > 0

	// Lines Query
	lines, err := s.GetOrderLines(orderID)
	if err != nil {
		return nil, err
	}

	// Taxes Query
	taxesQuery := `
		SELECT 
			ot.c_tax_id,
			t.name AS tax_name,
			COALESCE(ot.taxamt, 0) AS taxamt,
			COALESCE(ot.taxbaseamt, 0) AS taxbaseamt
		FROM c_ordertax ot
		JOIN c_tax t ON t.c_tax_id = ot.c_tax_id
		WHERE ot.c_order_id = ?
		ORDER BY t.name
	`
	var taxes []OrderTax
	_ = s.db.DB.Raw(taxesQuery, orderID).Scan(&taxes).Error

	return &OrderDetailResponse{
		Header: header,
		Lines:  lines,
		Taxes:  taxes,
	}, nil
}

// 10. Get Order Lines
func (s *Service) GetOrderLines(orderID int) ([]OrderLine, error) {
	query := `
		SELECT 
			ol.c_orderline_id,
			ol.c_order_id,
			ol.line,
			ol.m_product_id,
			COALESCE(p.value, '') AS product_value,
			COALESCE(p.name, '') AS product_name,
			ol.c_charge_id,
			COALESCE(ch.name, '') AS charge_name,
			ol.c_uom_id,
			COALESCE(uom.name, '') AS uom_name,
			COALESCE(uom.uomsymbol, '') AS uom_symbol,
			COALESCE(ol.qtyentered, ol.qtyordered, 0) AS qty,
			COALESCE(ol.priceentered, ol.priceactual, 0) AS priceentered,
			COALESCE(ol.priceactual, ol.priceentered, 0) AS priceactual,
			COALESCE(ol.discount, 0) AS discount,
			COALESCE(ol.linenetamt, 0) AS linenetamt,
			COALESCE(ol.c_tax_id, 0) AS c_tax_id,
			COALESCE(tx.name, '') AS tax_name,
			COALESCE(tx.rate, 0) AS tax_rate,
			COALESCE(ol.description, '') AS description,
			ol.m_requisitionline_id,
			COALESCE(r.documentno, '') AS requisition_documentno,
			(COALESCE(ol.adw_iswithholding, 'N') = 'Y') AS is_withholding,
			COALESCE(ol.adw_withholdingrate, 0) AS withholding_rate,
			COALESCE(ol.adw_withholdingamount, 0) AS withholding_amount
		FROM c_orderline ol
		LEFT JOIN m_product p ON p.m_product_id = ol.m_product_id
		LEFT JOIN c_charge ch ON ch.c_charge_id = ol.c_charge_id
		LEFT JOIN c_uom uom ON uom.c_uom_id = ol.c_uom_id
		LEFT JOIN c_tax tx ON tx.c_tax_id = ol.c_tax_id
		LEFT JOIN m_requisitionline rl ON rl.m_requisitionline_id = ol.m_requisitionline_id
		LEFT JOIN m_requisition r ON r.m_requisition_id = rl.m_requisition_id
		WHERE ol.c_order_id = ?
		ORDER BY ol.line ASC
	`
	var lines []OrderLine
	if err := s.db.DB.Raw(query, orderID).Scan(&lines).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch order lines: %w", err)
	}

	return lines, nil
}

// 11. Create Order via iDempiere REST API
func (s *Service) CreateOrder(req *CreateOrderRequest, clientID, userID int, token string) (int, error) {
	// Lookup vendor default location
	var locID int
	locQuery := `
		SELECT c_bpartner_location_id
		FROM c_bpartner_location
		WHERE c_bpartner_id = ? AND isactive = 'Y'
		ORDER BY isbillto DESC, isshipto DESC
		LIMIT 1
	`
	_ = s.db.DB.Raw(locQuery, req.BPartnerID).Scan(&locID).Error

	datePromised := req.DatePromised
	if datePromised == "" {
		datePromised = req.DateOrdered
	}

	priority := req.PriorityRule
	if priority == "" {
		priority = s.cfg.ERP.PODefaultPriority
	}

	payload := map[string]interface{}{
		"AD_Client_ID":            clientID,
		"AD_Org_ID":               req.OrgID,
		"M_Warehouse_ID":          req.WarehouseID,
		"C_DocTypeTarget_ID":      req.DocTypeID,
		"M_PriceList_ID":          req.PriceListID,
		"DateOrdered":             req.DateOrdered,
		"DatePromised":            datePromised,
		"Description":             req.Description,
		"IsSOTrx":                 "N",
		"C_BPartner_ID":           req.BPartnerID,
		"C_BPartner_Location_ID":  locID,
		"Bill_BPartner_ID":        req.BPartnerID,
		"Bill_Location_ID":        locID,
		"DeliveryViaRule":         "P",
		"PriorityRule":            priority,
		"C_Currency_ID":           s.cfg.ERP.PODefaultCurrencyID,
		"PaymentRule":             s.cfg.ERP.PODefaultPaymentRule,
		"SalesRep_ID":             userID,
		"C_Tax_ID":                req.TaxID,
		"ADW_AD_User_Checked_ID":  req.CheckedByID,
		"ADW_AD_User_Approved_ID": req.ApprovedByID,
	}

	if req.ADUserID != nil && *req.ADUserID > 0 {
		payload["AD_User_ID"] = *req.ADUserID
		payload["Bill_User_ID"] = *req.ADUserID
	}
	if req.CostCenterID != nil && *req.CostCenterID > 0 {
		payload["C_CostCenter_ID"] = *req.CostCenterID
	}
	if req.ProjectID != nil && *req.ProjectID > 0 {
		payload["C_Project_ID"] = *req.ProjectID
	}
	if req.PaymentTermID != nil && *req.PaymentTermID > 0 {
		payload["C_PaymentTerm_ID"] = *req.PaymentTermID
	} else {
		payload["C_PaymentTerm_ID"] = s.cfg.ERP.PODefaultPaymentTerm
	}

	res, err := s.idempiereClient.PostModel(token, "c_order", payload)
	if err != nil {
		return 0, fmt.Errorf("failed to create order in iDempiere: %w", err)
	}

	orderID := getIDFromResult(res)
	return orderID, nil
}

// 12. Update Order via iDempiere REST API
func (s *Service) UpdateOrder(orderID int, req *UpdateOrderRequest, token string) error {
	payload := map[string]interface{}{}

	if req.OrgID > 0 {
		payload["AD_Org_ID"] = req.OrgID
	}
	if req.WarehouseID > 0 {
		payload["M_Warehouse_ID"] = req.WarehouseID
	}
	if req.BPartnerID > 0 {
		payload["C_BPartner_ID"] = req.BPartnerID
		var locID int
		_ = s.db.DB.Raw("SELECT c_bpartner_location_id FROM c_bpartner_location WHERE c_bpartner_id = ? AND isactive = 'Y' ORDER BY isbillto DESC LIMIT 1", req.BPartnerID).Scan(&locID).Error
		if locID > 0 {
			payload["C_BPartner_Location_ID"] = locID
			payload["Bill_Location_ID"] = locID
		}
	}
	if req.ADUserID != nil && *req.ADUserID > 0 {
		payload["AD_User_ID"] = *req.ADUserID
		payload["Bill_User_ID"] = *req.ADUserID
	}
	if req.DateOrdered != "" {
		payload["DateOrdered"] = req.DateOrdered
	}
	if req.DatePromised != "" {
		payload["DatePromised"] = req.DatePromised
	}
	if req.DocTypeID > 0 {
		payload["C_DocTypeTarget_ID"] = req.DocTypeID
	}
	if req.PriceListID > 0 {
		payload["M_PriceList_ID"] = req.PriceListID
	}
	payload["Description"] = req.Description
	if req.PriorityRule != "" {
		payload["PriorityRule"] = req.PriorityRule
	}
	if req.PaymentTermID != nil && *req.PaymentTermID > 0 {
		payload["C_PaymentTerm_ID"] = *req.PaymentTermID
	}
	if req.CheckedByID > 0 {
		payload["ADW_AD_User_Checked_ID"] = req.CheckedByID
	}
	if req.ApprovedByID > 0 {
		payload["ADW_AD_User_Approved_ID"] = req.ApprovedByID
	}
	if req.TaxID > 0 {
		payload["C_Tax_ID"] = req.TaxID
	}
	if req.CostCenterID != nil && *req.CostCenterID > 0 {
		payload["C_CostCenter_ID"] = *req.CostCenterID
	}
	if req.ProjectID != nil && *req.ProjectID > 0 {
		payload["C_Project_ID"] = *req.ProjectID
	}

	_, err := s.idempiereClient.PutModel(token, "c_order", orderID, payload)
	if err != nil {
		return fmt.Errorf("failed to update order in iDempiere: %w", err)
	}

	return nil
}

// 13. Delete Order via iDempiere REST API
func (s *Service) DeleteOrder(orderID int, token string) error {
	if err := s.idempiereClient.DeleteModel(token, "c_order", orderID); err != nil {
		return fmt.Errorf("failed to delete order in iDempiere: %w", err)
	}
	return nil
}

// 14. Create Order Line via iDempiere REST API
func (s *Service) CreateOrderLine(orderID int, req *CreateOrderLineRequest, clientID int, token string) (int, error) {
	// Requisition limit check
	if req.RequisitionLineID != nil && *req.RequisitionLineID > 0 {
		var reqQty float64
		_ = s.db.DB.Raw("SELECT qty FROM m_requisitionline WHERE m_requisitionline_id = ?", *req.RequisitionLineID).Scan(&reqQty).Error

		var usedQty float64
		_ = s.db.DB.Raw("SELECT COALESCE(SUM(qtyentered), 0) FROM c_orderline WHERE m_requisitionline_id = ?", *req.RequisitionLineID).Scan(&usedQty).Error

		if (usedQty + req.Qty) > reqQty {
			remaining := reqQty - usedQty
			if remaining < 0 {
				remaining = 0
			}
			return 0, fmt.Errorf("quantity exceeds requisition limit. Requisition Qty: %.2f, Already ordered: %.2f, Remaining available: %.2f", reqQty, usedQty, remaining)
		}
	}

	// UOM resolution
	uomID := 100 // default each
	if req.UOMID != nil && *req.UOMID > 0 {
		uomID = *req.UOMID
	} else if req.ProductID != nil && *req.ProductID > 0 {
		_ = s.db.DB.Raw("SELECT c_uom_id FROM m_product WHERE m_product_id = ?", *req.ProductID).Scan(&uomID).Error
	}

	discount := req.Discount
	if discount < 0 {
		discount = 0
	}
	priceActual := req.Price * (1 - (discount / 100))
	lineNet := req.Qty * priceActual

	isWithholding := "N"
	var withholdingAmt float64
	if req.IsWithholding {
		isWithholding = "Y"
		withholdingAmt = lineNet * req.WithholdingRate / 100
	}

	payload := map[string]interface{}{
		"AD_Client_ID":          clientID,
		"C_Order_ID":            orderID,
		"QtyOrdered":            req.Qty,
		"QtyEntered":            req.Qty,
		"PriceEntered":          req.Price,
		"PriceActual":           priceActual,
		"PriceList":             req.Price,
		"PriceLimit":            req.Price,
		"Discount":              discount,
		"LineNetAmt":            lineNet,
		"Description":           req.Description,
		"C_Tax_ID":              req.TaxID,
		"C_UOM_ID":              uomID,
		"ADW_IsWithholding":     isWithholding,
		"ADW_WithholdingRate":   req.WithholdingRate,
		"ADW_WithholdingAmount": withholdingAmt,
		"adw_iswithholding":     isWithholding,
		"adw_withholdingrate":   req.WithholdingRate,
		"adw_withholdingamount": withholdingAmt,
	}

	if req.ChargeID != nil && *req.ChargeID > 0 {
		payload["C_Charge_ID"] = *req.ChargeID
	} else if req.ProductID != nil && *req.ProductID > 0 {
		payload["M_Product_ID"] = *req.ProductID
	}

	if req.RequisitionLineID != nil && *req.RequisitionLineID > 0 {
		payload["M_RequisitionLine_ID"] = *req.RequisitionLineID
	}

	res, err := s.idempiereClient.PostModel(token, "c_orderline", payload)
	if err != nil {
		// Fallback retry without custom fields if iDempiere rejects custom properties
		delete(payload, "ADW_IsWithholding")
		delete(payload, "ADW_WithholdingRate")
		delete(payload, "ADW_WithholdingAmount")
		delete(payload, "adw_iswithholding")
		delete(payload, "adw_withholdingrate")
		delete(payload, "adw_withholdingamount")
		res, err = s.idempiereClient.PostModel(token, "c_orderline", payload)
		if err != nil {
			return 0, fmt.Errorf("failed to create order line in iDempiere: %w", err)
		}
	}

	lineID := getIDFromResult(res)
	return lineID, nil
}

// 15. Update Order Line via iDempiere REST API
func (s *Service) UpdateOrderLine(orderID, lineID int, req *UpdateOrderLineRequest, token string) error {
	// Requisition limit check
	if req.RequisitionLineID != nil && *req.RequisitionLineID > 0 {
		var reqQty float64
		_ = s.db.DB.Raw("SELECT qty FROM m_requisitionline WHERE m_requisitionline_id = ?", *req.RequisitionLineID).Scan(&reqQty).Error

		var usedQty float64
		_ = s.db.DB.Raw("SELECT COALESCE(SUM(qtyentered), 0) FROM c_orderline WHERE m_requisitionline_id = ? AND c_orderline_id != ?", *req.RequisitionLineID, lineID).Scan(&usedQty).Error

		if (usedQty + req.Qty) > reqQty {
			remaining := reqQty - usedQty
			if remaining < 0 {
				remaining = 0
			}
			return fmt.Errorf("quantity exceeds requisition limit. Requisition Qty: %.2f, Already ordered: %.2f, Remaining available: %.2f", reqQty, usedQty, remaining)
		}
	}

	// Check against received qty from Material Receipt
	var receivedQty float64
	rcvQuery := `
		SELECT COALESCE(SUM(iol.movementqty), 0)
		FROM m_inoutline iol
		JOIN m_inout io ON io.m_inout_id = iol.m_inout_id
		WHERE iol.c_orderline_id = ?
		  AND io.docstatus NOT IN ('VO', 'RE')
	`
	_ = s.db.DB.Raw(rcvQuery, lineID).Scan(&receivedQty).Error
	if req.Qty < receivedQty {
		return fmt.Errorf("quantity cannot be less than received quantity (%.2f)", receivedQty)
	}

	uomID := 100
	if req.UOMID != nil && *req.UOMID > 0 {
		uomID = *req.UOMID
	} else if req.ProductID != nil && *req.ProductID > 0 {
		_ = s.db.DB.Raw("SELECT c_uom_id FROM m_product WHERE m_product_id = ?", *req.ProductID).Scan(&uomID).Error
	}

	discount := req.Discount
	if discount < 0 {
		discount = 0
	}
	priceActual := req.Price * (1 - (discount / 100))
	lineNet := req.Qty * priceActual

	isWithholding := "N"
	var withholdingAmt float64
	if req.IsWithholding {
		isWithholding = "Y"
		withholdingAmt = lineNet * req.WithholdingRate / 100
	}

	payload := map[string]interface{}{
		"QtyOrdered":            req.Qty,
		"QtyEntered":            req.Qty,
		"PriceEntered":          req.Price,
		"PriceActual":           priceActual,
		"PriceList":             req.Price,
		"PriceLimit":            req.Price,
		"Discount":              discount,
		"LineNetAmt":            lineNet,
		"Description":           req.Description,
		"C_Tax_ID":              req.TaxID,
		"C_UOM_ID":              uomID,
		"ADW_IsWithholding":     isWithholding,
		"ADW_WithholdingRate":   req.WithholdingRate,
		"ADW_WithholdingAmount": withholdingAmt,
		"adw_iswithholding":     isWithholding,
		"adw_withholdingrate":   req.WithholdingRate,
		"adw_withholdingamount": withholdingAmt,
	}

	if req.ChargeID != nil && *req.ChargeID > 0 {
		payload["C_Charge_ID"] = *req.ChargeID
	} else if req.ProductID != nil && *req.ProductID > 0 {
		payload["M_Product_ID"] = *req.ProductID
	}

	if req.RequisitionLineID != nil && *req.RequisitionLineID > 0 {
		payload["M_RequisitionLine_ID"] = *req.RequisitionLineID
	}

	_, err := s.idempiereClient.PutModel(token, "c_orderline", lineID, payload)
	if err != nil {
		// Fallback retry without custom fields
		delete(payload, "ADW_IsWithholding")
		delete(payload, "ADW_WithholdingRate")
		delete(payload, "ADW_WithholdingAmount")
		delete(payload, "adw_iswithholding")
		delete(payload, "adw_withholdingrate")
		delete(payload, "adw_withholdingamount")
		_, err = s.idempiereClient.PutModel(token, "c_orderline", lineID, payload)
		if err != nil {
			return fmt.Errorf("failed to update order line in iDempiere: %w", err)
		}
	}

	return nil
}

// 16. Delete Order Line via iDempiere REST API
func (s *Service) DeleteOrderLine(orderID, lineID int, token string) error {
	if err := s.idempiereClient.DeleteModel(token, "c_orderline", lineID); err != nil {
		return fmt.Errorf("failed to delete order line in iDempiere: %w", err)
	}
	return nil
}

// 17. Process Order Document Action via iDempiere REST API
func (s *Service) ProcessOrder(orderID int, action, token string) error {
	payload := map[string]interface{}{
		"doc-action": action,
	}

	_, err := s.idempiereClient.PutModel(token, "c_order", orderID, payload)
	if err != nil {
		return fmt.Errorf("failed to process order in iDempiere: %w", err)
	}

	return nil
}

// 18. Attachments (table 259 for C_Order)
type AttachmentItem struct {
	AttachmentID int    `json:"attachment_id"`
	RecordID     int    `json:"record_id"`
	FileName     string `json:"file_name"`
	FileSize     int64  `json:"file_size"`
	MimeType     string `json:"mime_type"`
	IsImage      bool   `json:"is_image"`
	IsPDF        bool   `json:"is_pdf"`
	CreatedAt    string `json:"created_at"`
	DownloadURL  string `json:"download_url"`
}

func (s *Service) GetAttachments(orderID int) ([]AttachmentItem, error) {
	var atts []struct {
		ADAttachmentID int    `gorm:"column:ad_attachment_id"`
		RecordID       int    `gorm:"column:record_id"`
		Created        string `gorm:"column:created"`
		BinaryData     []byte `gorm:"column:binarydata"`
	}

	query := `
		SELECT ad_attachment_id, record_id, created, binarydata 
		FROM ad_attachment 
		WHERE ad_table_id = 259 
		  AND record_id = ? 
		  AND isactive = 'Y'
		ORDER BY ad_attachment_id DESC
	`
	if err := s.db.DB.Raw(query, orderID).Scan(&atts).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch attachments: %w", err)
	}

	var items []AttachmentItem
	for _, a := range atts {
		if len(a.BinaryData) == 0 {
			continue
		}
		zr, err := zip.NewReader(bytes.NewReader(a.BinaryData), int64(len(a.BinaryData)))
		if err != nil {
			log.Printf("[GetOrderAttachments] Error reading zip for attachment %d: %v", a.ADAttachmentID, err)
			continue
		}

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
				AttachmentID: a.ADAttachmentID,
				RecordID:     a.RecordID,
				FileName:     f.Name,
				FileSize:     int64(f.UncompressedSize64),
				MimeType:     mime,
				IsImage:      isImg,
				IsPDF:        isPDF,
				CreatedAt:    a.Created,
				DownloadURL:  fmt.Sprintf("/api/v1/orders/%d/attachments/%s", orderID, url.PathEscape(f.Name)),
			})
		}
	}

	return items, nil
}

func (s *Service) DownloadAttachment(orderID int, fileName string) ([]byte, string, error) {
	var atts []struct {
		BinaryData []byte `gorm:"column:binarydata"`
	}

	query := `
		SELECT binarydata 
		FROM ad_attachment 
		WHERE ad_table_id = 259 
		  AND record_id = ? 
		  AND isactive = 'Y'
		ORDER BY ad_attachment_id DESC
	`
	if err := s.db.DB.Raw(query, orderID).Scan(&atts).Error; err != nil {
		return nil, "", fmt.Errorf("failed to fetch attachments: %w", err)
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
	}

	return nil, "", fmt.Errorf("file not found: %s", fileName)
}

func (s *Service) UploadAttachment(token string, orderID int, fileName string, fileBytes []byte) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"name": fileName,
		"data": base64.StdEncoding.EncodeToString(fileBytes),
	}

	endpoint := fmt.Sprintf("c_order/%d/attachments", orderID)
	res, err := s.idempiereClient.PostModel(token, endpoint, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to upload attachment via API Engine: %w", err)
	}

	return res, nil
}

func (s *Service) DeleteAttachment(token string, orderID int, fileName string) error {
	encodedName := url.PathEscape(fileName)
	endpoint := fmt.Sprintf("models/c_order/%d/attachments/%s", orderID, encodedName)
	if err := s.idempiereClient.DeleteEndpoint(token, endpoint); err != nil {
		return fmt.Errorf("failed to delete attachment via API Engine: %w", err)
	}
	return nil
}

// 19. Chat & Discussion (Table ID 259 for C_Order)
type ChatAttachmentItem struct {
	Name     string `json:"name"`
	Size     int64  `json:"size"`
	MimeType string `json:"mime_type"`
	URL      string `json:"url"`
}

type ChatEntryItem struct {
	ID              int                  `json:"cm_chatentry_id" gorm:"column:cm_chatentry_id"`
	ChatID          int                  `json:"cm_chat_id" gorm:"column:cm_chat_id"`
	Created         string               `json:"created" gorm:"column:created"`
	CreatedBy       int                  `json:"createdby" gorm:"column:createdby"`
	CharacterData   string               `json:"characterdata" gorm:"column:characterdata"`
	UserName        string               `json:"user_name" gorm:"column:user_name"`
	UserDescription string               `json:"user_description" gorm:"column:user_description"`
	Attachments     []ChatAttachmentItem `json:"attachments"`
}

func (s *Service) GetChat(orderID int) ([]ChatEntryItem, error) {
	var chatID int
	_ = s.db.DB.Raw("SELECT cm_chat_id FROM cm_chat WHERE ad_table_id = 259 AND record_id = ? AND isactive = 'Y' LIMIT 1", orderID).Scan(&chatID)
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
					URL:      fmt.Sprintf("/api/v1/orders/chat/attachments/%d/%s", a.RecordID, url.PathEscape(f.Name)),
				})
			}
		}
	}

	return entries, nil
}

func (s *Service) SendChatMessage(token string, orderID int, clientID, userID int, message string, fileBytes []byte, fileName string) error {
	// 1. Get or Create Chat Header (table 259)
	var chatID int
	_ = s.db.DB.Raw("SELECT cm_chat_id FROM cm_chat WHERE ad_table_id = 259 AND record_id = ? AND isactive = 'Y' LIMIT 1", orderID).Scan(&chatID)

	if chatID == 0 {
		var docNo string
		_ = s.db.DB.Raw("SELECT documentno FROM c_order WHERE c_order_id = ?", orderID).Scan(&docNo)

		chatPayload := map[string]interface{}{
			"AD_Client_ID": clientID,
			"AD_Org_ID":    0,
			"AD_Table_ID":  259,
			"Record_ID":    orderID,
			"Description":  "Discussion for Purchase Order " + docNo,
			"Confidential": "A",
		}
		res, err := s.idempiereClient.PostModel(token, "cm_chat", chatPayload)
		if err != nil {
			return fmt.Errorf("failed to create chat session: %w", err)
		}
		chatID = getIDFromResult(res)
	}

	if chatID == 0 {
		return fmt.Errorf("unable to initialize chat session")
	}

	// 2. Create Chat Entry
	entryPayload := map[string]interface{}{
		"AD_Client_ID":  clientID,
		"AD_Org_ID":     0,
		"CM_Chat_ID":    chatID,
		"CharacterData": message,
		"ChatEntryType": "N",
	}
	entryRes, err := s.idempiereClient.PostModel(token, "cm_chatentry", entryPayload)
	if err != nil {
		return fmt.Errorf("failed to save chat message: %w", err)
	}

	// 3. Attach file if present
	if len(fileBytes) > 0 && fileName != "" {
		entryID := getIDFromResult(entryRes)
		if entryID > 0 {
			attPayload := map[string]interface{}{
				"name": fileName,
				"data": base64.StdEncoding.EncodeToString(fileBytes),
			}
			endpoint := fmt.Sprintf("cm_chatentry/%d/attachments", entryID)
			if _, err := s.idempiereClient.PostModel(token, endpoint, attPayload); err != nil {
				log.Printf("[SendOrderChatMessage] Warning: failed to upload chat attachment: %v", err)
			}
		}
	}

	return nil
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
				} else if ext == ".pdf" {
					mime = "application/pdf"
				} else if ext == ".webp" {
					mime = "image/webp"
				}
				return data, mime, nil
			}
		}
	}

	return nil, "", fmt.Errorf("file not found: %s", fileName)
}

// 20. Change Logs (Audit Trail)
func (s *Service) GetChangeLogs(orderID int) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			cl.ad_changelog_id,
			TO_CHAR(cl.created, 'YYYY-MM-DD HH24:MI:SS') AS created,
			COALESCE(u.name, 'System') AS user_name,
			COALESCE(c.columnname, '') AS column_name,
			COALESCE(cl.oldvalue, '') AS old_value,
			COALESCE(cl.newvalue, '') AS new_value,
			t.tablename AS table_name,
			cl.record_id
		FROM ad_changelog cl
		LEFT JOIN ad_column c ON c.ad_column_id = cl.ad_column_id
		LEFT JOIN ad_table t ON t.ad_table_id = cl.ad_table_id
		LEFT JOIN ad_user u ON u.ad_user_id = cl.createdby
		WHERE (
			(LOWER(t.tablename) = 'c_order' AND cl.record_id = ?)
			OR (LOWER(t.tablename) = 'c_orderline' AND cl.record_id IN (
				SELECT c_orderline_id FROM c_orderline WHERE c_order_id = ?
			))
		)
		ORDER BY cl.created DESC
		LIMIT 100
	`
	var rows []struct {
		ADChangeLogID int    `gorm:"column:ad_changelog_id"`
		Created       string `gorm:"column:created"`
		UserName      string `gorm:"column:user_name"`
		ColumnName    string `gorm:"column:column_name"`
		OldValue      string `gorm:"column:old_value"`
		NewValue      string `gorm:"column:new_value"`
		TableName     string `gorm:"column:table_name"`
		RecordID      int    `gorm:"column:record_id"`
	}

	if err := s.db.DB.Raw(query, orderID, orderID).Scan(&rows).Error; err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, r := range rows {
		results = append(results, map[string]interface{}{
			"ad_changelog_id": r.ADChangeLogID,
			"created":         r.Created,
			"user_name":       r.UserName,
			"column_name":     r.ColumnName,
			"old_value":       r.OldValue,
			"new_value":       r.NewValue,
			"table_name":      r.TableName,
			"record_id":       r.RecordID,
		})
	}

	return results, nil
}

// 21. Linked Requisitions for Tab Requisitions
func (s *Service) GetLinkedRequisitions(orderID int) ([]LinkedRequisitionItem, error) {
	reqQuery := `
		SELECT DISTINCT
			r.m_requisition_id,
			r.documentno,
			COALESCE(r.description, '') AS description,
			TO_CHAR(r.datedoc, 'YYYY-MM-DD') AS datedoc,
			TO_CHAR(r.daterequired, 'YYYY-MM-DD') AS daterequired,
			r.docstatus,
			COALESCE(r.totallines, 0) AS totallines,
			COALESCE(u.name, '') AS requester_name,
			COALESCE(org.name, '') AS org_name
		FROM m_requisition r
		JOIN m_requisitionline rl ON rl.m_requisition_id = r.m_requisition_id
		JOIN c_orderline ol ON (ol.m_requisitionline_id = rl.m_requisitionline_id OR rl.c_orderline_id = ol.c_orderline_id)
		LEFT JOIN ad_user u ON u.ad_user_id = r.createdby
		LEFT JOIN ad_org org ON org.ad_org_id = r.ad_org_id
		WHERE ol.c_order_id = ?
		ORDER BY r.documentno ASC
	`
	items := make([]LinkedRequisitionItem, 0)
	if err := s.db.DB.Raw(reqQuery, orderID).Scan(&items).Error; err != nil {
		return nil, err
	}

	for i := range items {
		items[i].DocStatusLabel = mapDocStatusLabel(items[i].DocStatus)

		// Fetch lines for this linked requisition
		lineQuery := `
			SELECT 
				rl.m_requisitionline_id,
				rl.line,
				COALESCE(p.value, '') AS product_code,
				COALESCE(p.name, '') AS product_name,
				COALESCE(rl.description, '') AS description,
				rl.qty,
				COALESCE(rl.priceactual, 0) AS priceactual,
				COALESCE(rl.linenetamt, 0) AS linenetamt,
				COALESCE(u.uomsymbol, '') AS uom_symbol,
				COALESCE(u.name, '') AS uom_name,
				COALESCE(bp.name, '') AS vendor_name,
				ol.c_orderline_id,
				ol.line AS po_line_no,
				ol.qtyentered AS po_qty
			FROM m_requisitionline rl
			LEFT JOIN m_product p ON p.m_product_id = rl.m_product_id
			LEFT JOIN c_uom u ON u.c_uom_id = rl.c_uom_id
			LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = rl.c_bpartner_id
			LEFT JOIN c_orderline ol ON (ol.m_requisitionline_id = rl.m_requisitionline_id OR rl.c_orderline_id = ol.c_orderline_id) AND ol.c_order_id = ?
			WHERE rl.m_requisition_id = ?
			ORDER BY rl.line ASC
		`
		var lines []LinkedRequisitionLineItem
		_ = s.db.DB.Raw(lineQuery, orderID, items[i].MRequisitionID).Scan(&lines).Error
		items[i].Lines = lines
	}

	return items, nil
}

// 22. Linked Material Receipts for Tab Receipts
func (s *Service) GetLinkedReceipts(orderID int) ([]LinkedReceiptItem, error) {
	query := `
		SELECT DISTINCT
			io.m_inout_id,
			io.documentno,
			COALESCE(io.description, '') AS description,
			TO_CHAR(io.movementdate, 'YYYY-MM-DD') AS movementdate,
			TO_CHAR(io.dateordered, 'YYYY-MM-DD') AS dateordered,
			io.docstatus,
			COALESCE(io.poreference, '') AS poreference,
			COALESCE(io.doreference, '') AS doreference,
			COALESCE(io.sppno, '') AS sppno,
			COALESCE(u.name, '') AS creator_name,
			COALESCE(org.name, '') AS org_name,
			COALESCE(bp.name, '') AS vendor_name,
			COALESCE(w.name, '') AS warehouse_name,
			COALESCE(dt.name, '') AS doctype_name
		FROM m_inout io
		LEFT JOIN m_inoutline iol ON iol.m_inout_id = io.m_inout_id
		LEFT JOIN ad_user u ON u.ad_user_id = io.createdby
		LEFT JOIN ad_org org ON org.ad_org_id = io.ad_org_id
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = io.c_bpartner_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = io.m_warehouse_id
		LEFT JOIN c_doctype dt ON dt.c_doctype_id = io.c_doctype_id
		WHERE io.issotrx = 'N'
		  AND (
			io.c_order_id = ?
			OR iol.c_orderline_id IN (
				SELECT c_orderline_id FROM c_orderline WHERE c_order_id = ?
			)
		  )
		ORDER BY io.documentno DESC
	`
	receipts := make([]LinkedReceiptItem, 0)
	if err := s.db.DB.Raw(query, orderID, orderID).Scan(&receipts).Error; err != nil {
		return nil, err
	}

	for i := range receipts {
		receipts[i].DocStatusLabel = mapDocStatusLabel(receipts[i].DocStatus)
	}

	return receipts, nil
}
