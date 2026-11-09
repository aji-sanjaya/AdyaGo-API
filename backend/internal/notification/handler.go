package notification

import (
	"net/http"
	"strconv"

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
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))

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

