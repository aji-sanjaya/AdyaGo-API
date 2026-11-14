package order

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"factoryhub-go/internal/security"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	orderGroup := rg.Group("/orders")
	{
		orderGroup.GET("", h.GetOrders)
		orderGroup.GET("/options", h.GetMasterOptions)
		orderGroup.GET("/vendors", h.GetVendors)
		orderGroup.GET("/contacts", h.GetContacts)
		orderGroup.GET("/products", h.GetProducts)
		orderGroup.GET("/charges", h.GetCharges)
		orderGroup.GET("/requisition-lines", h.GetRequisitionLines)
		orderGroup.GET("/requisition-line/:id", h.GetRequisitionLineDetail)
		orderGroup.GET("/:id", h.GetOrderDetail)
		orderGroup.GET("/:id/lines", h.GetOrderLines)
		orderGroup.GET("/:id/counts", h.GetOrderCounts)
		orderGroup.POST("", h.CreateOrder)
		orderGroup.PUT("/:id", h.UpdateOrder)
		orderGroup.DELETE("/:id", h.DeleteOrder)
		orderGroup.POST("/:id/lines", h.CreateOrderLine)
		orderGroup.PUT("/:id/lines/:line_id", h.UpdateOrderLine)
		orderGroup.DELETE("/:id/lines/:line_id", h.DeleteOrderLine)
		orderGroup.POST("/:id/process", h.ProcessOrder)

		// Attachments
		orderGroup.GET("/:id/attachments", h.GetAttachments)
		orderGroup.POST("/:id/attachments", h.UploadAttachment)
		orderGroup.GET("/:id/attachments/:filename", h.DownloadAttachment)
		orderGroup.DELETE("/:id/attachments/:filename", h.DeleteAttachment)

		// Chat
		orderGroup.GET("/:id/chat", h.GetChat)
		orderGroup.POST("/:id/chat", h.SendChatMessage)
		orderGroup.GET("/chat/attachments/:chatentry_id/:filename", h.GetChatAttachment)

		// Change Logs
		orderGroup.GET("/:id/changelogs", h.GetChangeLogs)

		// Linked Requisitions & Receipts
		orderGroup.GET("/:id/requisitions", h.GetLinkedRequisitions)
		orderGroup.GET("/:id/receipts", h.GetLinkedReceipts)
	}
}

func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return ""
}

func (h *Handler) respondError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	errStr := err.Error()
	if strings.Contains(errStr, "401") || strings.Contains(errStr, "Token has expired") {
		status = http.StatusUnauthorized
	}
	c.JSON(status, gin.H{
		"success": false,
		"message": errStr,
		"error":   errStr,
	})
}

func (h *Handler) GetOrders(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))
	search := c.Query("search")
	status := c.Query("status")
	costCenterID, _ := strconv.Atoi(c.Query("cost_center_id"))
	bpartnerID, _ := strconv.Atoi(c.Query("c_bpartner_id"))
	if bpartnerID == 0 {
		bpartnerID, _ = strconv.Atoi(c.Query("bpartner_id"))
	}
	createdByID, _ := strconv.Atoi(c.Query("created_by"))
	if createdByID == 0 {
		createdByID, _ = strconv.Atoi(c.Query("createdby"))
	}
	description := c.Query("description")
	dateStart := c.Query("date_start")
	dateEnd := c.Query("date_end")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sortBy := c.Query("sort_by")
	sortDir := c.Query("sort_dir")

	resp, err := h.service.GetOrders(clientID, orgID, search, status, costCenterID, bpartnerID, createdByID, description, dateStart, dateEnd, page, limit, sortBy, sortDir)
	if err != nil {
		log.Printf("[Error] GetOrders failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
	})
}

func (h *Handler) GetMasterOptions(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))
	roleID, _ := strconv.Atoi(c.Query("role_id"))

	resp, err := h.service.GetMasterOptions(clientID, orgID, roleID)
	if err != nil {
		log.Printf("[Error] GetMasterOptions failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
	})
}

func (h *Handler) GetVendors(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))

	vendors, hasMore, err := h.service.GetVendors(clientID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     vendors,
		"has_more": hasMore,
		"page":     page,
	})
}

func (h *Handler) GetContacts(c *gin.Context) {
	bpartnerID, _ := strconv.Atoi(c.Query("bpartner_id"))
	if bpartnerID == 0 {
		bpartnerID, _ = strconv.Atoi(c.Query("c_bpartner_id"))
	}
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	contacts, err := h.service.GetContacts(bpartnerID, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": contacts,
	})
}

func (h *Handler) GetProducts(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))

	products, hasMore, err := h.service.GetProducts(clientID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     products,
		"has_more": hasMore,
		"page":     page,
	})
}

func (h *Handler) GetCharges(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))

	charges, hasMore, err := h.service.GetCharges(clientID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     charges,
		"has_more": hasMore,
		"page":     page,
	})
}

func (h *Handler) GetRequisitionLines(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	costCenterID, _ := strconv.Atoi(c.Query("cost_center_id"))
	if costCenterID == 0 {
		costCenterID, _ = strconv.Atoi(c.Query("c_costcenter_id"))
	}
	orderID, _ := strconv.Atoi(c.Query("order_id"))
	if orderID == 0 {
		orderID, _ = strconv.Atoi(c.Query("c_order_id"))
	}
	prNumber := c.Query("pr_number")
	if prNumber == "" {
		prNumber = c.Query("documentno")
	}
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))

	lines, hasMore, err := h.service.GetRequisitionLines(clientID, costCenterID, orderID, prNumber, search, page, limit)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"data":     []RequisitionLineOption{},
			"has_more": false,
			"page":     page,
			"error":    err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     lines,
		"has_more": hasMore,
		"page":     page,
	})
}

func (h *Handler) GetRequisitionLineDetail(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid requisition line ID"})
		return
	}

	line, err := h.service.GetRequisitionLineDetail(clientID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": line,
	})
}

func (h *Handler) GetOrderDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	detail, err := h.service.GetOrderDetail(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": detail,
	})
}

func (h *Handler) GetOrderLines(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	lines, err := h.service.GetOrderLines(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": lines,
	})
}

func (h *Handler) CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientID, _ := strconv.Atoi(c.Query("client_id"))
	userID, _ := strconv.Atoi(c.Query("user_id"))
	token := extractToken(c)

	orderID, err := h.service.CreateOrder(&req, clientID, userID, token)
	if err != nil {
		log.Printf("[Error] CreateOrder failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Purchase order created successfully",
		"id":      orderID,
	})
}

func (h *Handler) UpdateOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token := extractToken(c)
	if err := h.service.UpdateOrder(id, &req, token); err != nil {
		log.Printf("[Error] UpdateOrder failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase order updated successfully",
	})
}

func (h *Handler) DeleteOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	token := extractToken(c)
	if err := h.service.DeleteOrder(id, token); err != nil {
		log.Printf("[Error] DeleteOrder failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase order deleted successfully",
	})
}

func (h *Handler) CreateOrderLine(c *gin.Context) {
	orderID, err := strconv.Atoi(c.Param("id"))
	if err != nil || orderID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req CreateOrderLineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientID, _ := strconv.Atoi(c.Query("client_id"))
	token := extractToken(c)

	lineID, err := h.service.CreateOrderLine(orderID, &req, clientID, token)
	if err != nil {
		log.Printf("[Error] CreateOrderLine failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Order line added successfully",
		"id":      lineID,
	})
}

func (h *Handler) UpdateOrderLine(c *gin.Context) {
	orderID, err := strconv.Atoi(c.Param("id"))
	if err != nil || orderID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	lineID, err := strconv.Atoi(c.Param("line_id"))
	if err != nil || lineID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid line ID"})
		return
	}

	var req UpdateOrderLineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token := extractToken(c)
	if err := h.service.UpdateOrderLine(orderID, lineID, &req, token); err != nil {
		log.Printf("[Error] UpdateOrderLine failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order line updated successfully",
	})
}

func (h *Handler) DeleteOrderLine(c *gin.Context) {
	orderID, err := strconv.Atoi(c.Param("id"))
	if err != nil || orderID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	lineID, err := strconv.Atoi(c.Param("line_id"))
	if err != nil || lineID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid line ID"})
		return
	}

	token := extractToken(c)
	if err := h.service.DeleteOrderLine(orderID, lineID, token); err != nil {
		log.Printf("[Error] DeleteOrderLine failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order line deleted successfully",
	})
}

func (h *Handler) ProcessOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var payload struct {
		DocAction string `json:"doc_action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token := extractToken(c)
	if err := h.service.ProcessOrder(id, payload.DocAction, token); err != nil {
		log.Printf("[Error] ProcessOrder failed: %v", err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document processed successfully",
	})
}

func (h *Handler) GetOrderCounts(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid order ID.",
		})
		return
	}

	counts, err := h.service.GetOrderCounts(id)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    counts,
	})
}

func (h *Handler) GetAttachments(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	atts, err := h.service.GetAttachments(id)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": atts,
	})
}

func (h *Handler) UploadAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	token := extractToken(c)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Security verification: extension whitelist, magic bytes, path traversal sanitization, max size
	sanitizedName, _, err := security.ValidateAttachment(header.Filename, fileBytes, 10*1024*1024)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
			"message": err.Error(),
		})
		return
	}

	res, err := h.service.UploadAttachment(token, id, sanitizedName, fileBytes)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Attachment uploaded successfully",
		"data":    res,
	})
}

func (h *Handler) DownloadAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	fileName := c.Param("filename")

	data, mime, err := h.service.DownloadAttachment(id, fileName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Data(http.StatusOK, mime, data)
}

func (h *Handler) DeleteAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	fileName := c.Param("filename")
	token := extractToken(c)

	if err := h.service.DeleteAttachment(token, id, fileName); err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Attachment deleted successfully",
	})
}

func (h *Handler) GetChat(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	chat, err := h.service.GetChat(id)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": chat,
	})
}

func (h *Handler) SendChatMessage(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	clientID, _ := strconv.Atoi(c.PostForm("client_id"))
	userID, _ := strconv.Atoi(c.PostForm("user_id"))
	message := c.PostForm("message")
	token := extractToken(c)

	var fileData []byte
	var fileName string
	file, header, err := c.Request.FormFile("image")
	if err == nil && file != nil {
		defer file.Close()
		fb, err := io.ReadAll(file)
		if err == nil && len(fb) > 0 {
			// Security verification specifically for chat image attachment (max 5MB)
			sanitizedName, _, vErr := security.ValidateImageAttachment(header.Filename, fb, 5*1024*1024)
			if vErr != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"error":   vErr.Error(),
					"message": vErr.Error(),
				})
				return
			}
			fileName = sanitizedName
			fileData = fb
		}
	}

	if err := h.service.SendChatMessage(token, id, clientID, userID, message, fileData, fileName); err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Message sent",
	})
}

func (h *Handler) GetChatAttachment(c *gin.Context) {
	chatEntryID, _ := strconv.Atoi(c.Param("chatentry_id"))
	fileName := c.Param("filename")

	data, mime, err := h.service.GetChatAttachmentContent(chatEntryID, fileName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Header("X-Content-Type-Options", "nosniff")
	if !strings.HasPrefix(mime, "image/") || strings.Contains(mime, "svg") {
		mime = "application/octet-stream"
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filepath.Base(fileName)))
	} else {
		c.Header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
		c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filepath.Base(fileName)))
	}
	c.Data(http.StatusOK, mime, data)
}

func (h *Handler) GetChangeLogs(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	logs, err := h.service.GetChangeLogs(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
	})
}

func (h *Handler) GetLinkedRequisitions(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	reqs, err := h.service.GetLinkedRequisitions(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": reqs,
	})
}

func (h *Handler) GetLinkedReceipts(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	rcpts, err := h.service.GetLinkedReceipts(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": rcpts,
	})
}
