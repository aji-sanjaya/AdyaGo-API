package requisition

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	reqGroup := rg.Group("/requisitions")
	{
		reqGroup.GET("", h.GetRequisitions)
		reqGroup.GET("/options", h.GetMasterOptions)
		reqGroup.GET("/products", h.SearchProducts)
		reqGroup.GET("/:id", h.GetRequisitionDetail)
		reqGroup.GET("/:id/lines", h.GetRequisitionLines)
		reqGroup.POST("", h.CreateRequisition)
		reqGroup.PUT("/:id", h.UpdateRequisition)
		reqGroup.DELETE("/:id", h.DeleteRequisition)
		reqGroup.POST("/:id/lines", h.CreateRequisitionLine)
		reqGroup.PUT("/:id/lines/:line_id", h.UpdateRequisitionLine)
		reqGroup.DELETE("/:id/lines/:line_id", h.DeleteRequisitionLine)
		reqGroup.POST("/:id/process", h.ProcessRequisition)

		// Attachments
		reqGroup.GET("/:id/attachments", h.GetAttachments)
		reqGroup.POST("/:id/attachments", h.UploadAttachment)
		reqGroup.GET("/:id/attachments/:filename", h.DownloadAttachment)
		reqGroup.DELETE("/:id/attachments/:filename", h.DeleteAttachment)

		// Chat
		reqGroup.GET("/:id/chat", h.GetChat)
		reqGroup.POST("/:id/chat", h.SendChatMessage)
		reqGroup.GET("/chat/attachments/:chatentry_id/:filename", h.GetChatAttachment)

		// Change Logs
		reqGroup.GET("/:id/changelogs", h.GetChangeLogs)

		// Linked Purchase Orders
		reqGroup.GET("/:id/orders", h.GetOrders)
	}
}

func (h *Handler) GetRequisitions(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))
	search := c.Query("search")
	status := c.Query("status")
	costCenterID, _ := strconv.Atoi(c.Query("cost_center_id"))
	dateStart := c.Query("date_start")
	dateEnd := c.Query("date_end")
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	sortBy := c.Query("sort_by")
	sortDir := c.Query("sort_dir")

	res, err := h.service.GetRequisitions(clientID, orgID, search, status, costCenterID, dateStart, dateEnd, page, limit, sortBy, sortDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *Handler) GetRequisitionDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	detail, err := h.service.GetRequisitionDetail(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

func (h *Handler) GetRequisitionLines(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID",
		})
		return
	}

	lines, err := h.service.GetRequisitionLines(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    lines,
	})
}

func (h *Handler) GetMasterOptions(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))

	opts, err := h.service.GetMasterOptions(clientID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    opts,
	})
}

func (h *Handler) SearchProducts(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	query := c.Query("q")

	products, err := h.service.SearchProducts(clientID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    products,
	})
}

func (h *Handler) extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return c.Query("token")
}

func (h *Handler) CreateRequisition(c *gin.Context) {
	token := h.extractToken(c)
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	userID, _ := strconv.Atoi(c.Query("user_id"))

	var req CreateRequisitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed: Please ensure all required fields are filled correctly.",
			"error":   err.Error(),
		})
		return
	}

	res, err := h.service.CreateRequisition(token, clientID, userID, req)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Purchase Requisition created successfully.",
		"data":    res,
	})
}

func (h *Handler) CreateRequisitionLine(c *gin.Context) {
	token := h.extractToken(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	var req CreateRequisitionLineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed: Product and quantity are required.",
			"error":   err.Error(),
		})
		return
	}

	res, err := h.service.CreateRequisitionLine(token, id, req)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Requisition line item added successfully.",
		"data":    res,
	})
}

func (h *Handler) UpdateRequisitionLine(c *gin.Context) {
	token := h.extractToken(c)
	lineID, err := strconv.Atoi(c.Param("line_id"))
	if err != nil || lineID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition line ID.",
		})
		return
	}

	var req CreateRequisitionLineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed: Product and quantity are required.",
			"error":   err.Error(),
		})
		return
	}

	res, err := h.service.UpdateRequisitionLine(token, lineID, req)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Requisition line item updated successfully.",
		"data":    res,
	})
}

func (h *Handler) DeleteRequisitionLine(c *gin.Context) {
	token := h.extractToken(c)
	lineID, err := strconv.Atoi(c.Param("line_id"))
	if err != nil || lineID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition line ID.",
		})
		return
	}

	if err := h.service.DeleteRequisitionLine(token, lineID); err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Requisition line item deleted successfully.",
	})
}

func (h *Handler) ProcessRequisition(c *gin.Context) {
	token := h.extractToken(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	var req ProcessRequisitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed: DocAction is required (e.g. CO, VO, PR, RE).",
			"error":   err.Error(),
		})
		return
	}

	res, err := h.service.ProcessRequisition(token, id, req.DocAction)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Requisition status updated successfully.",
		"data":    res,
	})
}

func (h *Handler) UpdateRequisition(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	var req CreateRequisitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	token := h.extractToken(c)
	log.Printf("[UpdateRequisition] Processing update for requisition ID %d (token len=%d)", id, len(token))
	res, err := h.service.UpdateRequisition(token, id, req)
	if err != nil {
		log.Printf("[UpdateRequisition] ERROR updating requisition %d: %v", id, err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Requisition updated successfully.",
		"data":    res,
	})
}

func (h *Handler) DeleteRequisition(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	token := h.extractToken(c)
	log.Printf("[DeleteRequisition] Deleting requisition ID %d", id)
	if err := h.service.DeleteRequisition(token, id); err != nil {
		log.Printf("[DeleteRequisition] ERROR deleting requisition %d: %v", id, err)
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Requisition document deleted successfully.",
	})
}

func (h *Handler) respondError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "Token has expired") {
		status = http.StatusUnauthorized
	}
	c.JSON(status, gin.H{
		"success": false,
		"message": err.Error(),
	})
}

func (h *Handler) GetAttachments(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	attachments, err := h.service.GetRequisitionAttachments(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    attachments,
	})
}

func (h *Handler) UploadAttachment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "File is required.",
		})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to read file.",
		})
		return
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to read file content.",
		})
		return
	}

	token := h.extractToken(c)
	res, err := h.service.UploadRequisitionAttachment(token, id, fileHeader.Filename, fileBytes)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Attachment uploaded successfully.",
		"data":    res,
	})
}

func (h *Handler) DownloadAttachment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Filename is required.",
		})
		return
	}

	data, mime, err := h.service.GetAttachmentFileContent(id, filename)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	isInline := c.Query("download") != "true"
	disposition := "inline"
	if !isInline {
		disposition = "attachment"
	}

	c.Writer.Header().Del("X-Frame-Options")
	c.Header("Content-Security-Policy", "frame-ancestors *")
	c.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, filename))
	c.Data(http.StatusOK, mime, data)
}

func (h *Handler) DeleteAttachment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Filename is required.",
		})
		return
	}

	token := h.extractToken(c)
	if err := h.service.DeleteRequisitionAttachment(token, id, filename); err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Attachment deleted successfully.",
	})
}

func (h *Handler) GetChat(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	chats, err := h.service.GetRequisitionChat(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    chats,
	})
}

func (h *Handler) SendChatMessage(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	message := strings.TrimSpace(c.PostForm("message"))

	// Check if JSON body was sent instead of Form
	if message == "" && strings.Contains(c.ContentType(), "application/json") {
		var req struct {
			Message string `json:"message"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			message = strings.TrimSpace(req.Message)
		}
	}

	var fileName string
	var fileBytes []byte

	fileHeader, err := c.FormFile("image")
	if err == nil && fileHeader != nil {
		f, err := fileHeader.Open()
		if err == nil {
			defer f.Close()
			fb, err := io.ReadAll(f)
			if err == nil {
				fileName = fileHeader.Filename
				fileBytes = fb
			}
		}
	}

	if message == "" && len(fileBytes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Message text or image attachment is required.",
		})
		return
	}

	token := h.extractToken(c)
	res, err := h.service.SendChatMessage(token, id, message, fileName, fileBytes)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Message sent successfully.",
		"data":    res,
	})
}

func (h *Handler) GetChatAttachment(c *gin.Context) {
	chatEntryID, err := strconv.Atoi(c.Param("chatentry_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid chat entry ID.",
		})
		return
	}

	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Filename is required.",
		})
		return
	}

	data, mime, err := h.service.GetChatAttachmentContent(chatEntryID, filename)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.Writer.Header().Del("X-Frame-Options")
	c.Header("Content-Security-Policy", "frame-ancestors *")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Data(http.StatusOK, mime, data)
}

func (h *Handler) GetChangeLogs(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	logs, err := h.service.GetRequisitionChangeLogs(id)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
		"total":   len(logs),
	})
}

func (h *Handler) GetOrders(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid requisition ID.",
		})
		return
	}

	orders, err := h.service.GetRequisitionOrders(id)
	if err != nil {
		h.respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
		"total":   len(orders),
	})
}


