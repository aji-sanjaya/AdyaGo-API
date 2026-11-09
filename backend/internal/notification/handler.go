package notification

import (
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
	notifGroup := rg.Group("/notifications")
	{
		notifGroup.GET("", h.GetNotifications)
	}
}

func (h *Handler) GetNotifications(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	userID, _ := strconv.Atoi(c.Query("user_id"))
	username := strings.TrimSpace(c.Query("username"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))

	// If userID is 0, attempt fallback resolution by username
	if userID == 0 && username != "" {
		resolvedID, err := h.service.ResolveUserID(username)
		if err == nil && resolvedID > 0 {
			userID = resolvedID
		}
	}

	res, err := h.service.GetNotifications(clientID, userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch notifications: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

