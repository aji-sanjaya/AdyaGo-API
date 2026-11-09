package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"factoryhub-go/config"
	"factoryhub-go/internal/auth"
	"factoryhub-go/internal/dashboard"
	"factoryhub-go/internal/database"
	"factoryhub-go/internal/idempiere"
	"factoryhub-go/internal/menu"
	"factoryhub-go/internal/notification"
	"factoryhub-go/internal/requisition"
	"factoryhub-go/internal/security"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	gin.SetMode(cfg.GinMode)

	// Connect to PostgreSQL iDempiere
	dbInstance, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to iDempiere PostgreSQL: %v", err)
	}

	// Initialize iDempiere API client
	idempiereClient := idempiere.NewClient(cfg)

	// Initialize Security Rate Limiter (Max 3 failed attempts, 60s lockout hold)
	rateLimiter := security.NewRateLimiter(3, 60*time.Second)

	// Initialize Auth module
	authService := auth.NewService(dbInstance, idempiereClient)
	authHandler := auth.NewHandler(authService, rateLimiter)

	// Initialize Menu module
	menuService := menu.NewService(dbInstance)
	menuHandler := menu.NewHandler(menuService)

	// Initialize Dashboard module
	dashService := dashboard.NewService(dbInstance)
	dashHandler := dashboard.NewHandler(dashService)

	// Initialize Requisition (Create PR) module
	reqService := requisition.NewService(dbInstance, idempiereClient, cfg)
	reqHandler := requisition.NewHandler(reqService)

	// Initialize Notification module
	notifService := notification.NewService(dbInstance)
	notifHandler := notification.NewHandler(notifService)

	// Setup Gin router
	r := gin.Default()

	// Apply Security Headers Middleware
	r.Use(security.SecurityHeadersMiddleware())

	// Setup CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.CORSAllowedOrigins
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true
	r.Use(cors.New(corsConfig))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"app":     "AdyaGo API",
			"version": "1.0.0",
		})
	})

	// API Group v1
	v1 := r.Group("/api/v1")
	authHandler.RegisterRoutes(v1)
	menuHandler.RegisterRoutes(v1)
	dashHandler.RegisterRoutes(v1)
	reqHandler.RegisterRoutes(v1)
	notifHandler.RegisterRoutes(v1)

	// Graceful server startup
	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("AdyaGo Server running on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server with a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down AdyaGo server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("AdyaGo Server exited properly")
}
