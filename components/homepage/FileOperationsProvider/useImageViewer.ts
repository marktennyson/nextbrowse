import { useState, useCallback } from "react";
import type { ImageViewerState, FileItem } from "./types";

export function useImageViewer() {
  const [imageViewer, setImageViewer] = useState<ImageViewerState>({
    open: false,
    currentIndex: 0,
  });

  const openImageViewer = useCallback(
    (item: FileItem, filteredItems: FileItem[]) => {
      // Find all image files in current directory
      const imageItems = filteredItems.filter((file) => {
        if (file.type !== "file" || !file.url) return false;
        const ext = file.name.split(".").pop()?.toLowerCase();
        return [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "bmp",
          "tiff",
          "svg",
        ].includes(ext || "");
      });

      const currentIndex = imageItems.findIndex(
        (img) => img.name === item.name
      );
      if (currentIndex >= 0) {
        setImageViewer({ open: true, currentIndex });
      }
    },
    []
  );

  const closeImageViewer = useCallback(() => {
    setImageViewer({ open: false, currentIndex: 0 });
  }, []);

  const navigateImageViewer = useCallback((index: number) => {
    setImageViewer((prev) => ({ ...prev, currentIndex: index }));
  }, []);

  return {
    imageViewer,
    setImageViewer,
    openImageViewer,
    closeImageViewer,
    navigateImageViewer,
  };
}