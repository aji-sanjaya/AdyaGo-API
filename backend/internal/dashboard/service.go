package dashboard

import (
	"fmt"
	"math"

	"factoryhub-go/internal/database"
)

type Service struct {
	db *database.DBInstance
}

func NewService(db *database.DBInstance) *Service {
	return &Service{db: db}
}

type statusCountRow struct {
	DocStatus string `gorm:"column:docstatus"`
	Total     int    `gorm:"column:total"`
}

func (s *Service) GetProcurementDashboard(clientID int, orgID int) (*ProcurementDashboardData, error) {
	data := &ProcurementDashboardData{
		KPIs: ProcurementKPIs{
			PRStats: make(map[string]int),
			POStats: make(map[string]int),
		},
		SpendTrend:   []SpendTrendItem{},
		TopSuppliers: []TopSupplierItem{},
		RecentOrders: []RecentOrder{},
	}

	// 1. Current Month PO Spend
	var currentMonthSpend float64
	curSpendQuery := `
		SELECT COALESCE(SUM(grandtotal), 0)
		FROM c_order
		WHERE issotrx = 'N'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(curSpendQuery, clientID, clientID, orgID, orgID).Scan(&currentMonthSpend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch current month spend: %w", err)
	}
	data.KPIs.CurrentMonthSpend = currentMonthSpend

	// 2. Last Month PO Spend
	var lastMonthSpend float64
	lastSpendQuery := `
		SELECT COALESCE(SUM(grandtotal), 0)
		FROM c_order
		WHERE issotrx = 'N'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
		  AND dateordered < DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(lastSpendQuery, clientID, clientID, orgID, orgID).Scan(&lastMonthSpend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch last month spend: %w", err)
	}
	data.KPIs.LastMonthSpend = lastMonthSpend

	if lastMonthSpend > 0 {
		data.KPIs.SpendChangePct = math.Round(((currentMonthSpend-lastMonthSpend)/lastMonthSpend)*1000) / 10
	}

	// 3. PR Status Counts
	var prRows []statusCountRow
	prQuery := `
		SELECT docstatus, count(1) as total
		FROM m_requisition
		WHERE isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY docstatus
	`
	if err := s.db.DB.Raw(prQuery, clientID, clientID, orgID, orgID).Scan(&prRows).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch PR counts: %w", err)
	}
	for _, r := range prRows {
		data.KPIs.PRStats[r.DocStatus] = r.Total
	}

	// 4. PO Status Counts
	var poRows []statusCountRow
	poQuery := `
		SELECT docstatus, count(1) as total
		FROM c_order
		WHERE issotrx = 'N'
		  AND isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY docstatus
	`
	if err := s.db.DB.Raw(poQuery, clientID, clientID, orgID, orgID).Scan(&poRows).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch PO counts: %w", err)
	}
	for _, r := range poRows {
		data.KPIs.POStats[r.DocStatus] = r.Total
	}

	// 5. Pending Delivery Count (POs with qtyordered > qtydelivered)
	var pendingCount int
	pendingQuery := `
		SELECT count(DISTINCT o.c_order_id)
		FROM c_order o
		JOIN c_orderline ol ON ol.c_order_id = o.c_order_id
		WHERE o.issotrx = 'N'
		  AND o.docstatus = 'CO'
		  AND ol.qtyordered > ol.qtydelivered
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
	`
	if err := s.db.DB.Raw(pendingQuery, clientID, clientID, orgID, orgID).Scan(&pendingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch pending delivery count: %w", err)
	}
	data.KPIs.PendingDeliveryCount = pendingCount

	// 6. Spend Trend (Last 6 months)
	trendQuery := `
		SELECT 
			TO_CHAR(DATE_TRUNC('month', dateordered), 'Mon YYYY') as month_label,
			DATE_TRUNC('month', dateordered) as month_date,
			COALESCE(SUM(grandtotal), 0) as total_spend,
			COUNT(c_order_id) as po_count
		FROM c_order
		WHERE issotrx = 'N'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY DATE_TRUNC('month', dateordered)
		ORDER BY month_date ASC
	`
	if err := s.db.DB.Raw(trendQuery, clientID, clientID, orgID, orgID).Scan(&data.SpendTrend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch spend trend: %w", err)
	}

	// 7. Top 5 Suppliers (Current Year)
	suppliersQuery := `
		SELECT 
			COALESCE(bp.name, 'Unknown') as supplier_name,
			COALESCE(SUM(o.grandtotal), 0) as total_spend,
			COUNT(o.c_order_id) as po_count
		FROM c_order o
		JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE o.issotrx = 'N'
		  AND o.docstatus IN ('CO', 'CL')
		  AND o.dateordered >= DATE_TRUNC('year', CURRENT_DATE)
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
		GROUP BY bp.name
		ORDER BY total_spend DESC
		LIMIT 5
	`
	if err := s.db.DB.Raw(suppliersQuery, clientID, clientID, orgID, orgID).Scan(&data.TopSuppliers).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch top suppliers: %w", err)
	}

	// 8. Recent 10 Orders
	recentQuery := `
		SELECT 
			o.c_order_id as id,
			o.documentno,
			o.dateordered,
			COALESCE(bp.name, 'Unknown') as supplier_name,
			o.grandtotal,
			o.docstatus
		FROM c_order o
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE o.issotrx = 'N'
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
		ORDER BY o.dateordered DESC, o.c_order_id DESC
		LIMIT 10
	`
	if err := s.db.DB.Raw(recentQuery, clientID, clientID, orgID, orgID).Scan(&data.RecentOrders).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch recent orders: %w", err)
	}

	return data, nil
}

func (s *Service) GetSalesDashboard(clientID int, orgID int) (*SalesDashboardData, error) {
	data := &SalesDashboardData{
		KPIs: SalesKPIs{
			SOStats: make(map[string]int),
		},
		RevenueTrend: []RevenueTrendItem{},
		TopCustomers: []TopCustomerItem{},
		RecentOrders: []RecentSalesOrder{},
	}

	// 1. Current Month SO Revenue
	var currentMonthRevenue float64
	curRevQuery := `
		SELECT COALESCE(SUM(grandtotal), 0)
		FROM c_order
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(curRevQuery, clientID, clientID, orgID, orgID).Scan(&currentMonthRevenue).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch current month sales revenue: %w", err)
	}
	data.KPIs.CurrentMonthRevenue = currentMonthRevenue

	// 2. Last Month SO Revenue
	var lastMonthRevenue float64
	lastRevQuery := `
		SELECT COALESCE(SUM(grandtotal), 0)
		FROM c_order
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
		  AND dateordered < DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(lastRevQuery, clientID, clientID, orgID, orgID).Scan(&lastMonthRevenue).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch last month sales revenue: %w", err)
	}
	data.KPIs.LastMonthRevenue = lastMonthRevenue

	if lastMonthRevenue > 0 {
		data.KPIs.RevenueChangePct = math.Round(((currentMonthRevenue-lastMonthRevenue)/lastMonthRevenue)*1000) / 10
	}

	// 3. SO Status Counts
	var soRows []statusCountRow
	soQuery := `
		SELECT docstatus, count(1) as total
		FROM c_order
		WHERE issotrx = 'Y'
		  AND isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY docstatus
	`
	if err := s.db.DB.Raw(soQuery, clientID, clientID, orgID, orgID).Scan(&soRows).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch SO status counts: %w", err)
	}

	totalSOs := 0
	activeSOs := 0
	for _, r := range soRows {
		data.KPIs.SOStats[r.DocStatus] = r.Total
		totalSOs += r.Total
		if r.DocStatus == "IP" || r.DocStatus == "CO" {
			activeSOs += r.Total
		}
	}
	data.KPIs.TotalSOs = totalSOs
	data.KPIs.ActiveSOs = activeSOs

	// 4. Pending Shipment Count (SOs with qtyordered > qtydelivered)
	var pendingCount int
	pendingQuery := `
		SELECT count(DISTINCT o.c_order_id)
		FROM c_order o
		JOIN c_orderline ol ON ol.c_order_id = o.c_order_id
		WHERE o.issotrx = 'Y'
		  AND o.docstatus = 'CO'
		  AND ol.qtyordered > ol.qtydelivered
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
	`
	if err := s.db.DB.Raw(pendingQuery, clientID, clientID, orgID, orgID).Scan(&pendingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch pending shipments count: %w", err)
	}
	data.KPIs.PendingShipmentCount = pendingCount

	// 5. Monthly Revenue Trend (Last 6 Months)
	trendQuery := `
		SELECT 
			TO_CHAR(DATE_TRUNC('month', dateordered), 'Mon YYYY') as month_label,
			DATE_TRUNC('month', dateordered) as month_date,
			COALESCE(SUM(grandtotal), 0) as total_revenue,
			COUNT(c_order_id) as so_count
		FROM c_order
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND dateordered >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY DATE_TRUNC('month', dateordered)
		ORDER BY month_date ASC
	`
	if err := s.db.DB.Raw(trendQuery, clientID, clientID, orgID, orgID).Scan(&data.RevenueTrend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch revenue trend: %w", err)
	}

	// 6. Top 5 Customers (Current Year)
	customersQuery := `
		SELECT 
			COALESCE(bp.name, 'Unknown') as customer_name,
			COALESCE(SUM(o.grandtotal), 0) as total_revenue,
			COUNT(o.c_order_id) as so_count
		FROM c_order o
		JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE o.issotrx = 'Y'
		  AND o.docstatus IN ('CO', 'CL')
		  AND o.dateordered >= DATE_TRUNC('year', CURRENT_DATE)
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
		GROUP BY bp.name
		ORDER BY total_revenue DESC
		LIMIT 5
	`
	if err := s.db.DB.Raw(customersQuery, clientID, clientID, orgID, orgID).Scan(&data.TopCustomers).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch top customers: %w", err)
	}

	// 7. Recent 10 Sales Orders
	recentQuery := `
		SELECT 
			o.c_order_id as id,
			o.documentno,
			o.dateordered,
			COALESCE(bp.name, 'Unknown') as customer_name,
			o.grandtotal,
			o.docstatus
		FROM c_order o
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE o.issotrx = 'Y'
		  AND (? = 0 OR o.ad_client_id = ?)
		  AND (? = 0 OR o.ad_org_id = ?)
		ORDER BY o.dateordered DESC, o.c_order_id DESC
		LIMIT 10
	`
	if err := s.db.DB.Raw(recentQuery, clientID, clientID, orgID, orgID).Scan(&data.RecentOrders).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch recent sales orders: %w", err)
	}

	return data, nil
}

func (s *Service) GetDeliveryDashboard(clientID int, orgID int) (*DeliveryDashboardData, error) {
	data := &DeliveryDashboardData{
		KPIs: DeliveryKPIs{
			ShipmentStats: make(map[string]int),
		},
		ShipmentTrend:    []ShipmentTrendItem{},
		TopCustomers:     []TopDeliveryCustomerItem{},
		RecentActivities: []RecentShipment{},
	}

	// 1. Current Month Customer Shipments Count
	var curMonthShipments int
	curMonthQuery := `
		SELECT COUNT(1)
		FROM m_inout
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(curMonthQuery, clientID, clientID, orgID, orgID).Scan(&curMonthShipments).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch current month shipments: %w", err)
	}
	data.KPIs.ShipmentsCurrentMonth = curMonthShipments

	// 2. Last Month Customer Shipments Count
	var lastMonthShipments int
	lastMonthQuery := `
		SELECT COUNT(1)
		FROM m_inout
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
		  AND movementdate < DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(lastMonthQuery, clientID, clientID, orgID, orgID).Scan(&lastMonthShipments).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch last month shipments: %w", err)
	}
	data.KPIs.ShipmentsLastMonth = lastMonthShipments

	if lastMonthShipments > 0 {
		data.KPIs.ShipmentChangePct = math.Round((float64(curMonthShipments-lastMonthShipments)/float64(lastMonthShipments))*1000) / 10
	}

	// 3. Shipment Status Breakdown
	var statusRows []statusCountRow
	statusQuery := `
		SELECT docstatus, count(1) as total
		FROM m_inout
		WHERE issotrx = 'Y'
		  AND isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY docstatus
	`
	if err := s.db.DB.Raw(statusQuery, clientID, clientID, orgID, orgID).Scan(&statusRows).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch shipment status counts: %w", err)
	}

	totalShipments := 0
	completedShipments := 0
	pendingDeliveries := 0
	for _, r := range statusRows {
		data.KPIs.ShipmentStats[r.DocStatus] = r.Total
		totalShipments += r.Total
		if r.DocStatus == "CO" || r.DocStatus == "CL" {
			completedShipments += r.Total
		}
		if r.DocStatus == "DR" || r.DocStatus == "IP" {
			pendingDeliveries += r.Total
		}
	}
	data.KPIs.TotalShipments = totalShipments
	data.KPIs.CompletedShipments = completedShipments
	data.KPIs.PendingDeliveries = pendingDeliveries

	// 4. Monthly Shipment Volume Trend (Last 6 Months)
	trendQuery := `
		SELECT 
			TO_CHAR(DATE_TRUNC('month', movementdate), 'Mon YYYY') as month_label,
			DATE_TRUNC('month', movementdate) as month_date,
			COUNT(m_inout_id) as total_shipments
		FROM m_inout
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
		GROUP BY DATE_TRUNC('month', movementdate)
		ORDER BY month_date ASC
	`
	if err := s.db.DB.Raw(trendQuery, clientID, clientID, orgID, orgID).Scan(&data.ShipmentTrend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch shipment volume trend: %w", err)
	}

	// 5. Top 5 Customers by Shipment Count (Current Year)
	customersQuery := `
		SELECT 
			COALESCE(bp.name, 'Unknown') as customer_name,
			COUNT(io.m_inout_id) as total_shipments
		FROM m_inout io
		JOIN c_bpartner bp ON bp.c_bpartner_id = io.c_bpartner_id
		WHERE io.issotrx = 'Y'
		  AND io.docstatus IN ('CO', 'CL')
		  AND io.movementdate >= DATE_TRUNC('year', CURRENT_DATE)
		  AND (? = 0 OR io.ad_client_id = ?)
		  AND (? = 0 OR io.ad_org_id = ?)
		GROUP BY bp.name
		ORDER BY total_shipments DESC
		LIMIT 5
	`
	if err := s.db.DB.Raw(customersQuery, clientID, clientID, orgID, orgID).Scan(&data.TopCustomers).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch top delivery customers: %w", err)
	}

	// 6. Recent 10 Shipments
	recentQuery := `
		SELECT 
			io.m_inout_id as id,
			io.documentno,
			io.movementdate,
			COALESCE(bp.name, 'Unknown') as customer_name,
			COALESCE(io.trackingno, '-') as trackingno,
			io.docstatus
		FROM m_inout io
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = io.c_bpartner_id
		WHERE io.issotrx = 'Y'
		  AND (? = 0 OR io.ad_client_id = ?)
		  AND (? = 0 OR io.ad_org_id = ?)
		ORDER BY io.movementdate DESC, io.m_inout_id DESC
		LIMIT 10
	`
	if err := s.db.DB.Raw(recentQuery, clientID, clientID, orgID, orgID).Scan(&data.RecentActivities).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch recent delivery activities: %w", err)
	}

	return data, nil
}

func (s *Service) GetWarehouseDashboard(clientID int, orgID int) (*WarehouseDashboardData, error) {
	data := &WarehouseDashboardData{
		KPIs:              WarehouseKPIs{},
		MovementTrend:     []WarehouseMovementTrendItem{},
		TopProducts:       []TopStockProductItem{},
		StockPerWarehouse: []WarehouseStockDistributionItem{},
		RecentMovements:   []RecentWarehouseMovement{},
	}

	// 1. Total Active Warehouses
	var totalWarehouses int
	whQuery := `
		SELECT COUNT(1)
		FROM m_warehouse
		WHERE isactive = 'Y'
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(whQuery, clientID, clientID, orgID, orgID).Scan(&totalWarehouses).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch total warehouses: %w", err)
	}
	data.KPIs.TotalWarehouses = totalWarehouses

	// 2. Stock On Hand Stats (Distinct Products and Total Quantity)
	type stockSummary struct {
		ProductsInStock int     `gorm:"column:products_in_stock"`
		TotalStockQty   float64 `gorm:"column:total_stock_qty"`
	}
	var summary stockSummary
	stockQuery := `
		SELECT 
			COUNT(DISTINCT soh.m_product_id) as products_in_stock,
			COALESCE(SUM(soh.qtyonhand), 0) as total_stock_qty
		FROM m_storageonhand soh
		JOIN m_locator l ON l.m_locator_id = soh.m_locator_id
		JOIN m_warehouse w ON w.m_warehouse_id = l.m_warehouse_id
		WHERE soh.qtyonhand > 0
		  AND (? = 0 OR w.ad_client_id = ?)
		  AND (? = 0 OR w.ad_org_id = ?)
	`
	if err := s.db.DB.Raw(stockQuery, clientID, clientID, orgID, orgID).Scan(&summary).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch stock on hand summary: %w", err)
	}
	data.KPIs.ProductsInStock = summary.ProductsInStock
	data.KPIs.TotalStockQty = summary.TotalStockQty

	// 3. Inbound This Month (Material Receipts - issotrx = 'N')
	var inboundMonth int
	inboundQuery := `
		SELECT COUNT(1)
		FROM m_inout
		WHERE issotrx = 'N'
		  AND docstatus IN ('CO', 'CL')
		  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(inboundQuery, clientID, clientID, orgID, orgID).Scan(&inboundMonth).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch inbound this month: %w", err)
	}
	data.KPIs.InboundThisMonth = inboundMonth

	// 4. Outbound This Month (Customer Shipments - issotrx = 'Y')
	var outboundMonth int
	outboundQuery := `
		SELECT COUNT(1)
		FROM m_inout
		WHERE issotrx = 'Y'
		  AND docstatus IN ('CO', 'CL')
		  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE)
		  AND (? = 0 OR ad_client_id = ?)
		  AND (? = 0 OR ad_org_id = ?)
	`
	if err := s.db.DB.Raw(outboundQuery, clientID, clientID, orgID, orgID).Scan(&outboundMonth).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch outbound this month: %w", err)
	}
	data.KPIs.OutboundThisMonth = outboundMonth

	// 5. Inbound vs Outbound Movement Trend (Last 6 Months)
	trendQuery := `
		WITH months AS (
			SELECT generate_series(
				DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
				DATE_TRUNC('month', CURRENT_DATE),
				INTERVAL '1 month'
			) AS month_date
		),
		inbound AS (
			SELECT 
				DATE_TRUNC('month', movementdate) as month_date,
				COUNT(1) as cnt
			FROM m_inout
			WHERE issotrx = 'N'
			  AND docstatus IN ('CO', 'CL', 'IP')
			  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
			  AND (? = 0 OR ad_client_id = ?)
			  AND (? = 0 OR ad_org_id = ?)
			GROUP BY DATE_TRUNC('month', movementdate)
		),
		outbound AS (
			SELECT 
				DATE_TRUNC('month', movementdate) as month_date,
				COUNT(1) as cnt
			FROM m_inout
			WHERE issotrx = 'Y'
			  AND docstatus IN ('CO', 'CL', 'IP')
			  AND movementdate >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
			  AND (? = 0 OR ad_client_id = ?)
			  AND (? = 0 OR ad_org_id = ?)
			GROUP BY DATE_TRUNC('month', movementdate)
		)
		SELECT 
			TO_CHAR(m.month_date, 'Mon YYYY') as month_label,
			m.month_date,
			COALESCE(i.cnt, 0) as inbound_count,
			COALESCE(o.cnt, 0) as outbound_count
		FROM months m
		LEFT JOIN inbound i ON i.month_date = m.month_date
		LEFT JOIN outbound o ON o.month_date = m.month_date
		ORDER BY m.month_date ASC
	`
	if err := s.db.DB.Raw(trendQuery, clientID, clientID, orgID, orgID, clientID, clientID, orgID, orgID).Scan(&data.MovementTrend).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch warehouse movement trend: %w", err)
	}

	// 6. Top 5 Products by Stock On Hand
	topProdQuery := `
		SELECT 
			COALESCE(p.name, 'Unknown Product') as product_name,
			COALESCE(SUM(soh.qtyonhand), 0) as total_qty
		FROM m_storageonhand soh
		JOIN m_locator l ON l.m_locator_id = soh.m_locator_id
		JOIN m_warehouse w ON w.m_warehouse_id = l.m_warehouse_id
		JOIN m_product p ON p.m_product_id = soh.m_product_id
		WHERE soh.qtyonhand > 0
		  AND (? = 0 OR w.ad_client_id = ?)
		  AND (? = 0 OR w.ad_org_id = ?)
		GROUP BY p.name
		ORDER BY total_qty DESC
		LIMIT 5
	`
	if err := s.db.DB.Raw(topProdQuery, clientID, clientID, orgID, orgID).Scan(&data.TopProducts).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch top stock products: %w", err)
	}

	// 7. Stock per Warehouse
	whDistQuery := `
		SELECT 
			COALESCE(w.name, 'Unknown Warehouse') as warehouse_name,
			COUNT(DISTINCT soh.m_product_id) as product_count,
			COALESCE(SUM(soh.qtyonhand), 0) as total_qty
		FROM m_storageonhand soh
		JOIN m_locator l ON l.m_locator_id = soh.m_locator_id
		JOIN m_warehouse w ON w.m_warehouse_id = l.m_warehouse_id
		WHERE soh.qtyonhand > 0
		  AND (? = 0 OR w.ad_client_id = ?)
		  AND (? = 0 OR w.ad_org_id = ?)
		GROUP BY w.name
		ORDER BY total_qty DESC
		LIMIT 8
	`
	if err := s.db.DB.Raw(whDistQuery, clientID, clientID, orgID, orgID).Scan(&data.StockPerWarehouse).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch stock per warehouse: %w", err)
	}

	// 8. Recent 10 Warehouse Movements
	recentQuery := `
		SELECT 
			io.m_inout_id as id,
			io.documentno,
			io.movementdate,
			io.docstatus,
			io.issotrx,
			COALESCE(bp.name, '-') as partner_name,
			COALESCE(w.name, '-') as warehouse_name
		FROM m_inout io
		LEFT JOIN c_bpartner bp ON bp.c_bpartner_id = io.c_bpartner_id
		LEFT JOIN m_warehouse w ON w.m_warehouse_id = io.m_warehouse_id
		WHERE (? = 0 OR io.ad_client_id = ?)
		  AND (? = 0 OR io.ad_org_id = ?)
		ORDER BY io.created DESC, io.m_inout_id DESC
		LIMIT 10
	`
	if err := s.db.DB.Raw(recentQuery, clientID, clientID, orgID, orgID).Scan(&data.RecentMovements).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch recent warehouse movements: %w", err)
	}

	return data, nil
}

