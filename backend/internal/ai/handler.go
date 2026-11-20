package ai

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	ai := r.Group("/ai")
	{
		ai.POST("/chat", h.Chat)
	}
}

type ChatHTTPRequest struct {
	Message string            `json:"message" binding:"required"`
	History []ChatHistoryItem `json:"history"`
}

type ChatResponseBody struct {
	Reply string `json:"reply"`
}

func (h *Handler) Chat(c *gin.Context) {
	var req ChatHTTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message wajib diisi"})
		return
	}

	history := ConvertHistory(req.History)

	reply, err := h.service.Chat(history, req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ChatResponseBody{Reply: reply})
}
