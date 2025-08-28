import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface DirectoryData {
  ok: boolean;
  path: string;
  items: FileItem[];
  error?: string;
  pagination?: {
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    offset?: number;
    limit?: number;
    totalItems: number;
    hasMore?: boolean;
    nextOffset?: number | null;
  };
}

export function useFileData() {
  const [currentPath, setCurrentPath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<FileItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_LOAD = 50;

  const loadDirectory = useCallback(
    async (path: string, reset: boolean = false, offset: number = 0) => {
      if (reset) {
        setLoading(true);
        setAllItems([]);
        setCurrentOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const data = (await apiClient.listDirectory(path, {
          offset,
          limit: ITEMS_PER_LOAD,
        })) as DirectoryData;

        if (data.ok) {
          if (reset) {
            setAllItems(data.items);
          } else {
            setAllItems((prev) => [...prev, ...data.items]);
          }
          setCurrentPath(data.path);
          setHasMore(data.pagination?.hasMore || false);
          setCurrentOffset(
            data.pagination?.nextOffset || offset + data.items.length
          );
        } else {
          setError(data.error || "Failed to load directory");
        }
      } catch {
        setError("Network error while loading directory");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [ITEMS_PER_LOAD]
  );

  const loadMoreItems = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadDirectory(currentPath, false, currentOffset);
    }
  }, [currentPath, currentOffset, hasMore, loadingMore, loadDirectory]);

  const navigate = useCallback(
    (path: string) => {
      const newPath = path.startsWith("/")
        ? path
        : `${currentPath}/${path}`.replace(/\/+/g, "/");
      setCurrentPath(newPath);
      setAllItems([]);
      setCurrentOffset(0);
      setHasMore(true);
    },
    [currentPath]
  );

  const navigateUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    const newPath = parts.length > 0 ? "/" + parts.slice(0, -1).join("/") : "/";
    navigate(newPath);
  }, [currentPath, navigate]);

  const refreshDirectory = useCallback(() => {
    loadDirectory(currentPath, true, 0);
  }, [currentPath, loadDirectory]);

  useEffect(() => {
    loadDirectory(currentPath, true, 0);
  }, [loadDirectory, currentPath]);

  return {
    currentPath,
    setCurrentPath,
    loading,
    error,
    setError,
    allItems,
    hasMore,
    loadingMore,
    loadDirectory,
    loadMoreItems,
    navigate,
    navigateUp,
    refreshDirectory,
  };
}