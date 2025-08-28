package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

type FileItem struct {
	Name  string  `json:"name"`
	Type  string  `json:"type"`
	Size  *int64  `json:"size,omitempty"`
	MTime int64   `json:"mtime"`
	URL   *string `json:"url,omitempty"`
}

type ListResponse struct {
	OK         bool                   `json:"ok"`
	Path       string                 `json:"path"`
	Items      []FileItem             `json:"items"`
	Pagination map[string]interface{} `json:"pagination,omitempty"`
}

func ListDirectory(c *gin.Context) {
	userPath := c.DefaultQuery("path", "/")
	
	// Parse pagination parameters
	pageParam := c.Query("page")
	pageSizeParam := c.Query("pageSize")
	offsetParam := c.Query("offset")
	limitParam := c.Query("limit")

	// Determine pagination type
	useOffsetPagination := offsetParam != "" || limitParam != ""
	usePagination := pageParam != "" || pageSizeParam != "" || useOffsetPagination

	var page, pageSize, offset, limit int = 1, 50, 0, 50

	if useOffsetPagination {
		if offsetParam != "" {
			if val, err := strconv.Atoi(offsetParam); err == nil && val >= 0 {
				offset = val
			}
		}
		if limitParam != "" {
			if val, err := strconv.Atoi(limitParam); err == nil && val > 0 && val <= 1000 {
				limit = val
			}
		}
	} else {
		if pageParam != "" {
			if val, err := strconv.Atoi(pageParam); err == nil && val >= 1 {
				page = val
			}
		}
		if pageSizeParam != "" {
			if val, err := strconv.Atoi(pageSizeParam); err == nil && val > 0 && val <= 1000 {
				pageSize = val
			}
		}
		offset = (page - 1) * pageSize
		limit = pageSize
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(userPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": err.Error(),
		})
		return
	}

	// Check if directory exists
	if !utils.FileExists(safePath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Directory not found",
		})
		return
	}

	if !utils.IsDirectory(safePath) {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Path is not a directory",
		})
		return
	}

	// Read directory contents
	entries, err := os.ReadDir(safePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to read directory: " + err.Error(),
		})
		return
	}

	// Convert to FileItem slice
	var items []FileItem
	for _, entry := range entries {
		// Skip hidden files starting with . (except . and ..)
		if strings.HasPrefix(entry.Name(), ".") && entry.Name() != "." && entry.Name() != ".." {
			continue
		}

		// Skip . and .. entries
		if entry.Name() == "." || entry.Name() == ".." {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		item := FileItem{
			Name:  entry.Name(),
			Type:  "file",
			MTime: info.ModTime().UnixMilli(),
		}

		if entry.IsDir() {
			item.Type = "dir"
		} else {
			size := info.Size()
			item.Size = &size
			
			// Build URL for files
			itemPath := filepath.Join(userPath, entry.Name())
			url := utils.BuildPublicFileURL(itemPath)
			item.URL = &url
		}

		items = append(items, item)
	}

	// Sort items (directories first, then alphabetical)
	sort.Slice(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type == "dir"
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	response := ListResponse{
		OK:    true,
		Path:  userPath,
		Items: items,
	}

	// Apply pagination if requested
	if usePagination {
		totalItems := len(items)
		startIndex := offset
		endIndex := offset + limit
		if endIndex > totalItems {
			endIndex = totalItems
		}

		if startIndex < totalItems {
			response.Items = items[startIndex:endIndex]
		} else {
			response.Items = []FileItem{}
		}

		hasMore := endIndex < totalItems

		if useOffsetPagination {
			response.Pagination = map[string]interface{}{
				"offset":     offset,
				"limit":      limit,
				"totalItems": totalItems,
				"hasMore":    hasMore,
			}
			if hasMore {
				response.Pagination["nextOffset"] = endIndex
			}
		} else {
			totalPages := (totalItems + pageSize - 1) / pageSize
			response.Pagination = map[string]interface{}{
				"page":       page,
				"pageSize":   pageSize,
				"totalItems": totalItems,
				"totalPages": totalPages,
				"hasNext":    hasMore,
				"hasPrev":    offset > 0,
			}
		}
	}

	c.JSON(http.StatusOK, response)
}