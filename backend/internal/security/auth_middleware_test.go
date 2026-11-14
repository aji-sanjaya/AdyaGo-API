package security

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// mockValidator implements TokenValidator for tests
type mockValidator struct {
	validTokens map[string]bool
}

func (m *mockValidator) ValidateToken(token string, userID int) error {
	if m.validTokens != nil && m.validTokens[token] {
		return nil
	}
	return errors.New("invalid token rejected by mock validator")
}

func createTestJWT(claims TokenClaims) string {
	header := map[string]string{"kid": "idempiere", "alg": "HS512", "typ": "JWT"}
	headerJSON, _ := json.Marshal(header)
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	payloadJSON, _ := json.Marshal(claims)
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	signature := base64.RawURLEncoding.EncodeToString([]byte("mock-signature-bytes-for-test"))
	return fmt.Sprintf("%s.%s.%s", headerB64, payloadB64, signature)
}

func setupTestRouter(validator TokenValidator) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Public routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.POST("/api/v1/auth/login", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "token": "login-flow-token"})
	})

	// Protected routes
	v1 := r.Group("/api/v1")
	protected := v1.Group("")
	protected.Use(AuthMiddleware(validator, nil)) // nil db for unit test
	{
		protected.GET("/orders", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success":   true,
				"client_id": c.GetInt("client_id"),
				"user_id":   c.GetInt("user_id"),
				"message":   "Orders retrieved successfully",
			})
		})
		protected.GET("/requisitions", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Requisitions retrieved successfully",
			})
		})
		protected.GET("/orders/:id/attachments/:filename", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success":  true,
				"filename": c.Param("filename"),
			})
		})
	}

	return r
}

func TestAuthMiddleware_SecuritySuite(t *testing.T) {
	validTokenStr := createTestJWT(TokenClaims{
		Sub:       "SuperUser",
		ClientID:  1000000,
		UserID:    100,
		RoleID:    1000000,
		OrgID:     1000000,
		SessionID: 12345,
		Iss:       "idempiere.org",
		Exp:       time.Now().Add(1 * time.Hour).Unix(),
	})

	expiredTokenStr := createTestJWT(TokenClaims{
		Sub:       "SuperUser",
		ClientID:  1000000,
		UserID:    100,
		RoleID:    1000000,
		OrgID:     1000000,
		SessionID: 12345,
		Iss:       "idempiere.org",
		Exp:       time.Now().Add(-1 * time.Hour).Unix(), // Expired
	})

	invalidIssuerTokenStr := createTestJWT(TokenClaims{
		Sub:      "Attacker",
		ClientID: 1000000,
		UserID:   100,
		Iss:      "evil-corp.com",
		Exp:      time.Now().Add(1 * time.Hour).Unix(),
	})

	validator := &mockValidator{
		validTokens: map[string]bool{
			validTokenStr: true,
		},
	}

	router := setupTestRouter(validator)

	// Scenario 1: Anonymous user accessing GET /api/v1/orders -> HTTP 401
	t.Run("Anonymous user accessing /orders should get 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Code)
		}
	})

	// Scenario 2: Anonymous user accessing GET /api/v1/requisitions -> HTTP 401
	t.Run("Anonymous user accessing /requisitions should get 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/requisitions", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Code)
		}
	})

	// Scenario 3: Request using invalid token format -> HTTP 401
	t.Run("Malformed token should get 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer invalid-garbage-token")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Code)
		}
	})

	// Scenario 4: Request using expired token -> HTTP 401
	t.Run("Expired token should get 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+expiredTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Code)
		}
	})

	// Scenario 5: Request using invalid issuer -> HTTP 401
	t.Run("Invalid issuer token should get 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+invalidIssuerTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Code)
		}
	})

	// Scenario 6: User with valid token accessing orders -> HTTP 200
	t.Run("Authenticated user with valid token gets 200 OK", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+validTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d (body: %s)", w.Code, w.Body.String())
		}
	})

	// Scenario 7: Multi-Company Security - User of PT A (1000000) requests PT B (1000001) -> HTTP 403 Forbidden
	t.Run("User of Tenant A attempting to access Tenant B gets 403 Forbidden", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders?client_id=1000001", nil)
		req.Header.Set("Authorization", "Bearer "+validTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d (body: %s)", w.Code, w.Body.String())
		}
	})

	// Scenario 8: User modifying user_id parameter to another user -> HTTP 403 Forbidden
	t.Run("User attempting to access another user's scope gets 403 Forbidden", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders?user_id=9999", nil)
		req.Header.Set("Authorization", "Bearer "+validTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d (body: %s)", w.Code, w.Body.String())
		}
	})

	// Scenario 9: User modifying role_id parameter to another role -> HTTP 403 Forbidden
	t.Run("User attempting to access another role's scope gets 403 Forbidden", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders?role_id=9999", nil)
		req.Header.Set("Authorization", "Bearer "+validTokenStr)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d (body: %s)", w.Code, w.Body.String())
		}
	})

	// Scenario 10: Public login and health endpoints remain accessible without token -> HTTP 200
	t.Run("Public health check remains accessible without token", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	})

	t.Run("Public login endpoint remains accessible without token", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	})

	// Scenario 11: File download via ?token= query parameter -> HTTP 200
	t.Run("File download with ?token query param gets 200 OK", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/100/attachments/doc.pdf?token="+validTokenStr, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d (body: %s)", w.Code, w.Body.String())
		}
	})
}

