package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"nextbrowse-backend/handlers"
	"nextbrowse-backend/middleware"
)

func main() {
	// Setup Gin
	r := gin.Default()

	// CORS configuration
	cfg := cors.Config{
		AllowMethods:     []string{"GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		// Dynamically allow any origin (nginx serves same-origin, but this also covers LAN IP access)
		AllowOriginFunc: func(origin string) bool {
			// Allow all origins; the library will echo the Origin value instead of '*'
			// which is compatible with credentials=true
			return true
		},
	}
	r.Use(cors.New(cfg))

	// Security middleware
	r.Use(middleware.SecurityHeaders())

	// File system API routes
	fs := r.Group("/api/fs")
	{
		fs.GET("/list", handlers.ListDirectory)
		fs.GET("/read", handlers.ReadFile)
		fs.GET("/upload/config", handlers.GetUploadConfigHandler) // Upload config
		fs.POST("/upload", handlers.UploadFiles)
		fs.POST("/upload-chunk", handlers.UploadChunk)
		fs.POST("/upload-status", handlers.UploadStatus)
		fs.POST("/upload-cancel", handlers.CancelUpload)
		fs.PUT("/upload-range", handlers.UploadPutRange)
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

	// TUS resumable upload protocol (for high-performance uploads)
	tus := r.Group("/api/tus")
	{
		tus.POST("/upload", handlers.TusPostHandler)   // Initialize upload
		tus.HEAD("/upload", handlers.TusHeadHandler)   // Get upload progress
		tus.PATCH("/upload", handlers.TusPatchHandler) // Upload data
		tus.DELETE("/upload", handlers.TusDeleteHandler) // Cancel upload
		tus.GET("/config", handlers.GetOptimalConfig) // Get hardware-optimized config
	}


	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.Status(200)
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "9932"
	}

	log.Printf("Starting Go backend server on port %s", port)
	log.Fatal(r.Run(":" + port))
}