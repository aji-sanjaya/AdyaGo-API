package security

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds industry-standard security headers to every response.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent Clickjacking (iframe embedding) - allow for attachment previews
		if !strings.Contains(c.Request.URL.Path, "/attachments") {
			c.Header("X-Frame-Options", "DENY")
		}

		// Enable XSS filtering in browsers
		c.Header("X-XSS-Protection", "1; mode=block")

		// Strict referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Restrict dangerous browser features
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		c.Next()
	}
}

