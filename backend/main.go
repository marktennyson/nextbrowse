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
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
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
		fs.POST("/upload", handlers.UploadFiles)
		fs.POST("/upload-chunk", handlers.UploadChunk)
		fs.POST("/upload-status", handlers.UploadStatus)
		fs.POST("/upload-cancel", handlers.CancelUpload)
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

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Go backend server on port %s", port)
	log.Fatal(r.Run(":" + port))
}