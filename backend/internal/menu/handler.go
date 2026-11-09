package menu

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
	menusGroup := rg.Group("/menus")
	{
		menusGroup.GET("", h.GetMenus)
		menusGroup.GET("/sidebar", h.GetSidebar)
	}
}

func (h *Handler) GetSidebar(c *gin.Context) {
	roleIDStr := c.Query("role_id")
	roleID, _ := strconv.Atoi(roleIDStr)

	rootIDStr := c.Query("root_id")
	rootID, _ := strconv.Atoi(rootIDStr)

	if roleID == 0 || rootID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Both role_id and root_id query parameters are required.",
		})
		return
	}

	groups, err := h.service.GetSidebarMenus(roleID, rootID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    groups,
	})
}

func (h *Handler) GetMenus(c *gin.Context) {
	roleIDStr := c.Query("role_id")
	roleID, _ := strconv.Atoi(roleIDStr)

	if roleID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "role_id query parameter is required.",
		})
		return
	}

	items, err := h.service.GetWelcomeMenus(roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
	})
}

