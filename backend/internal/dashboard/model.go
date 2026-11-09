package dashboard

import "time"

type ProcurementKPIs struct {
	CurrentMonthSpend    float64        `json:"current_month_spend"`
	LastMonthSpend       float64        `json:"last_month_spend"`
	SpendChangePct       float64        `json:"spend_change_pct"`
	PRStats              map[string]int `json:"pr_stats"`
	POStats              map[string]int `json:"po_stats"`
	PendingDeliveryCount int            `json:"pending_delivery_count"`
}

type SpendTrendItem struct {
	MonthLabel string    `json:"month_label" gorm:"column:month_label"`
	MonthDate  time.Time `json:"month_date" gorm:"column:month_date"`
	TotalSpend float64   `json:"total_spend" gorm:"column:total_spend"`
	POCount    int       `json:"po_count" gorm:"column:po_count"`
}

type TopSupplierItem struct {
	SupplierName string  `json:"supplier_name" gorm:"column:supplier_name"`
	TotalSpend   float64 `json:"total_spend" gorm:"column:total_spend"`
	POCount      int     `json:"po_count" gorm:"column:po_count"`
}

type RecentOrder struct {
	ID           int       `json:"id" gorm:"column:id"`
	DocumentNo   string    `json:"documentno" gorm:"column:documentno"`
	DateOrdered  time.Time `json:"dateordered" gorm:"column:dateordered"`
	SupplierName string    `json:"supplier_name" gorm:"column:supplier_name"`
	GrandTotal   float64   `json:"grandtotal" gorm:"column:grandtotal"`
	DocStatus    string    `json:"docstatus" gorm:"column:docstatus"`
}

type ProcurementDashboardData struct {
	KPIs         ProcurementKPIs   `json:"kpis"`
	SpendTrend   []SpendTrendItem  `json:"spend_trend"`
	TopSuppliers []TopSupplierItem `json:"top_suppliers"`
	RecentOrders []RecentOrder     `json:"recent_orders"`
}

// Sales Dashboard Models
type SalesKPIs struct {
	CurrentMonthRevenue float64        `json:"current_month_revenue"`
	LastMonthRevenue    float64        `json:"last_month_revenue"`
	RevenueChangePct    float64        `json:"revenue_change_pct"`
	TotalSOs            int            `json:"total_sos"`
	ActiveSOs           int            `json:"active_sos"`
	SOStats             map[string]int `json:"so_stats"`
	PendingShipmentCount int           `json:"pending_shipment_count"`
}

type RevenueTrendItem struct {
	MonthLabel   string    `json:"month_label" gorm:"column:month_label"`
	MonthDate    time.Time `json:"month_date" gorm:"column:month_date"`
	TotalRevenue float64   `json:"total_revenue" gorm:"column:total_revenue"`
	SOCount      int       `json:"so_count" gorm:"column:so_count"`
}

type TopCustomerItem struct {
	CustomerName string  `json:"customer_name" gorm:"column:customer_name"`
	TotalRevenue float64 `json:"total_revenue" gorm:"column:total_revenue"`
	SOCount      int     `json:"so_count" gorm:"column:so_count"`
}

type RecentSalesOrder struct {
	ID           int       `json:"id" gorm:"column:id"`
	DocumentNo   string    `json:"documentno" gorm:"column:documentno"`
	DateOrdered  time.Time `json:"dateordered" gorm:"column:dateordered"`
	CustomerName string    `json:"customer_name" gorm:"column:customer_name"`
	GrandTotal   float64   `json:"grandtotal" gorm:"column:grandtotal"`
	DocStatus    string    `json:"docstatus" gorm:"column:docstatus"`
}

type SalesDashboardData struct {
	KPIs         SalesKPIs          `json:"kpis"`
	RevenueTrend []RevenueTrendItem `json:"revenue_trend"`
	TopCustomers []TopCustomerItem  `json:"top_customers"`
	RecentOrders []RecentSalesOrder `json:"recent_orders"`
}

// Delivery Dashboard Models
type DeliveryKPIs struct {
	ShipmentsCurrentMonth int            `json:"shipments_current_month"`
	ShipmentsLastMonth    int            `json:"shipments_last_month"`
	ShipmentChangePct     float64        `json:"shipment_change_pct"`
	TotalShipments        int            `json:"total_shipments"`
	CompletedShipments    int            `json:"completed_shipments"`
	PendingDeliveries     int            `json:"pending_deliveries"`
	ShipmentStats         map[string]int `json:"shipment_stats"`
}

type ShipmentTrendItem struct {
	MonthLabel     string    `json:"month_label" gorm:"column:month_label"`
	MonthDate      time.Time `json:"month_date" gorm:"column:month_date"`
	TotalShipments int       `json:"total_shipments" gorm:"column:total_shipments"`
}

type TopDeliveryCustomerItem struct {
	CustomerName   string `json:"customer_name" gorm:"column:customer_name"`
	TotalShipments int    `json:"total_shipments" gorm:"column:total_shipments"`
}

type RecentShipment struct {
	ID           int       `json:"id" gorm:"column:id"`
	DocumentNo   string    `json:"documentno" gorm:"column:documentno"`
	MovementDate time.Time `json:"movementdate" gorm:"column:movementdate"`
	CustomerName string    `json:"customer_name" gorm:"column:customer_name"`
	TrackingNo   string    `json:"trackingno" gorm:"column:trackingno"`
	DocStatus    string    `json:"docstatus" gorm:"column:docstatus"`
}

type DeliveryDashboardData struct {
	KPIs             DeliveryKPIs              `json:"kpis"`
	ShipmentTrend    []ShipmentTrendItem       `json:"shipment_trend"`
	TopCustomers     []TopDeliveryCustomerItem `json:"top_customers"`
	RecentActivities []RecentShipment          `json:"recent_activities"`
}

// Warehouse Dashboard Models
type WarehouseKPIs struct {
	TotalWarehouses   int     `json:"total_warehouses"`
	ProductsInStock   int     `json:"products_in_stock"`
	TotalStockQty     float64 `json:"total_stock_qty"`
	InboundThisMonth  int     `json:"inbound_this_month"`
	OutboundThisMonth int     `json:"outbound_this_month"`
}

type WarehouseMovementTrendItem struct {
	MonthLabel    string    `json:"month_label" gorm:"column:month_label"`
	MonthDate     time.Time `json:"month_date" gorm:"column:month_date"`
	InboundCount  int       `json:"inbound_count" gorm:"column:inbound_count"`
	OutboundCount int       `json:"outbound_count" gorm:"column:outbound_count"`
}

type TopStockProductItem struct {
	ProductName string  `json:"product_name" gorm:"column:product_name"`
	TotalQty    float64 `json:"total_qty" gorm:"column:total_qty"`
}

type WarehouseStockDistributionItem struct {
	WarehouseName string  `json:"warehouse_name" gorm:"column:warehouse_name"`
	ProductCount  int     `json:"product_count" gorm:"column:product_count"`
	TotalQty      float64 `json:"total_qty" gorm:"column:total_qty"`
}

type RecentWarehouseMovement struct {
	ID            int       `json:"id" gorm:"column:id"`
	DocumentNo    string    `json:"documentno" gorm:"column:documentno"`
	MovementDate  time.Time `json:"movementdate" gorm:"column:movementdate"`
	DocStatus     string    `json:"docstatus" gorm:"column:docstatus"`
	IsSOTrx       string    `json:"issotrx" gorm:"column:issotrx"`
	PartnerName   string    `json:"partner_name" gorm:"column:partner_name"`
	WarehouseName string    `json:"warehouse_name" gorm:"column:warehouse_name"`
}

type WarehouseDashboardData struct {
	KPIs               WarehouseKPIs                    `json:"kpis"`
	MovementTrend      []WarehouseMovementTrendItem     `json:"movement_trend"`
	TopProducts        []TopStockProductItem            `json:"top_products"`
	StockPerWarehouse  []WarehouseStockDistributionItem `json:"stock_per_warehouse"`
	RecentMovements    []RecentWarehouseMovement        `json:"recent_movements"`
}
