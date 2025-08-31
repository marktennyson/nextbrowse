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
	{
		tus.OPTIONS("/files", handlers.TusOptionsHandler)    // TUS discovery
		tus.POST("/files", handlers.TusPostHandler)          // Create upload
		tus.HEAD("/files/:id", handlers.TusHeadHandler)      // Get upload status  
		tus.PATCH("/files/:id", handlers.TusPatchHandler)    // Upload chunks
		tus.DELETE("/files/:id", handlers.TusDeleteHandler)  // Cancel upload
		tus.GET("/config", handlers.GetTusConfig)            // Get TUS configuration
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