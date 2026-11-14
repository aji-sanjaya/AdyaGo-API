package order

import "time"

type SelectOption struct {
	ID   int    `json:"id" gorm:"column:id"`
	Text string `json:"text" gorm:"column:text"`
}

type TaxOption struct {
	ID   int     `json:"id" gorm:"column:id"`
	Text string  `json:"text" gorm:"column:text"`
	Rate float64 `json:"rate" gorm:"column:rate"`
}

type OrderStats struct {
	TotalMonth int64 `json:"total_month" gorm:"column:total_month"`
	Completed  int64 `json:"completed" gorm:"column:completed"`
	InProgress int64 `json:"in_progress" gorm:"column:in_progress"`
	Draft      int64 `json:"draft" gorm:"column:draft"`
}

type OrderListItem struct {
	COrderID      int       `json:"c_order_id" gorm:"column:c_order_id"`
	DocumentNo    string    `json:"documentno" gorm:"column:documentno"`
	DocStatus     string    `json:"docstatus" gorm:"column:docstatus"`
	StatusLabel   string    `json:"status_label" gorm:"column:status_label"`
	DateOrdered   time.Time `json:"dateordered" gorm:"column:dateordered"`
	DatePromised  time.Time `json:"datepromised" gorm:"column:datepromised"`
	Description   string    `json:"description" gorm:"column:description"`
	GrandTotal    float64   `json:"grandtotal" gorm:"column:grandtotal"`
	TotalLines    float64   `json:"totallines" gorm:"column:totallines"`
	OrgID         int       `json:"ad_org_id" gorm:"column:ad_org_id"`
	OrgName       string    `json:"org_name" gorm:"column:org_name"`
	WarehouseID   int       `json:"m_warehouse_id" gorm:"column:m_warehouse_id"`
	WarehouseName string    `json:"warehouse_name" gorm:"column:warehouse_name"`
	BPartnerID    int       `json:"c_bpartner_id" gorm:"column:c_bpartner_id"`
	BPartnerValue string    `json:"bpartner_value" gorm:"column:bpartner_value"`
	BPartnerName  string    `json:"bpartner_name" gorm:"column:bpartner_name"`
	CreatedByName string    `json:"createdby_name" gorm:"column:createdby_name"`
}

type OrderListResponse struct {
	Stats  OrderStats      `json:"stats"`
	Orders []OrderListItem `json:"orders"`
	Total  int64           `json:"total"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
}

type OrderHeader struct {
	COrderID          int       `json:"c_order_id" gorm:"column:c_order_id"`
	ClientID          int       `json:"ad_client_id" gorm:"column:ad_client_id"`
	DocumentNo        string    `json:"documentno" gorm:"column:documentno"`
	DocStatus         string    `json:"docstatus" gorm:"column:docstatus"`
	DocStatusLabel    string    `json:"docstatus_label" gorm:"column:docstatus_label"`
	DocAction         string    `json:"docaction" gorm:"column:docaction"`
	DocTypeID         int       `json:"c_doctype_id" gorm:"column:c_doctype_id"`
	DocTypeTargetID   int       `json:"c_doctypetarget_id" gorm:"column:c_doctypetarget_id"`
	DateOrdered       time.Time `json:"dateordered" gorm:"column:dateordered"`
	DatePromised      time.Time `json:"datepromised" gorm:"column:datepromised"`
	Description       string    `json:"description" gorm:"column:description"`
	OrgID             int       `json:"ad_org_id" gorm:"column:ad_org_id"`
	OrgName           string    `json:"org_name" gorm:"column:org_name"`
	WarehouseID       int       `json:"m_warehouse_id" gorm:"column:m_warehouse_id"`
	WarehouseName     string    `json:"warehouse_name" gorm:"column:warehouse_name"`
	BPartnerID        int       `json:"c_bpartner_id" gorm:"column:c_bpartner_id"`
	BPartnerValue     string    `json:"bpartner_value" gorm:"column:bpartner_value"`
	BPartnerName      string    `json:"bpartner_name" gorm:"column:bpartner_name"`
	BPartnerLocID     int       `json:"c_bpartner_location_id" gorm:"column:c_bpartner_location_id"`
	ADUserID          *int      `json:"ad_user_id" gorm:"column:ad_user_id"`
	ContactName       string    `json:"contact_name" gorm:"column:contact_name"`
	PriceListID       int       `json:"m_pricelist_id" gorm:"column:m_pricelist_id"`
	PriceListName     string    `json:"pricelist_name" gorm:"column:pricelist_name"`
	PaymentRule       string    `json:"paymentrule" gorm:"column:paymentrule"`
	PaymentTermID     int       `json:"c_paymentterm_id" gorm:"column:c_paymentterm_id"`
	PaymentTermName   string    `json:"paymentterm_name" gorm:"column:paymentterm_name"`
	PriorityRule      string    `json:"priorityrule" gorm:"column:priorityrule"`
	SalesRepID        int       `json:"salesrep_id" gorm:"column:salesrep_id"`
	SalesRepName      string    `json:"salesrep_name" gorm:"column:salesrep_name"`
	CostCenterID      *int      `json:"c_costcenter_id" gorm:"column:c_costcenter_id"`
	CostCenterName    string    `json:"costcenter_name" gorm:"column:costcenter_name"`
	ProjectID         *int      `json:"c_project_id" gorm:"column:c_project_id"`
	ProjectName       string    `json:"project_name" gorm:"column:project_name"`
	TaxID             int       `json:"c_tax_id" gorm:"column:c_tax_id"`
	TaxName           string    `json:"tax_name" gorm:"column:tax_name"`
	PricePrecision    int       `json:"price_precision" gorm:"column:price_precision"`
	CurrencyPrecision int       `json:"currency_precision" gorm:"column:currency_precision"`
	CurrencySymbol    string    `json:"currency_symbol" gorm:"column:currency_symbol"`
	CurrencyCode      string    `json:"currency_code" gorm:"column:currency_code"`
	CurrencyID        int       `json:"c_currency_id" gorm:"column:c_currency_id"`
	CheckedByID       *int      `json:"adw_ad_user_checked_id" gorm:"column:adw_ad_user_checked_id"`
	CheckedByName     string    `json:"checkedby_name" gorm:"column:checkedby_name"`
	ApprovedByID      *int      `json:"adw_ad_user_approved_id" gorm:"column:adw_ad_user_approved_id"`
	ApprovedByName    string    `json:"approvedby_name" gorm:"column:approvedby_name"`
	TotalLines        float64   `json:"totallines" gorm:"column:totallines"`
	GrandTotal        float64   `json:"grandtotal" gorm:"column:grandtotal"`
	WithholdingAmount float64   `json:"withholdingamount" gorm:"column:withholdingamount"`
	HasActiveWorkflow bool      `json:"has_active_workflow" gorm:"-"`
	IsReadOnly        bool      `json:"is_read_only" gorm:"-"`
	IsDraft           bool      `json:"is_draft" gorm:"-"`
	ClientName         string     `json:"client_name" gorm:"-"`
	LogoBase64         string     `json:"logo_base64" gorm:"-"`
	AddressLines       []string   `json:"address_lines" gorm:"-"`
	CreatedAt          *time.Time `json:"created_at" gorm:"column:created_at"`
	CreatedByName      string     `json:"createdby_name" gorm:"column:createdby_name"`
	CheckedDate        *time.Time `json:"checked_date" gorm:"column:checked_date"`
	CheckedIsApproved  string     `json:"checked_isapproved" gorm:"column:checked_isapproved"`
	ApprovedDate       *time.Time `json:"approved_date" gorm:"column:approved_date"`
	ApprovedIsApproved string     `json:"approved_isapproved" gorm:"column:approved_isapproved"`
	VendorAddress1     string     `json:"vendor_address1" gorm:"-"`
	VendorAddress2     string     `json:"vendor_address2" gorm:"-"`
	VendorCity         string     `json:"vendor_city" gorm:"-"`
	VendorPhone        string     `json:"vendor_phone" gorm:"-"`
	OrgTaxID           string     `json:"org_taxid" gorm:"-"`
	OrgAddress1        string     `json:"org_address1" gorm:"-"`
	OrgAddress2        string     `json:"org_address2" gorm:"-"`
	OrgAddress3        string     `json:"org_address3" gorm:"-"`
	OrgCity            string     `json:"org_city" gorm:"-"`
	OrgPostal          string     `json:"org_postal" gorm:"-"`
}

type OrderLine struct {
	COrderLineID      int        `json:"c_orderline_id" gorm:"column:c_orderline_id"`
	LineID            int        `json:"id" gorm:"column:id"`
	COrderID          int        `json:"c_order_id" gorm:"column:c_order_id"`
	Line              int        `json:"line" gorm:"column:line"`
	DatePromised      *time.Time `json:"datepromised" gorm:"column:datepromised"`
	ProductID         *int       `json:"m_product_id" gorm:"column:m_product_id"`
	ProductValue      string  `json:"product_value" gorm:"column:product_value"`
	ProductName       string  `json:"product_name" gorm:"column:product_name"`
	ChargeID          *int    `json:"c_charge_id" gorm:"column:c_charge_id"`
	ChargeName        string  `json:"charge_name" gorm:"column:charge_name"`
	UOMID             *int    `json:"c_uom_id" gorm:"column:c_uom_id"`
	UOMName           string  `json:"uom_name" gorm:"column:uom_name"`
	UOMSymbol         string  `json:"uom_symbol" gorm:"column:uom_symbol"`
	UOMPrecision      int     `json:"uom_precision" gorm:"column:uom_precision"`
	Qty               float64 `json:"qty" gorm:"column:qty"`
	QtyOrdered        float64 `json:"qtyordered" gorm:"column:qtyordered"`
	QtyEntered        float64 `json:"qtyentered" gorm:"column:qtyentered"`
	PriceEntered      float64 `json:"priceentered" gorm:"column:priceentered"`
	PriceActual       float64 `json:"priceactual" gorm:"column:priceactual"`
	Discount          float64 `json:"discount" gorm:"column:discount"`
	LineNetAmt        float64 `json:"linenetamt" gorm:"column:linenetamt"`
	TaxID             int     `json:"c_tax_id" gorm:"column:c_tax_id"`
	TaxName           string  `json:"tax_name" gorm:"column:tax_name"`
	TaxRate           float64 `json:"tax_rate" gorm:"column:tax_rate"`
	Description       string  `json:"description" gorm:"column:description"`
	RequisitionLineID *int    `json:"m_requisitionline_id" gorm:"column:m_requisitionline_id"`
	RequisitionDocNo  string  `json:"requisition_documentno" gorm:"column:requisition_documentno"`
	IsWithholding     bool    `json:"is_withholding" gorm:"column:is_withholding"`
	WithholdingRate   float64 `json:"withholding_rate" gorm:"column:withholding_rate"`
	WithholdingAmount float64 `json:"withholding_amount" gorm:"column:withholding_amount"`
	ADWIsWithholding  string  `json:"adw_iswithholding" gorm:"column:adw_iswithholding"`
	ADWWithholdingRate float64 `json:"adw_withholdingrate" gorm:"column:withholding_rate"`
	ADWWithholdingAmount float64 `json:"adw_withholdingamount" gorm:"column:withholding_amount"`
}

type OrderTax struct {
	TaxID      int     `json:"c_tax_id" gorm:"column:c_tax_id"`
	TaxName    string  `json:"tax_name" gorm:"column:tax_name"`
	TaxAmt     float64 `json:"taxamt" gorm:"column:taxamt"`
	TaxBaseAmt float64 `json:"taxbaseamt" gorm:"column:taxbaseamt"`
}

type OrderDetailResponse struct {
	Header OrderHeader `json:"header"`
	Lines  []OrderLine `json:"lines"`
	Taxes  []OrderTax  `json:"taxes"`
}

type PriceListOption struct {
	ID        int    `json:"id" gorm:"column:id"`
	Text      string `json:"text" gorm:"column:text"`
	Precision int    `json:"precision" gorm:"column:precision"`
}

type MasterOptionsResponse struct {
	Organizations []SelectOption    `json:"organizations"`
	Warehouses    []SelectOption    `json:"warehouses"`
	PriceLists    []PriceListOption `json:"pricelists"`
	DocTypes      []SelectOption    `json:"doctypes"`
	Priorities    []SelectOption    `json:"priorities"`
	PaymentTerms  []SelectOption    `json:"payment_terms"`
	Taxes         []TaxOption       `json:"taxes"`
	Projects      []SelectOption    `json:"projects"`
	CostCenters   []SelectOption    `json:"cost_centers"`
	Approvers     []SelectOption    `json:"approvers"`
	Users         []SelectOption    `json:"users"`
	Vendors       []VendorOption    `json:"vendors"`
	ClientName    string            `json:"client_name"`
	LogoBase64    string            `json:"logo_base64"`
	AddressLines  []string          `json:"address_lines"`
}

type VendorOption struct {
	ID   int    `json:"id" gorm:"column:id"`
	Text string `json:"text" gorm:"column:text"`
}

type ContactOption struct {
	ID    int    `json:"id" gorm:"column:id"`
	Text  string `json:"text" gorm:"column:text"`
	Name  string `json:"name" gorm:"column:name"`
	Phone string `json:"phone" gorm:"column:phone"`
	Email string `json:"email" gorm:"column:email"`
}

type ProductOption struct {
	ID           int    `json:"id" gorm:"column:id"`
	Text         string `json:"text" gorm:"column:text"`
	UOMID        int    `json:"c_uom_id" gorm:"column:c_uom_id"`
	UOMName      string `json:"uom_name" gorm:"column:uom_name"`
	UOMSymbol    string `json:"uom_symbol" gorm:"column:uom_symbol"`
	UOMPrecision int    `json:"uom_precision" gorm:"column:uom_precision"`
}

type ChargeOption struct {
	ID   int    `json:"id" gorm:"column:id"`
	Text string `json:"text" gorm:"column:text"`
}

type RequisitionLineOption struct {
	ID           int     `json:"id" gorm:"column:id"`
	Text         string  `json:"text" gorm:"column:text"`
	PONumber     string  `json:"po_number" gorm:"column:po_number"`
	ProductName  string  `json:"product_name" gorm:"column:product_name"`
	ProductValue string  `json:"product_value" gorm:"column:product_value"`
	ProductID    int     `json:"m_product_id" gorm:"column:m_product_id"`
	UOMID        int     `json:"c_uom_id" gorm:"column:c_uom_id"`
	UOMName      string  `json:"uom_name" gorm:"column:uom_name"`
	UOMSymbol    string  `json:"uom_symbol" gorm:"column:uom_symbol"`
	UOMPrecision int     `json:"uom_precision" gorm:"column:uom_precision"`
	Qty          float64 `json:"qty" gorm:"column:qty"`
	RemainingQty float64 `json:"remaining_qty" gorm:"column:remaining_qty"`
	CostCenterID int     `json:"c_costcenter_id" gorm:"column:c_costcenter_id"`
	Price        float64 `json:"price" gorm:"column:price"`
	Description  string  `json:"description" gorm:"column:description"`
}

type CreateOrderRequest struct {
	OrgID        int     `json:"org_id" binding:"required"`
	WarehouseID  int     `json:"warehouse_id" binding:"required"`
	BPartnerID   int     `json:"c_bpartner_id" binding:"required"`
	ADUserID     *int    `json:"ad_user_id"`
	DateOrdered  string  `json:"date_ordered" binding:"required"`
	DatePromised string  `json:"date_promised"`
	DocTypeID    int     `json:"doc_type_id" binding:"required"`
	PriceListID  int     `json:"pricelist_id" binding:"required"`
	Description  string  `json:"description"`
	PriorityRule string  `json:"priority_rule"`
	PaymentTermID *int   `json:"c_paymentterm_id"`
	CheckedByID  int     `json:"adw_ad_user_checked_id" binding:"required"`
	ApprovedByID int     `json:"adw_ad_user_approved_id" binding:"required"`
	TaxID        int     `json:"c_tax_id" binding:"required"`
	CostCenterID *int    `json:"c_costcenter_id"`
	ProjectID    *int    `json:"c_project_id"`
}

type UpdateOrderRequest struct {
	OrgID        int     `json:"org_id"`
	WarehouseID  int     `json:"warehouse_id"`
	BPartnerID   int     `json:"c_bpartner_id"`
	ADUserID     *int    `json:"ad_user_id"`
	DateOrdered  string  `json:"date_ordered"`
	DatePromised string  `json:"date_promised"`
	DocTypeID    int     `json:"doc_type_id"`
	PriceListID  int     `json:"pricelist_id"`
	Description  string  `json:"description"`
	PriorityRule string  `json:"priority_rule"`
	PaymentTermID *int   `json:"c_paymentterm_id"`
	CheckedByID  int     `json:"adw_ad_user_checked_id"`
	ApprovedByID int     `json:"adw_ad_user_approved_id"`
	TaxID        int     `json:"c_tax_id"`
	CostCenterID *int    `json:"c_costcenter_id"`
	ProjectID    *int    `json:"c_project_id"`
}

type CreateOrderLineRequest struct {
	ProductID         *int    `json:"m_product_id"`
	ChargeID          *int    `json:"c_charge_id"`
	Qty               float64 `json:"qty" binding:"required"`
	Price             float64 `json:"price" binding:"required"`
	Discount          float64 `json:"discount"`
	TaxID             int     `json:"c_tax_id" binding:"required"`
	UOMID             *int    `json:"c_uom_id"`
	Description       string  `json:"description"`
	RequisitionLineID *int    `json:"m_requisitionline_id"`
	IsWithholding     bool    `json:"is_withholding"`
	WithholdingRate   float64 `json:"withholding_rate"`
}

type UpdateOrderLineRequest struct {
	ProductID         *int    `json:"m_product_id"`
	ChargeID          *int    `json:"c_charge_id"`
	Qty               float64 `json:"qty" binding:"required"`
	Price             float64 `json:"price" binding:"required"`
	Discount          float64 `json:"discount"`
	TaxID             int     `json:"c_tax_id" binding:"required"`
	UOMID             *int    `json:"c_uom_id"`
	Description       string  `json:"description"`
	RequisitionLineID *int    `json:"m_requisitionline_id"`
	IsWithholding     bool    `json:"is_withholding"`
	WithholdingRate   float64 `json:"withholding_rate"`
}

type LinkedRequisitionLineItem struct {
	LineID       int      `json:"m_requisitionline_id" gorm:"column:m_requisitionline_id"`
	Line         int      `json:"line" gorm:"column:line"`
	ProductCode  string   `json:"product_code" gorm:"column:product_code"`
	ProductName  string   `json:"product_name" gorm:"column:product_name"`
	Description  string   `json:"description" gorm:"column:description"`
	Qty          float64  `json:"qty" gorm:"column:qty"`
	PriceActual  float64  `json:"priceactual" gorm:"column:priceactual"`
	LineNetAmt   float64  `json:"linenetamt" gorm:"column:linenetamt"`
	UOMSymbol    string   `json:"uom_symbol" gorm:"column:uom_symbol"`
	UOMName      string   `json:"uom_name" gorm:"column:uom_name"`
	VendorName   string   `json:"vendor_name" gorm:"column:vendor_name"`
	POLineID     *int     `json:"c_orderline_id" gorm:"column:c_orderline_id"`
	POLineNo     *int     `json:"po_line_no" gorm:"column:po_line_no"`
	POQty        *float64 `json:"po_qty" gorm:"column:po_qty"`
}

type LinkedRequisitionItem struct {
	MRequisitionID int                         `json:"m_requisition_id" gorm:"column:m_requisition_id"`
	DocumentNo     string                      `json:"documentno" gorm:"column:documentno"`
	Description    string                      `json:"description" gorm:"column:description"`
	DateDoc        string                      `json:"datedoc" gorm:"column:datedoc"`
	DateRequired   string                      `json:"daterequired" gorm:"column:daterequired"`
	DocStatus      string                      `json:"docstatus" gorm:"column:docstatus"`
	DocStatusLabel string                      `json:"docstatus_label" gorm:"column:docstatus_label"`
	TotalLines     float64                     `json:"totallines" gorm:"column:totallines"`
	RequesterName  string                      `json:"requester_name" gorm:"column:requester_name"`
	OrgName        string                      `json:"org_name" gorm:"column:org_name"`
	Lines          []LinkedRequisitionLineItem `json:"lines" gorm:"-"`
}

type LinkedReceiptLineItem struct {
	MInOutLineID int      `json:"m_inoutline_id" gorm:"column:m_inoutline_id"`
	Line         int      `json:"line" gorm:"column:line"`
	ProductID    *int     `json:"m_product_id" gorm:"column:m_product_id"`
	ProductCode  string   `json:"product_code" gorm:"column:product_code"`
	ProductName  string   `json:"product_name" gorm:"column:product_name"`
	Description  string   `json:"description" gorm:"column:description"`
	MovementQty  float64  `json:"movementqty" gorm:"column:movementqty"`
	QtyEntered   float64  `json:"qtyentered" gorm:"column:qtyentered"`
	UOMSymbol    string   `json:"uom_symbol" gorm:"column:uom_symbol"`
	UOMName      string   `json:"uom_name" gorm:"column:uom_name"`
	UOMPrecision int      `json:"uom_precision" gorm:"column:uom_precision"`
	LocatorValue string   `json:"locator_value" gorm:"column:locator_value"`
	POLineID     *int     `json:"c_orderline_id" gorm:"column:c_orderline_id"`
	POLineNo     *int     `json:"po_line_no" gorm:"column:po_line_no"`
	POQty        *float64 `json:"po_qty" gorm:"column:po_qty"`
}

type LinkedReceiptItem struct {
	MInOutID       int                     `json:"m_inout_id" gorm:"column:m_inout_id"`
	DocumentNo     string                  `json:"documentno" gorm:"column:documentno"`
	Description    string                  `json:"description" gorm:"column:description"`
	MovementDate   string                  `json:"movementdate" gorm:"column:movementdate"`
	DateOrdered    string                  `json:"dateordered" gorm:"column:dateordered"`
	DocStatus      string                  `json:"docstatus" gorm:"column:docstatus"`
	DocStatusLabel string                  `json:"docstatus_label" gorm:"column:docstatus_label"`
	POReference    string                  `json:"poreference" gorm:"column:poreference"`
	DOReference    string                  `json:"doreference" gorm:"column:doreference"`
	SPPNo          string                  `json:"sppno" gorm:"column:sppno"`
	CreatorName    string                  `json:"creator_name" gorm:"column:creator_name"`
	OrgName        string                  `json:"org_name" gorm:"column:org_name"`
	VendorName     string                  `json:"vendor_name" gorm:"column:vendor_name"`
	WarehouseName  string                  `json:"warehouse_name" gorm:"column:warehouse_name"`
	DocTypeName    string                  `json:"doctype_name" gorm:"column:doctype_name"`
	TotalQty       float64                 `json:"total_qty" gorm:"-"`
	Lines          []LinkedReceiptLineItem `json:"lines" gorm:"-"`
}
