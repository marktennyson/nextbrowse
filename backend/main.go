package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"nextbrowse-backend/config"
	"nextbrowse-backend/handlers"
	"nextbrowse-backend/middleware"
)

func main() {
	// Initialize configuration and validate environment
	if err := config.ValidateConfig(); err != nil {
		log.Fatalf("Configuration validation failed: %v", err)
	}

	// Set Gin mode for production
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Setup Gin with recovery middleware
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	
	// Set max multipart memory to 128MB (for large file uploads)
	r.MaxMultipartMemory = 128 << 20

	// Request logging middleware
	r.Use(middleware.RequestLogger())

	// Rate limiting middleware
	r.Use(middleware.RateLimiter())

	// CORS configuration
	cfg := cors.Config{
		AllowMethods:     []string{"GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Tus-Resumable", "Upload-Length", "Upload-Metadata", "Upload-Offset", "Upload-Checksum"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			// Allow all origins for development; in production consider restricting this
			return true
		},
	}
	r.Use(cors.New(cfg))

	// Security middleware
	r.Use(middleware.SecurityHeaders())

	// File system API routes
	fs := r.Group("/api/fs")
	fs.Use(middleware.InputValidation()) // Add input validation
	{
		fs.GET("/list", handlers.ListDirectory)
		fs.GET("/read", handlers.ReadFile)
		fs.POST("/copy", handlers.CopyFile)
		fs.POST("/move", handlers.MoveFile)
		fs.POST("/mkdir", handlers.CreateDirectory)
		fs.DELETE("/delete", handlers.DeleteFile)
		fs.POST("/delete", handlers.DeleteFile)
		fs.GET("/download", handlers.DownloadFile)
		fs.POST("/download-multiple", handlers.DownloadMultiple)
		
		// Share endpoints
		fs.POST("/share/create", handlers.CreateShare)
		fs.GET("/share/:shareId", handlers.GetShare)
		fs.GET("/share/:shareId/access", handlers.AccessShare)
		fs.GET("/share/:shareId/download", handlers.DownloadShare)
	}

	// TUS 1.0.0 Resumable File Upload endpoints
	tus := r.Group("/api/tus")
	tus.Use(middleware.InputValidation())
	{
		tus.OPTIONS("/files", handlers.TusOptionsHandler)    // TUS discovery
		tus.POST("/files", handlers.TusPostHandler)          // Create upload
		tus.HEAD("/files/:id", handlers.TusHeadHandler)      // Get upload status  
		tus.PATCH("/files/:id", handlers.TusPatchHandler)    // Upload chunks
		tus.DELETE("/files/:id", handlers.TusDeleteHandler)  // Cancel upload
		tus.GET("/config", handlers.GetTusConfig)            // Get TUS configuration
	}

	// Health check and metrics
	r.GET("/health", handlers.HealthCheck)
	r.HEAD("/health", handlers.HealthCheck)
	r.GET("/metrics", handlers.Metrics)

	// Get port configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "9932"
	}

	// Create HTTP server with timeouts optimized for file uploads
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  0, // No timeout for reading (important for large uploads)
		WriteTimeout: 0, // No timeout for writing (important for large downloads)
		IdleTimeout:  120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting NextBrowse backend server on port %s", port)
		log.Printf("Root directory: %s", config.RootDir)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server shutdown complete")
}