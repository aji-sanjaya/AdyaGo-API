package auth

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"factoryhub-go/internal/security"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
	limiter *security.RateLimiter
}

func NewHandler(service *Service, limiter *security.RateLimiter) *Handler {
	return &Handler{
		service: service,
		limiter: limiter,
	}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	authGroup := rg.Group("/auth")
	{
		authGroup.POST("/login", h.Login)
		authGroup.GET("/clients", h.GetClients)
		authGroup.GET("/roles", h.GetRoles)
		authGroup.GET("/orgs", h.GetOrgs)
		authGroup.GET("/warehouses", h.GetWarehouses)
		authGroup.POST("/select-context", h.SelectContext)
	}
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Username and password are required.",
			"error":   err.Error(),
		})
		return
	}

	cleanUsername := strings.TrimSpace(req.Username)
	// Key based on Client IP and normalized Username
	rateLimitKey := fmt.Sprintf("%s:%s", c.ClientIP(), strings.ToLower(cleanUsername))

	// 1. Check if currently locked
	if isLocked, retryAfter := h.limiter.IsLocked(rateLimitKey); isLocked {
		c.Header("Retry-After", strconv.Itoa(retryAfter))
		c.JSON(http.StatusTooManyRequests, gin.H{
			"success":     false,
			"locked":      true,
			"retry_after": retryAfter,
			"message":     fmt.Sprintf("Too many failed login attempts. Access temporarily held for security. Please try again in %d seconds.", retryAfter),
		})
		return
	}

	// 2. Perform authentication attempt
	resp, err := h.service.LoginInitial(req)
	if err != nil {
		isLocked, remaining, retryAfter := h.limiter.RecordFailure(rateLimitKey)
		if isLocked {
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success":     false,
				"locked":      true,
				"retry_after": retryAfter,
				"message":     fmt.Sprintf("Account held due to 3 consecutive failed login attempts. Please wait %d seconds before trying again.", retryAfter),
			})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{
			"success":            false,
			"remaining_attempts": remaining,
			"message":            fmt.Sprintf("Invalid username or password. %d attempt(s) remaining before temporary lockout.", remaining),
		})
		return
	}

	// 3. Clear attempt history on success
	h.limiter.RecordSuccess(rateLimitKey)

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GetClients(c *gin.Context) {
	clients, err := h.service.GetClients()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    clients,
	})
}

func (h *Handler) GetRoles(c *gin.Context) {
	clientIDStr := c.Query("client_id")
	userIDStr := c.Query("user_id")

	clientID, _ := strconv.Atoi(clientIDStr)
	userID, _ := strconv.Atoi(userIDStr)

	if clientID == 0 || userID == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []LookupOption{},
		})
		return
	}

	roles, err := h.service.GetRoles(userID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roles,
	})
}

func (h *Handler) GetOrgs(c *gin.Context) {
	clientIDStr := c.Query("client_id")
	roleIDStr := c.Query("role_id")
	userIDStr := c.Query("user_id")

	clientID, _ := strconv.Atoi(clientIDStr)
	roleID, _ := strconv.Atoi(roleIDStr)
	userID, _ := strconv.Atoi(userIDStr)

	if clientID == 0 || roleID == 0 || userID == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []LookupOption{},
		})
		return
	}

	orgs, err := h.service.GetOrgs(userID, roleID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orgs,
	})
}

func (h *Handler) GetWarehouses(c *gin.Context) {
	roleIDStr := c.Query("role_id")
	orgIDStr := c.Query("org_id")

	roleID, _ := strconv.Atoi(roleIDStr)
	orgID, _ := strconv.Atoi(orgIDStr)

	if roleID == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []LookupOption{},
		})
		return
	}

	warehouses, err := h.service.GetWarehouses(roleID, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    warehouses,
	})
}

func (h *Handler) SelectContext(c *gin.Context) {
	var req SelectContextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Context selection fields (role, tenant, organization) are required.",
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[SELECT CONTEXT ATTEMPT] username=%s clientId=%d roleId=%d orgId=%d warehouseId=%v",
		req.Username, req.ClientID, req.RoleID, req.OrgID, req.WarehouseID)

	resp, err := h.service.SelectContext(req)
	if err != nil {
		log.Printf("[SELECT CONTEXT ERROR] %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}
