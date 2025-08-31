import { useCallback } from "react";
import { handleErrorResponse } from "@/lib/api-helpers";
import type { FileItem } from "./useFileData";

interface UseFileOperationsProps {
  currentPath: string;
  selectedItems: Set<string>;
  allItems: FileItem[];
  refreshDirectory: () => void;
  clearSelection: () => void;
  setError: (error: string | null) => void;
}

export function useFileOperations({
  currentPath,
  selectedItems,
  allItems,
  refreshDirectory,
  clearSelection,
  setError,
}: UseFileOperationsProps) {
  const deleteSelected = useCallback(async () => {
    const itemsToDelete = Array.from(selectedItems);

    try {
      for (const itemName of itemsToDelete) {
        const itemPath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
        const response = await fetch("/api/fs/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: itemPath }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        }
      }

      refreshDirectory();
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete operation failed");
    }
  }, [selectedItems, currentPath, refreshDirectory, clearSelection, setError]);

  const downloadSelected = useCallback(async () => {
    const itemsToDownload = Array.from(selectedItems);

    if (itemsToDownload.length === 0) return;

    if (itemsToDownload.length === 1) {
      const itemName = itemsToDownload[0];
      const itemPath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
      const downloadUrl = `/api/fs/download?path=${encodeURIComponent(
        itemPath
      )}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      const item = allItems.find((i) => i.name === itemName);
      link.download = item?.type === "dir" ? `${itemName}.zip` : itemName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const zipName = `${
        allItems.length > 1 ? "selected-items" : "download"
      }.zip`;

      try {
        const files = itemsToDownload.map((itemName) =>
          `${currentPath}/${itemName}`.replace(/\/+/g, "/")
        );

        const response = await fetch("/api/fs/download-multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = zipName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          await handleErrorResponse(response);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    }

    clearSelection();
  }, [selectedItems, currentPath, allItems, clearSelection, setError]);

  const handleMoveCopy = useCallback(
    async (targetPath: string, mode: "move" | "copy", items: string[]) => {
      try {
        for (const itemName of items) {
          const sourcePath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
          const response = await fetch(`/api/fs/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: sourcePath,
              destination: `${targetPath}/${itemName}`.replace(/\/+/g, "/"),
            }),
          });

          if (!response.ok) {
            await handleErrorResponse(response);
          }
        }

        refreshDirectory();
        clearSelection();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `${mode} operation failed`
        );
      }
    },
    [currentPath, refreshDirectory, clearSelection, setError]
  );

  const createFolder = useCallback(
    async (folderName: string) => {
      try {
        const response = await fetch("/api/fs/mkdir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Go backend expects parent path + name
          body: JSON.stringify({ path: currentPath, name: folderName }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        }

        refreshDirectory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create folder failed");
      }
    },
    [currentPath, refreshDirectory, setError]
  );

  const createFile = useCallback(
    async (fileName: string) => {
      try {
        // Create an empty file via single-chunk upload (Go backend supports this path)
        const formData = new FormData();
        formData.append("path", currentPath);
        formData.append("fileName", fileName);
        formData.append(
          "fileId",
          `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        formData.append("chunkIndex", "0");
        formData.append("totalChunks", "1");
        // Empty chunk to create 0-byte file
        const emptyBlob = new Blob([], { type: "application/octet-stream" });
        formData.append("chunk", emptyBlob, fileName);

        const response = await fetch("/api/fs/upload-chunk", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        }

        refreshDirectory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create file failed");
      }
    },
    [currentPath, refreshDirectory, setError]
  );

  const handleRename = useCallback(
    async (item: FileItem, newName: string) => {
      const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");
      const newPath = `${currentPath}/${newName}`.replace(/\/+/g, "/");

      try {
        const response = await fetch("/api/fs/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: itemPath,
            destination: newPath,
          }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        } else {
          refreshDirectory();
        }
      } catch {
        setError("Failed to rename item");
      }
    },
    [currentPath, refreshDirectory, setError]
  );

  const deleteItem = useCallback(
    async (item: FileItem) => {
      const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");

      try {
        const response = await fetch("/api/fs/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: itemPath }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        } else {
          refreshDirectory();
        }
      } catch {
        setError("Failed to delete item");
      }
    },
    [currentPath, refreshDirectory, setError]
  );

  const downloadItem = useCallback(
    (item: FileItem) => {
      const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");
      const downloadUrl = `/api/fs/download?path=${encodeURIComponent(
        itemPath
      )}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = item.type === "dir" ? `${item.name}.zip` : item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [currentPath]
  );

  return {
    deleteSelected,
    downloadSelected,
    handleMoveCopy,
    createFolder,
    createFile,
    handleRename,
    deleteItem,
    downloadItem,
  };
}
