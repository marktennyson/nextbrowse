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
		ChunkBufferSize:     64 << 10,    // 64KB default chunks
		StreamBufferSize:    32 << 10,    // 32KB default copy buffer
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
			b := make([]byte, uploadConfig.StreamBufferSize)
			return &b // store pointer-like to avoid allocations per SA6002
		},
	}
)

// GetOptimizedBuffer returns a reusable buffer from the pool
func GetOptimizedBuffer() []byte {
	b := bufferPool.Get().(*[]byte)
	return *b
}

// PutOptimizedBuffer returns a buffer to the pool
func PutOptimizedBuffer(buf *[]byte) {
	if buf != nil && cap(*buf) == int(uploadConfig.StreamBufferSize) {
		bufferPool.Put(buf)
	}
}

// SetUploadConfig allows customizing upload performance settings
func SetUploadConfig(config *UploadConfig) {
	uploadConfig = config
	
	// Update buffer pool for new size
	bufferPool = &sync.Pool{
		New: func() interface{} {
			b := make([]byte, config.StreamBufferSize)
			return &b
		},
	}
}

// GetUploadConfig returns current upload configuration
func GetUploadConfig() *UploadConfig {
	return uploadConfig
}

// --- Adaptive sizing helpers ---

// RecommendedChunkSize returns a hardware-aware chunk size (in bytes).
// Small devices like Raspberry Pi perform better with smaller chunks to reduce latency.
func RecommendedChunkSize(userAgent string) int64 {
	// Force a small, latency-friendly chunk size for slower hardware
	return 64 * 1024 // 64 KiB
}

// RecommendedBufferSize returns a hardware-aware buffer size (in bytes) for io.CopyBuffer.
func RecommendedBufferSize(userAgent string) int {
	// Tie buffer to ~half the chunk size; allow small floors for Pi/ARM
	cs := RecommendedChunkSize(userAgent)
	b := cs / 2
	if b < 32<<10 { // floor at 32 KiB
		b = 32 << 10
	}
	if b > 4<<20 { // cap at 4 MiB
		b = 4 << 20
	}
	return int(b)
}

// GetAdaptiveBuffer returns a hardware-aware buffer sized for this request and a put() func.
// If the recommended size matches the configured pool size, we reuse the pool; otherwise we allocate a temp.
func GetAdaptiveBuffer(userAgent string) ([]byte, func()) {
	size := RecommendedBufferSize(userAgent)
	// Try reuse from pool when sizes match
	if int64(size) == uploadConfig.StreamBufferSize {
		bptr := bufferPool.Get().(*[]byte)
		if cap(*bptr) < size {
			// extremely unlikely, but fallback to fresh alloc
			bufferPool.Put(bptr)
			buf := make([]byte, size)
			return buf, func() {}
		}
		buf := (*bptr)[:size]
		return buf, func() { bufferPool.Put(bptr) }
	}
	// Otherwise allocate temporary buffer
	buf := make([]byte, size)
	return buf, func() {}
}
