package security

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"factoryhub-go/internal/database"
	"github.com/gin-gonic/gin"
)

// TokenValidator defines the contract for validating tokens against identity providers.
type TokenValidator interface {
	ValidateToken(token string, userID int) error
}

// TokenClaims represents the JWT payload claims issued by iDempiere.
type TokenClaims struct {
	Sub         string `json:"sub"`
	ClientID    int    `json:"AD_Client_ID"`
	UserID      int    `json:"AD_User_ID"`
	RoleID      int    `json:"AD_Role_ID"`
	OrgID       int    `json:"AD_Org_ID"`
	WarehouseID int    `json:"M_Warehouse_ID"`
	Language    string `json:"AD_Language"`
	SessionID   int    `json:"AD_Session_ID"`
	Iss         string `json:"iss"`
	Exp         int64  `json:"exp"`
	Clients     string `json:"Clients,omitempty"`
}

type cachedToken struct {
	claims    *TokenClaims
	expiresAt time.Time
}

type tokenCache struct {
	mu    sync.RWMutex
	items map[string]*cachedToken
}

var globalTokenCache = &tokenCache{
	items: make(map[string]*cachedToken),
}

func (tc *tokenCache) get(token string) (*TokenClaims, bool) {
	tc.mu.RLock()
	defer tc.mu.RUnlock()

	item, exists := tc.items[token]
	if !exists {
		return nil, false
	}
	if time.Now().After(item.expiresAt) {
		return nil, false
	}
	return item.claims, true
}

func (tc *tokenCache) set(token string, claims *TokenClaims, ttl time.Duration) {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	// Clean up expired tokens periodically if cache grows large
	if len(tc.items) > 1000 {
		now := time.Now()
		for k, v := range tc.items {
			if now.After(v.expiresAt) {
				delete(tc.items, k)
			}
		}
	}

	tc.items[token] = &cachedToken{
		claims:    claims,
		expiresAt: time.Now().Add(ttl),
	}
}

// ParseTokenClaims parses and decodes the JWT payload without verifying signature locally.
func ParseTokenClaims(tokenStr string) (*TokenClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("token expected to have 3 parts, got %d", len(parts))
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		// Fallback to standard base64 if needed
		payloadBytes, err = base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, fmt.Errorf("failed to decode token payload: %w", err)
		}
	}

	var claims TokenClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse token claims JSON: %w", err)
	}

	return &claims, nil
}

// ExtractToken retrieves the bearer token from the Authorization header or ?token query param.
func ExtractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	// Fallback to query parameter (needed for browser downloads/iframe previews)
	if qToken := c.Query("token"); qToken != "" {
		return strings.TrimSpace(qToken)
	}
	return ""
}

// AuthMiddleware creates a Gin middleware that enforces authentication, token validity, and multi-tenant authorization.
func AuthMiddleware(validator TokenValidator, db *database.DBInstance) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ExtractToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Authentication required. Missing Bearer token.",
			})
			return
		}

		// 1. Check in-memory cache for validated token
		claims, found := globalTokenCache.get(token)
		if !found {
			// 2. Parse token structure and claims
			parsedClaims, err := ParseTokenClaims(token)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"message": "Invalid token format: " + err.Error(),
				})
				return
			}

			// 3. Check expiration
			if parsedClaims.Exp > 0 && time.Now().Unix() > parsedClaims.Exp {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"message": "Session token has expired. Please sign in again.",
				})
				return
			}

			// 4. Check token issuer
			if parsedClaims.Iss != "" && parsedClaims.Iss != "idempiere.org" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"message": "Invalid token issuer.",
				})
				return
			}

			// 5. Validate token authenticity with iDempiere REST API
			if validator != nil {
				if err := validator.ValidateToken(token, parsedClaims.UserID); err != nil {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
						"success": false,
						"message": "Invalid or rejected authentication token.",
					})
					return
				}
			}

			// 6. Verify active session in PostgreSQL if SessionID is present
			if db != nil && parsedClaims.SessionID > 0 {
				var activeCount int64
				err := db.DB.Raw(`
					SELECT count(1) 
					FROM ad_session 
					WHERE ad_session_id = ? AND isactive = 'Y'
				`, parsedClaims.SessionID).Scan(&activeCount).Error

				if err == nil && activeCount == 0 {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
						"success": false,
						"message": "Session has been closed or terminated.",
					})
					return
				}
			}

			claims = parsedClaims

			// Determine cache TTL (minimum of 5 minutes or remaining token lifetime)
			ttl := 5 * time.Minute
			if claims.Exp > 0 {
				remaining := time.Until(time.Unix(claims.Exp, 0))
				if remaining > 0 && remaining < ttl {
					ttl = remaining
				}
			}
			globalTokenCache.set(token, claims, ttl)
		}

		// 7. Authorization & Multi-Company Security (Multi-Tenant Isolation)
		// System Administrator (Role 0 or Client 0) has cross-tenant access.
		isSystemAdmin := claims.RoleID == 0 || claims.ClientID == 0

		// Verify requested client_id in query
		if qClientIDStr := c.Query("client_id"); qClientIDStr != "" {
			if qClientID, err := strconv.Atoi(qClientIDStr); err == nil && qClientID > 0 {
				if !isSystemAdmin && qClientID != claims.ClientID {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
						"success": false,
						"message": fmt.Sprintf("Forbidden: Access denied to tenant %d. Your active session belongs to tenant %d.", qClientID, claims.ClientID),
					})
					return
				}
			}
		}

		// Verify requested user_id in query
		if qUserIDStr := c.Query("user_id"); qUserIDStr != "" {
			if qUserID, err := strconv.Atoi(qUserIDStr); err == nil && qUserID > 0 {
				if !isSystemAdmin && qUserID != claims.UserID {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
						"success": false,
						"message": fmt.Sprintf("Forbidden: Access denied to user scope %d. Your active session is user %d.", qUserID, claims.UserID),
					})
					return
				}
			}
		}

		// Verify requested role_id in query
		if qRoleIDStr := c.Query("role_id"); qRoleIDStr != "" {
			if qRoleID, err := strconv.Atoi(qRoleIDStr); err == nil && qRoleID > 0 {
				if !isSystemAdmin && qRoleID != claims.RoleID {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
						"success": false,
						"message": fmt.Sprintf("Forbidden: Access denied to role scope %d. Your active session is role %d.", qRoleID, claims.RoleID),
					})
					return
				}
			}
		}

		// 8. Store authenticated claims in Gin context for downstream handlers
		c.Set("claims", claims)
		c.Set("client_id", claims.ClientID)
		c.Set("org_id", claims.OrgID)
		c.Set("role_id", claims.RoleID)
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Sub)
		c.Set("session_id", claims.SessionID)
		c.Set("token", token)

		c.Next()
	}
}

