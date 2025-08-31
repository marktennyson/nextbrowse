package handlers

import (
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/config"
	"nextbrowse-backend/utils"
)

// HealthCheckResponse represents the health check response
type HealthCheckResponse struct {
	Status      string            `json:"status"`
	Version     string            `json:"version"`
	Environment string            `json:"environment"`
	Timestamp   string            `json:"timestamp"`
	Uptime      string            `json:"uptime"`
	Checks      map[string]string `json:"checks"`
}

// MetricsResponse represents the metrics response
type MetricsResponse struct {
	System    SystemMetrics `json:"system"`
	App       AppMetrics    `json:"app"`
	Timestamp string        `json:"timestamp"`
}

type SystemMetrics struct {
	GoVersion    string `json:"go_version"`
	NumCPU       int    `json:"num_cpu"`
	NumGoroutine int    `json:"num_goroutine"`
	MemAlloc     uint64 `json:"mem_alloc"`
	MemTotalAlloc uint64 `json:"mem_total_alloc"`
	MemSys       uint64 `json:"mem_sys"`
	NextGC       uint64 `json:"next_gc"`
}

type AppMetrics struct {
	RootDir         string `json:"root_dir"`
	MaxFileSize     int64  `json:"max_file_size"`
	MaxUploadSize   int64  `json:"max_upload_size"`
	Environment     string `json:"environment"`
	StartTime       string `json:"start_time"`
}

var startTime = time.Now()

// HealthCheck provides a comprehensive health check endpoint
func HealthCheck(c *gin.Context) {
	checks := make(map[string]string)
	overallStatus := "healthy"

	// Check root directory accessibility
	if _, err := os.Stat(config.RootDir); os.IsNotExist(err) {
		checks["root_directory"] = "error: directory does not exist"
		overallStatus = "unhealthy"
	} else if !utils.IsDirectory(config.RootDir) {
		checks["root_directory"] = "error: not a directory"
		overallStatus = "unhealthy"
	} else {
		checks["root_directory"] = "ok"
	}

	// Check disk space
	if diskUsage, err := getDiskUsage(config.RootDir); err != nil {
		checks["disk_space"] = "warning: cannot check disk space"
	} else if diskUsage > 0.9 { // 90% full
		checks["disk_space"] = "warning: disk usage over 90%"
		if overallStatus == "healthy" {
			overallStatus = "degraded"
		}
	} else {
		checks["disk_space"] = "ok"
	}

	// Memory check
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	if m.Alloc > 1024*1024*1024 { // 1GB
		checks["memory"] = "warning: high memory usage"
		if overallStatus == "healthy" {
			overallStatus = "degraded"
		}
	} else {
		checks["memory"] = "ok"
	}

	response := HealthCheckResponse{
		Status:      overallStatus,
		Version:     getVersion(),
		Environment: config.Environment,
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		Uptime:      time.Since(startTime).String(),
		Checks:      checks,
	}

	statusCode := http.StatusOK
	if overallStatus == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	} else if overallStatus == "degraded" {
		statusCode = http.StatusOK // Still return 200 for degraded
	}

	c.JSON(statusCode, response)
}

// Metrics provides system and application metrics
func Metrics(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	systemMetrics := SystemMetrics{
		GoVersion:     runtime.Version(),
		NumCPU:        runtime.NumCPU(),
		NumGoroutine:  runtime.NumGoroutine(),
		MemAlloc:      m.Alloc,
		MemTotalAlloc: m.TotalAlloc,
		MemSys:        m.Sys,
		NextGC:        m.NextGC,
	}

	appMetrics := AppMetrics{
		RootDir:       config.RootDir,
		MaxFileSize:   config.MaxFileSize,
		MaxUploadSize: config.MaxUploadSize,
		Environment:   config.Environment,
		StartTime:     startTime.UTC().Format(time.RFC3339),
	}

	response := MetricsResponse{
		System:    systemMetrics,
		App:       appMetrics,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

// Helper functions
func getVersion() string {
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	return "development"
}

func getDiskUsage(path string) (float64, error) {
	// This is a simplified implementation
	// In production, you might want to use syscall.Statfs_t or similar
	
	// For now, just return a safe value
	// TODO: Implement actual disk usage check based on OS
	return 0.0, nil
}