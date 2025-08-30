package handlers

import (
	"sync"
	"time"
)

// UploadConfig holds performance tuning settings
type UploadConfig struct {
	// Buffer sizes for different operations
	ChunkBufferSize     int64         // Buffer size for chunk uploads
	StreamBufferSize    int64         // Buffer size for streaming uploads
	MaxConcurrentChunks int           // Maximum parallel chunk uploads per file
	ChunkTimeout        time.Duration // Timeout for individual chunks
	
	// Performance optimizations
	EnableCompression   bool // Enable gzip compression for uploads
	EnableAsyncWrites   bool // Enable asynchronous file writes
	PreallocateFiles    bool // Preallocate file space for large uploads
}

var (
	// Default high-performance configuration
	DefaultUploadConfig = &UploadConfig{
		ChunkBufferSize:     32 << 20,    // 32MB chunks for high-speed networks
		StreamBufferSize:    16 << 20,    // 16MB stream buffer
		MaxConcurrentChunks: 8,           // Allow up to 8 parallel chunks
		ChunkTimeout:        5 * time.Minute,
		EnableCompression:   false,       // Disable compression for speed
		EnableAsyncWrites:   true,        // Enable async writes
		PreallocateFiles:    true,        // Preallocate for large files
	}
	
	// Global upload configuration
	uploadConfig = DefaultUploadConfig
	
	// Pool for reusable buffers to reduce GC pressure
	bufferPool = &sync.Pool{
		New: func() interface{} {
			return make([]byte, uploadConfig.StreamBufferSize)
		},
	}
)

// GetOptimizedBuffer returns a reusable buffer from the pool
func GetOptimizedBuffer() []byte {
	return bufferPool.Get().([]byte)
}

// PutOptimizedBuffer returns a buffer to the pool
func PutOptimizedBuffer(buf []byte) {
	if cap(buf) == int(uploadConfig.StreamBufferSize) {
		bufferPool.Put(buf)
	}
}

// SetUploadConfig allows customizing upload performance settings
func SetUploadConfig(config *UploadConfig) {
	uploadConfig = config
	
	// Update buffer pool for new size
	bufferPool = &sync.Pool{
		New: func() interface{} {
			return make([]byte, config.StreamBufferSize)
		},
	}
}

// GetUploadConfig returns current upload configuration
func GetUploadConfig() *UploadConfig {
	return uploadConfig
}
