package requisition

import "time"

type RequisitionStats struct {
	TotalMonth int `json:"total_month"`
	Completed  int `json:"completed"`
	InProgress int `json:"in_progress"`
	Draft      int `json:"draft"`
}

type RequisitionListItem struct {
	ID             int       `json:"id" gorm:"column:id"`
	ClientID       int       `json:"client_id" gorm:"column:ad_client_id"`
	DocumentNo     string    `json:"documentno" gorm:"column:documentno"`
	DateDoc        time.Time `json:"datedoc" gorm:"column:datedoc"`
	DateRequired   time.Time `json:"daterequired" gorm:"column:daterequired"`
	DocStatus      string    `json:"docstatus" gorm:"column:docstatus"`
	StatusLabel    string    `json:"status_label" gorm:"column:status_label"`
	OrgID          int       `json:"org_id" gorm:"column:org_id"`
	OrgName        string    `json:"org_name" gorm:"column:org_name"`
	WarehouseID    int       `json:"warehouse_id" gorm:"column:warehouse_id"`
	WarehouseName  string    `json:"warehouse_name" gorm:"column:warehouse_name"`
	CostCenterID   *int      `json:"cost_center_id" gorm:"column:cost_center_id"`
	CostCenterName string    `json:"cost_center_name" gorm:"column:cost_center_name"`
	DepartmentID   *int      `json:"department_id" gorm:"column:department_id"`
	DepartmentName string    `json:"department_name" gorm:"column:department_name"`
	Description    string    `json:"description" gorm:"column:description"`
	TotalLines     float64   `json:"totallines" gorm:"column:totallines"`
	CreatedBy      string    `json:"createdby" gorm:"column:createdby"`
	LineCount      int       `json:"line_count" gorm:"column:line_count"`
	CBPartnerID    *int      `json:"c_bpartner_id" gorm:"column:c_bpartner_id"`
	CustomerName   string    `json:"customer_name" gorm:"column:customer_name"`
	CPeriodID      *int      `json:"c_period_id" gorm:"column:c_period_id"`
	PeriodName     string    `json:"period_name" gorm:"column:period_name"`
	PriceListID        *int      `json:"pricelist_id" gorm:"column:pricelist_id"`
	PriceListName      string    `json:"pricelist_name" gorm:"column:pricelist_name"`
	PriceListPrecision int       `json:"pricelist_precision" gorm:"column:pricelist_precision"`
	PriorityRule       string    `json:"priority_rule" gorm:"column:priority_rule"`
	CheckedByID    *int      `json:"adw_ad_user_checked_id" gorm:"column:adw_ad_user_checked_id"`
	CheckedByName  string    `json:"checked_by_name" gorm:"column:checked_by_name"`
	ApprovedByID   *int      `json:"adw_ad_user_approved_id" gorm:"column:adw_ad_user_approved_id"`
	ApprovedByName string    `json:"approved_by_name" gorm:"column:approved_by_name"`
	CreatedAt          *time.Time `json:"created_at" gorm:"column:created_at"`
	CostCenterValue    string     `json:"cost_center_value" gorm:"column:cost_center_value"`
	CheckedIsApproved  string     `json:"checked_isapproved" gorm:"column:checked_isapproved"`
	CheckedDate        *time.Time `json:"checked_date" gorm:"column:checked_date"`
	ApprovedIsApproved string     `json:"approved_isapproved" gorm:"column:approved_isapproved"`
	ApprovedDate       *time.Time `json:"approved_date" gorm:"column:approved_date"`
	LogoBase64         string     `json:"logo_base64" gorm:"-"`
}

type RequisitionLineItem struct {
	ID             int     `json:"id" gorm:"column:id"`
	RequisitionID  int     `json:"requisition_id" gorm:"column:requisition_id"`
	Line           int     `json:"line" gorm:"column:line"`
	ProductID      int     `json:"product_id" gorm:"column:product_id"`
	ProductCode    string  `json:"product_code" gorm:"column:product_code"`
	ProductName    string  `json:"product_name" gorm:"column:product_name"`
	UOMID          int     `json:"uom_id" gorm:"column:uom_id"`
	UOMName        string  `json:"uom_name" gorm:"column:uom_name"`
	UOMPrecision   int     `json:"uom_precision" gorm:"column:uom_precision"`
	Qty            float64 `json:"qty" gorm:"column:qty"`
	PriceActual    float64 `json:"priceactual" gorm:"column:priceactual"`
	LineNetAmt     float64 `json:"linenetamt" gorm:"column:linenetamt"`
	DateRequired   *time.Time `json:"daterequired" gorm:"column:daterequired"`
	Description    string  `json:"description" gorm:"column:description"`
	TotalOrderedQty float64 `json:"total_ordered_qty" gorm:"column:total_ordered_qty"`
	IsPOLinked      bool    `json:"is_po_linked" gorm:"column:is_po_linked"`
}

type RequisitionDetail struct {
	Header RequisitionListItem   `json:"header"`
	Lines  []RequisitionLineItem `json:"lines"`
}

type AttachmentItem struct {
	AttachmentID int       `json:"attachment_id"`
	RecordID     int       `json:"record_id"`
	FileName     string    `json:"file_name"`
	FileSize     int64     `json:"file_size"`
	MimeType     string    `json:"mime_type"`
	IsImage      bool      `json:"is_image"`
	IsPDF        bool      `json:"is_pdf"`
	CreatedAt    time.Time `json:"created_at"`
	DownloadURL  string    `json:"download_url"`
}

type RequisitionListResponse struct {
	Stats        RequisitionStats      `json:"stats"`
	Requisitions []RequisitionListItem `json:"requisitions"`
	Total        int64                 `json:"total"`
	Page         int                   `json:"page"`
	Limit        int                   `json:"limit"`
}

type DropdownOption struct {
	ID        int    `json:"id" gorm:"column:id"`
	Text      string `json:"text" gorm:"column:text"`
	Precision *int   `json:"precision,omitempty" gorm:"column:precision"`
}

type PriorityOption struct {
	Value string `json:"value" gorm:"column:value"`
	Name  string `json:"name" gorm:"column:name"`
}

type ProductOption struct {
	ID           int     `json:"id" gorm:"column:id"`
	Code         string  `json:"code" gorm:"column:code"`
	Name         string  `json:"name" gorm:"column:name"`
	UOMID        int     `json:"uom_id" gorm:"column:uom_id"`
	UOMName      string  `json:"uom_name" gorm:"column:uom_name"`
	UOMPrecision int     `json:"uom_precision" gorm:"column:uom_precision"`
	PriceList    float64 `json:"price_list" gorm:"column:price_list"`
}

type MasterOptionsResponse struct {
	Organizations []DropdownOption `json:"organizations"`
	Warehouses    []DropdownOption `json:"warehouses"`
	PriceLists    []DropdownOption `json:"pricelists"`
	CostCenters   []DropdownOption `json:"cost_centers"`
	Departments   []DropdownOption `json:"departments"`
	Priorities    []PriorityOption `json:"priorities"`
	Customers     []DropdownOption `json:"customers"`
	Periods       []DropdownOption `json:"periods"`
	Users         []DropdownOption `json:"users"`
	ClientName    string           `json:"client_name"`
	LogoBase64    string           `json:"logo_base64"`
}

type CreateRequisitionRequest struct {
	OrgID         int     `json:"org_id" binding:"required"`
	WarehouseID   int     `json:"warehouse_id" binding:"required"`
	PriceListID   int     `json:"pricelist_id" binding:"required"`
	PriorityRule  string  `json:"priority_rule" binding:"required"`
	DateDoc       string  `json:"datedoc" binding:"required"`       // YYYY-MM-DD
	DateRequired  string  `json:"date_required" binding:"required"` // YYYY-MM-DD
	CostCenterID  *int    `json:"cost_center_id"`
	DepartmentID  *int    `json:"c_department_id"`
	Description   string  `json:"description"`
	CBPartnerID   *int    `json:"c_bpartner_id"`
	CPeriodID     *int    `json:"c_period_id"`
	CheckedByID   *int    `json:"adw_ad_user_checked_id"`
	ApprovedByID  *int    `json:"adw_ad_user_approved_id"`
}

type CreateRequisitionLineRequest struct {
	ProductID   int     `json:"product_id"`
	ProductCode string  `json:"product_code"`
	UOMID       int     `json:"uom_id"`
	Qty         float64 `json:"qty" binding:"required"`
	PriceActual float64 `json:"priceactual"`
	Description string  `json:"description"`
}

type ProcessRequisitionRequest struct {
	DocAction string `json:"doc_action" binding:"required"` // CO, VO, PR, RE
}

type ChatAttachmentItem struct {
	Name     string `json:"name"`
	Size     int64  `json:"size"`
	MimeType string `json:"mime_type"`
	URL      string `json:"url"`
}

type ChatEntryItem struct {
	ID              int                  `json:"id" gorm:"column:cm_chatentry_id"`
	ChatID          int                  `json:"chat_id" gorm:"column:cm_chat_id"`
	Created         time.Time            `json:"created" gorm:"column:created"`
	CreatedBy       int                  `json:"createdby" gorm:"column:createdby"`
	CharacterData   string               `json:"characterdata" gorm:"column:characterdata"`
	UserName        string               `json:"user_name" gorm:"column:user_name"`
	UserDescription string               `json:"user_description" gorm:"column:user_description"`
	Attachments     []ChatAttachmentItem `json:"attachments" gorm:"-"`
}

type ChangeLogItem struct {
	ADChangeLogID int       `json:"ad_changelog_id" gorm:"column:ad_changelog_id"`
	ADTableID     int       `json:"ad_table_id" gorm:"column:ad_table_id"`
	TableName     string    `json:"table_name" gorm:"column:table_name"`
	RecordID      int       `json:"record_id" gorm:"column:record_id"`
	Updated       time.Time `json:"updated" gorm:"column:updated"`
	EventChangeLog string   `json:"eventchangelog" gorm:"column:eventchangelog"`
	OldValue      string    `json:"oldvalue" gorm:"column:oldvalue"`
	NewValue      string    `json:"newvalue" gorm:"column:newvalue"`
	Description   string    `json:"description" gorm:"column:description"`
	ColumnName    string    `json:"columnname" gorm:"column:columnname"`
	ColumnLabel   string    `json:"column_label" gorm:"column:column_label"`
	UpdatedByName string    `json:"updated_by_name" gorm:"column:updated_by_name"`
}

type RequisitionPOLineItem struct {
	ID                int     `json:"id" gorm:"column:id"`
	OrderID           int     `json:"order_id" gorm:"column:order_id"`
	Line              int     `json:"line" gorm:"column:line"`
	RequisitionLineID int     `json:"requisitionline_id" gorm:"column:requisitionline_id"`
	RequisitionLine   int     `json:"requisition_line" gorm:"column:requisition_line"`
	ProductID         int     `json:"product_id" gorm:"column:product_id"`
	ProductCode       string  `json:"product_code" gorm:"column:product_code"`
	ProductName       string  `json:"product_name" gorm:"column:product_name"`
	UOMID             int     `json:"uom_id" gorm:"column:uom_id"`
	UOMName           string  `json:"uom_name" gorm:"column:uom_name"`
	UOMPrecision      int     `json:"uom_precision" gorm:"column:uom_precision"`
	QtyOrdered        float64 `json:"qtyordered" gorm:"column:qtyordered"`
	QtyDelivered      float64 `json:"qtydelivered" gorm:"column:qtydelivered"`
	Description       string  `json:"description" gorm:"column:description"`
}

type RequisitionPOItem struct {
	ID           int                     `json:"id" gorm:"column:id"`
	DocumentNo   string                  `json:"documentno" gorm:"column:documentno"`
	DateOrdered  time.Time               `json:"dateordered" gorm:"column:dateordered"`
	BPartnerID   *int                    `json:"bpartner_id" gorm:"column:bpartner_id"`
	BPartnerName string                  `json:"bpartner_name" gorm:"column:bpartner_name"`
	DocStatus    string                  `json:"docstatus" gorm:"column:docstatus"`
	StatusLabel  string                  `json:"status_label" gorm:"column:status_label"`
	Description  string                  `json:"description" gorm:"column:description"`
	TotalLines   int                     `json:"total_lines" gorm:"-"`
	Lines        []RequisitionPOLineItem `json:"lines" gorm:"-"`
}

