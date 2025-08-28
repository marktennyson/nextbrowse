"use client";
import React, { useRef, useCallback, useMemo } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import FileItemList from "./FileItemList";
import FileItemGrid from "./FileItemGrid";
import LoadingSkeleton from "./LoadingSkeleton";
import { FileItem, FileListProps, isAudioFile } from "./utils";

const FileList: React.FC<FileListProps> = ({
  items,
  selectedItems,
  highlightedItem,
  viewMode,
  onNavigate,
  onSelect,
  onHighlight,
  onContextMenu,
  onImageClick,
  onFileEdit,
  onAudioPlay,
  loading,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}) => {
  // Deduplicate items by name to avoid rendering duplicates
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((it) => {
      if (seen.has(it.name)) return false;
      seen.add(it.name);
      return true;
    });
  }, [items]);

  // Track click timers for double-click detection
  const clickTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll hook
  const { loadingRef } = useInfiniteScroll({
    hasMore: hasMore && !loading,
    loading: loadingMore,
    onLoadMore: onLoadMore || (() => {}),
    rootMargin: "200px",
  });

  const handleItemClick = useCallback(
    (item: FileItem, isSelected: boolean, event: React.MouseEvent) => {
      // Prevent text selection on double-click
      event.preventDefault();

      // Handle Cmd+click / Ctrl+click for multi-selection anywhere on the item
      if (event.ctrlKey || event.metaKey) {
        onSelect(item, !isSelected);
        return;
      }

      // If items are already selected (multi-select mode), clicking selects/deselects
      if (selectedItems.size > 0) {
        onSelect(item, !isSelected);
        return;
      }

      const timers = clickTimersRef.current;
      const itemKey = item.name;

      if (timers.has(itemKey)) {
        // Double click detected - perform navigation/open action
        clearTimeout(timers.get(itemKey)!);
        timers.delete(itemKey);

        // Double click action: open/navigate
        if (item.type === "dir") {
          onNavigate(item.name);
        } else if (isAudioFile(item) && onAudioPlay) {
          onAudioPlay(item);
        } else if (isImageFile(item) && onImageClick) {
          onImageClick(item);
        } else if (onFileEdit && item.type === "file") {
          onFileEdit(item);
        } else if (item.url) {
          window.open(item.url, "_blank");
        }
      } else {
        // First click - set timer for single click
        const timer = setTimeout(() => {
          timers.delete(itemKey);

          // Single click in normal mode: just highlight (show blue border), don't select
          if (highlightedItem === item.name) {
            // If already highlighted, remove highlight
            onHighlight(null);
          } else {
            // Highlight this item
            onHighlight(item);
          }
        }, 300);

        timers.set(itemKey, timer);
      }
    },
    [
      onSelect,
      onNavigate,
      onFileEdit,
      onImageClick,
      onAudioPlay,
      selectedItems,
      highlightedItem,
      onHighlight,
    ]
  );

  // Handle click outside to remove highlight
  const handleContainerClick = useCallback(
    (event: React.MouseEvent) => {
      // Only handle clicks on the container itself (empty space)
      if (event.target === containerRef.current) {
        onHighlight(null);
      }
    },
    [onHighlight]
  );

  // Cleanup timers on unmount
  React.useEffect(() => {
    const timers = clickTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (loading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (viewMode === "list") {
    return (
      <div ref={containerRef} onClick={handleContainerClick}>
        <FileItemList
          items={uniqueItems}
          selectedItems={selectedItems}
          highlightedItem={highlightedItem}
          onSelect={onSelect}
          onHighlight={onHighlight}
          onContextMenu={onContextMenu}
          onImageClick={onImageClick}
          onFileEdit={onFileEdit}
          onAudioPlay={onAudioPlay}
          onItemClick={handleItemClick}
          loadingRef={loadingRef}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />

        {(hasMore || loadingMore) && (
          <div ref={loadingRef} className="flex justify-center p-4">
            {loadingMore ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Loading more items...
                </span>
              </div>
            ) : hasMore ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Scroll down to load more
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div ref={containerRef} onClick={handleContainerClick}>
      <FileItemGrid
        items={uniqueItems}
        selectedItems={selectedItems}
        highlightedItem={highlightedItem}
        onSelect={onSelect}
        onHighlight={onHighlight}
        onContextMenu={onContextMenu}
        onImageClick={onImageClick}
        onFileEdit={onFileEdit}
        onAudioPlay={onAudioPlay}
        onItemClick={handleItemClick}
        loadingRef={loadingRef}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />

      {(hasMore || loadingMore) && (
        <div ref={loadingRef} className="col-span-full flex justify-center p-8">
          {loadingMore ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Loading more items...
              </span>
            </div>
          ) : hasMore ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Scroll down to load more
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Local helper used only here to preserve the original behaviour when double-clicking images
function isImageFile(item: FileItem): boolean {
  if (item.type !== "file" || !item.url) return false;
  const ext = item.name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(
    ext || ""
  );
}

export default FileList;
