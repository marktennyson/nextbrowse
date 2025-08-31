package middleware

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jellydator/ttlcache/v3"

	"nextbrowse-backend/config"
)

// SecurityHeaders adds security headers to responses
func SecurityHeaders() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-Permitted-Cross-Domain-Policies", "none")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';")
		
		// Remove server header for security
		c.Header("Server", "NextBrowse")
		
		c.Next()
	})
}

// Rate limiter implementation
type rateLimiter struct {
	cache     *ttlcache.Cache[string, int]
	requests  int
	window    time.Duration
	mutex     sync.RWMutex
}

var globalRateLimiter = &rateLimiter{
	cache:    ttlcache.New(ttlcache.WithTTL[string, int](1 * time.Minute)),
	requests: 1000, // 1000 requests per minute per IP
	window:   1 * time.Minute,
}

// RateLimiter middleware for rate limiting
func RateLimiter() gin.HandlerFunc {
	// Start cache cleanup
	go globalRateLimiter.cache.Start()

	return gin.HandlerFunc(func(c *gin.Context) {
		ip := getClientIP(c)
		
		globalRateLimiter.mutex.Lock()
		defer globalRateLimiter.mutex.Unlock()

		// Get current request count for IP
		item := globalRateLimiter.cache.Get(ip)
		count := 0
		if item != nil {
			count = item.Value()
		}

		if count >= globalRateLimiter.requests {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", globalRateLimiter.requests))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(globalRateLimiter.window).Unix()))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"message": "Too many requests from this IP address",
			})
			c.Abort()
			return
		}

		// Increment counter
		globalRateLimiter.cache.Set(ip, count+1, globalRateLimiter.window)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", globalRateLimiter.requests))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", globalRateLimiter.requests-count-1))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(globalRateLimiter.window).Unix()))

		c.Next()
	})
}

// RequestLogger logs incoming requests
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log after request
		end := time.Now()
		latency := end.Sub(start)

		clientIP := getClientIP(c)
		method := c.Request.Method
		statusCode := c.Writer.Status()
		
		if raw != "" {
			path = path + "?" + raw
		}

		// Don't log health checks in production
		if config.IsProduction() && path == "/health" {
			return
		}

		log.Printf("%s - [%s] \"%s %s\" %d %s \"%s\" \"%s\"",
			clientIP,
			end.Format("02/Jan/2006:15:04:05 -0700"),
			method,
			path,
			statusCode,
			latency,
			c.Request.Header.Get("User-Agent"),
			c.Request.Header.Get("Referer"),
		)
	}
}

// InputValidation validates incoming requests
func InputValidation() gin.HandlerFunc {
	// Compiled regex patterns for validation
	fileNamePattern := regexp.MustCompile(`^[a-zA-Z0-9\-_. ]*$`)
	
	return gin.HandlerFunc(func(c *gin.Context) {
		// Validate common input parameters
		if path := c.Query("path"); path != "" {
			if !isValidPath(path) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid path parameter",
					"message": "Path contains invalid characters or patterns",
				})
				c.Abort()
				return
			}
		}

		// Validate form data paths
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			if path := c.PostForm("path"); path != "" {
				if !isValidPath(path) {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "Invalid path in form data",
						"message": "Path contains invalid characters or patterns",
					})
					c.Abort()
					return
				}
			}

			if fileName := c.PostForm("fileName"); fileName != "" {
				if !fileNamePattern.MatchString(fileName) {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "Invalid file name",
						"message": "File name contains invalid characters",
					})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	})
}

// Helper functions
func getClientIP(c *gin.Context) string {
	// Check for forwarded IP (in case of proxy)
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		return strings.Split(forwarded, ",")[0]
	}
	
	if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
		return realIP
	}
	
	return c.ClientIP()
}

func isValidPath(path string) bool {
	// Check for path traversal attempts
	if strings.Contains(path, "..") {
		return false
	}
	
	// Check for null bytes
	if strings.Contains(path, "\x00") {
		return false
	}
	
	// Check for control characters
	for _, char := range path {
		if char < 32 && char != 9 && char != 10 && char != 13 { // Allow tab, LF, CR
			return false
		}
	}
	
	// Basic length check
	if len(path) > 4096 {
		return false
	}
	
	return true
}