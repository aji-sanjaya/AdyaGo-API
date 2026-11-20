package ai

import (
	"encoding/json"
	"fmt"

	"factoryhub-go/internal/database"
	"gorm.io/gorm"
)

type ToolRegistry struct {
	db    *gorm.DB
	tools []Tool
}

func NewToolRegistry(dbInstance *database.DBInstance) *ToolRegistry {
	r := &ToolRegistry{db: dbInstance.DB}
	r.register()
	return r
}

func (r *ToolRegistry) GetTools() []Tool {
	return r.tools
}

func (r *ToolRegistry) register() {
	r.tools = []Tool{
		{
			Type: "function",
			Function: ToolFunction{
				Name:        "query_purchase_orders",
				Description: "Ambil daftar Purchase Order dari iDempiere. Bisa filter berdasarkan status, vendor, atau tanggal.",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"status": map[string]interface{}{
							"type":        "string",
							"description": "Status dokumen: DR (Draft), CO (Completed), VO (Voided), semua jika kosong",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "Jumlah data yang diambil, default 10",
						},
					},
					"required": []string{},
				},
			},
		},
		{
			Type: "function",
			Function: ToolFunction{
				Name:        "query_requisitions",
				Description: "Ambil daftar Purchase Requisition (PR) dari iDempiere.",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"status": map[string]interface{}{
							"type":        "string",
							"description": "Status dokumen: DR (Draft), CO (Completed), semua jika kosong",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "Jumlah data yang diambil, default 10",
						},
					},
					"required": []string{},
				},
			},
		},
		{
			Type: "function",
			Function: ToolFunction{
				Name:        "query_vendors",
				Description: "Cari data vendor/supplier dari iDempiere berdasarkan nama.",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"name": map[string]interface{}{
							"type":        "string",
							"description": "Nama vendor yang dicari (partial match)",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "Jumlah data yang diambil, default 10",
						},
					},
					"required": []string{},
				},
			},
		},
		{
			Type: "function",
			Function: ToolFunction{
				Name:        "query_products",
				Description: "Cari data produk/item dari iDempiere berdasarkan nama atau kode.",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"search": map[string]interface{}{
							"type":        "string",
							"description": "Nama atau kode produk yang dicari (partial match)",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "Jumlah data yang diambil, default 10",
						},
					},
					"required": []string{},
				},
			},
		},
	}
}

func (r *ToolRegistry) Execute(name, argsJSON string) (string, error) {
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("parse args: %w", err)
	}

	switch name {
	case "query_purchase_orders":
		return r.queryPurchaseOrders(args)
	case "query_requisitions":
		return r.queryRequisitions(args)
	case "query_vendors":
		return r.queryVendors(args)
	case "query_products":
		return r.queryProducts(args)
	default:
		return "", fmt.Errorf("unknown tool: %s", name)
	}
}

func getLimit(args map[string]interface{}, def int) int {
	if v, ok := args["limit"]; ok {
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		}
	}
	return def
}

func (r *ToolRegistry) queryPurchaseOrders(args map[string]interface{}) (string, error) {
	limit := getLimit(args, 10)
	status, _ := args["status"].(string)

	query := r.db.Raw(`
		SELECT o.documentno, o.dateordered, o.docstatus,
		       bp.name AS vendor, o.grandtotal, o.c_currency_id
		FROM c_order o
		JOIN c_bpartner bp ON bp.c_bpartner_id = o.c_bpartner_id
		WHERE o.issotrx = 'N' AND o.isactive = 'Y'
		  AND (? = '' OR o.docstatus = ?)
		ORDER BY o.dateordered DESC
		LIMIT ?`, status, status, limit)

	var rows []map[string]interface{}
	if err := query.Scan(&rows).Error; err != nil {
		return "", fmt.Errorf("query PO: %w", err)
	}

	result, _ := json.Marshal(rows)
	return string(result), nil
}

func (r *ToolRegistry) queryRequisitions(args map[string]interface{}) (string, error) {
	limit := getLimit(args, 10)
	status, _ := args["status"].(string)

	query := r.db.Raw(`
		SELECT r.documentno, r.datedoc, r.docstatus,
		       r.description, r.totallines
		FROM m_requisition r
		WHERE r.isactive = 'Y'
		  AND (? = '' OR r.docstatus = ?)
		ORDER BY r.datedoc DESC
		LIMIT ?`, status, status, limit)

	var rows []map[string]interface{}
	if err := query.Scan(&rows).Error; err != nil {
		return "", fmt.Errorf("query requisition: %w", err)
	}

	result, _ := json.Marshal(rows)
	return string(result), nil
}

func (r *ToolRegistry) queryVendors(args map[string]interface{}) (string, error) {
	limit := getLimit(args, 10)
	name, _ := args["name"].(string)

	query := r.db.Raw(`
		SELECT bp.value AS code, bp.name, bp.taxid,
		       bp.phone, bp.email, bp.isactive
		FROM c_bpartner bp
		WHERE bp.isvendor = 'Y' AND bp.isactive = 'Y'
		  AND (? = '' OR LOWER(bp.name) LIKE LOWER('%' || ? || '%'))
		ORDER BY bp.name
		LIMIT ?`, name, name, limit)

	var rows []map[string]interface{}
	if err := query.Scan(&rows).Error; err != nil {
		return "", fmt.Errorf("query vendor: %w", err)
	}

	result, _ := json.Marshal(rows)
	return string(result), nil
}

func (r *ToolRegistry) queryProducts(args map[string]interface{}) (string, error) {
	limit := getLimit(args, 10)
	search, _ := args["search"].(string)

	query := r.db.Raw(`
		SELECT p.value AS code, p.name, p.description,
		       p.producttype, p.isactive
		FROM m_product p
		WHERE p.isactive = 'Y'
		  AND (? = '' OR LOWER(p.name) LIKE LOWER('%' || ? || '%')
		       OR LOWER(p.value) LIKE LOWER('%' || ? || '%'))
		ORDER BY p.name
		LIMIT ?`, search, search, search, limit)

	var rows []map[string]interface{}
	if err := query.Scan(&rows).Error; err != nil {
		return "", fmt.Errorf("query product: %w", err)
	}

	result, _ := json.Marshal(rows)
	return string(result), nil
}
