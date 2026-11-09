package dashboard

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
	dashGroup := rg.Group("/dashboard")
	{
		dashGroup.GET("/procurement", h.GetProcurementDashboard)
		dashGroup.GET("/sales", h.GetSalesDashboard)
		dashGroup.GET("/delivery", h.GetDeliveryDashboard)
		dashGroup.GET("/warehouse", h.GetWarehouseDashboard)
	}
}

func (h *Handler) GetWarehouseDashboard(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))

	data, err := h.service.GetWarehouseDashboard(clientID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *Handler) GetDeliveryDashboard(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))

	data, err := h.service.GetDeliveryDashboard(clientID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *Handler) GetSalesDashboard(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))

	data, err := h.service.GetSalesDashboard(clientID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *Handler) GetProcurementDashboard(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Query("client_id"))
	orgID, _ := strconv.Atoi(c.Query("org_id"))

	data, err := h.service.GetProcurementDashboard(clientID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

