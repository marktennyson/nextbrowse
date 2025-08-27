"use client";
import Image from "next/image";
import React, { useRef, useCallback, useMemo } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  CubeIcon,
  CommandLineIcon,
  CircleStackIcon,
  ServerIcon,
  CpuChipIcon,
  BeakerIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { isEditableFile } from "@/lib/file-utils";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface FileListProps {
  items: FileItem[];
  selectedItems: Set<string>;
  highlightedItem: string | null;
  viewMode: "grid" | "list";
  onNavigate: (path: string) => void;
  onSelect: (item: FileItem, selected: boolean) => void;
  onHighlight: (item: FileItem | null) => void;
  onContextMenu: (e: React.MouseEvent, item?: FileItem) => void;
  onImageClick?: (item: FileItem) => void;
  onFileEdit?: (item: FileItem) => void;
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

function getFileIcon(item: FileItem) {
  if (item.type === "dir") {
    // Special folder types
    if (item.name.toLowerCase().includes("node_modules")) {
      return <CubeIcon className="h-10 w-10 file-icon-code" />;
    }
    if (item.name.toLowerCase().includes(".git")) {
      return <ServerIcon className="h-10 w-10 file-icon-default" />;
    }
    if (
      item.name.toLowerCase().includes("database") ||
      item.name.toLowerCase().includes("db")
    ) {
      return <CircleStackIcon className="h-10 w-10 file-icon-folder" />;
    }
    return <FolderIcon className="h-10 w-10 file-icon-folder interactive" />;
  }

  const ext = item.name.split(".").pop()?.toLowerCase();
  const baseName = item.name.toLowerCase();

  // Image files
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "tiff"].includes(
      ext || ""
    )
  ) {
    return <PhotoIcon className="h-10 w-10 file-icon-image interactive" />;
  }

  // Video files
  if (
    ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(
      ext || ""
    )
  ) {
    return <FilmIcon className="h-10 w-10 file-icon-video interactive" />;
  }

  // Audio files
  if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext || "")) {
    return (
      <MusicalNoteIcon className="h-10 w-10 file-icon-audio interactive" />
    );
  }

  // Code files
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "cpp",
      "c",
      "cs",
      "php",
      "rb",
      "go",
      "rs",
      "swift",
      "kt",
    ].includes(ext || "")
  ) {
    return <CodeBracketIcon className="h-10 w-10 file-icon-code interactive" />;
  }

  // Web files
  if (["html", "css", "scss", "sass", "less"].includes(ext || "")) {
    return <CpuChipIcon className="h-10 w-10 file-icon-code interactive" />;
  }

  // Config/Data files
  if (
    ["json", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf"].includes(
      ext || ""
    )
  ) {
    return <BeakerIcon className="h-10 w-10 file-icon-document interactive" />;
  }

  // Archive files
  if (["zip", "rar", "tar", "gz", "7z", "bz2", "xz"].includes(ext || "")) {
    return (
      <ArchiveBoxIcon className="h-10 w-10 file-icon-archive interactive" />
    );
  }

  // Document files
  if (["txt", "md", "doc", "docx", "pdf", "rtf", "odt"].includes(ext || "")) {
    return (
      <DocumentTextIcon className="h-10 w-10 file-icon-document interactive" />
    );
  }

  // Database files
  if (["db", "sqlite", "sql", "mdb"].includes(ext || "")) {
    return (
      <CircleStackIcon className="h-10 w-10 file-icon-folder interactive" />
    );
  }

  // Terminal/Script files
  if (["sh", "bash", "zsh", "fish", "ps1", "bat", "cmd"].includes(ext || "")) {
    return <CommandLineIcon className="h-10 w-10 file-icon-code interactive" />;
  }

  // Data/Analytics files
  if (["csv", "xlsx", "xls", "ods"].includes(ext || "")) {
    return (
      <ChartBarIcon className="h-10 w-10 file-icon-document interactive" />
    );
  }

  // Special files
  if (baseName.includes("readme")) {
    return <DocumentTextIcon className="h-10 w-10 file-icon-document" />;
  }
  if (baseName.includes("package.json")) {
    return <CubeIcon className="h-10 w-10 file-icon-code" />;
  }
  if (baseName.includes("dockerfile")) {
    return <ServerIcon className="h-10 w-10 file-icon-code" />;
  }

  return <DocumentIcon className="h-10 w-10 file-icon-default interactive" />;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageFile(item: FileItem): boolean {
  if (item.type !== "file" || !item.url) return false;
  const ext = item.name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(
    ext || ""
  );
}

export default function FileList({
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
  loading,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: FileListProps) {
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
        } else if (isEditableFile(item.name) && onFileEdit) {
          onFileEdit(item);
        } else if (isImageFile(item) && onImageClick) {
          onImageClick(item);
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
    return (
      <div
        className={
          viewMode === "list"
            ? "glass rounded-xl overflow-hidden"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6"
        }
      >
        {viewMode === "list" ? (
          <>
            <div className="hidden sm:grid grid-cols-12 gap-4 p-4 md:p-6 bg-slate-100/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200">
              <div className="col-span-6">Name</div>
              <div className="col-span-2 hidden md:block">Type</div>
              <div className="col-span-2 hidden lg:block">Size</div>
              <div className="col-span-2 hidden xl:block">Modified</div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6"
                >
                  <div className="flex-1 sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                      ></div>
                      <div
                        className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse sm:hidden"
                        style={{ width: `${40 + Math.random() * 30}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 items-center">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                  <div className="hidden xl:flex xl:col-span-2 items-center">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-xl p-3 sm:p-4 md:p-6 text-center"
            >
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div
                  className="h-3 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"
                  style={{ width: `${50 + Math.random() * 40}%` }}
                ></div>
                <div
                  className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mx-auto hidden sm:block"
                  style={{ width: `${30 + Math.random() * 30}%` }}
                ></div>
              </div>
              <div className="absolute top-3 right-3">
                <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div
        className="glass rounded-xl overflow-hidden"
        ref={containerRef}
        onClick={handleContainerClick}
      >
        <div className="hidden sm:grid grid-cols-12 gap-4 p-4 md:p-6 bg-slate-100/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200">
          <div className="col-span-6">Name</div>
          <div className="col-span-2 hidden md:block">Type</div>
          <div className="col-span-2 hidden lg:block">Size</div>
          <div className="col-span-2 hidden xl:block">Modified</div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/5">
          {uniqueItems.map((item, index) => {
            const isSelected = selectedItems.has(item.name);
            const isHighlighted = highlightedItem === item.name;
            const showBlueBorder =
              isSelected || (isHighlighted && selectedItems.size === 0);
            return (
              <div
                key={item.name}
                className={`flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 transition-all duration-300 file-item-no-select min-h-[80px] sm:min-h-[88px] ${
                  showBlueBorder
                    ? "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700/50 shadow-md border-2 border-blue-500 dark:border-blue-400 file-item-blue-border"
                    : "hover:bg-slate-50 dark:hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                } group cursor-pointer rounded-lg file-item-animate`}
                onContextMenu={(e) => onContextMenu(e, item)}
                onClick={(e) => handleItemClick(item, isSelected, e)}
                onMouseDown={(e) => {
                  // Prevent text selection
                  if (e.detail > 1) {
                    e.preventDefault();
                  }
                }}
                style={{
                  animationDelay: `${index * 0.03}s`,
                }}
              >
                <div className="flex-1 sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelect(item, e.target.checked);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle Cmd+click / Ctrl+click on checkbox same as on item
                        if (e.ctrlKey || e.metaKey) {
                          onSelect(item, !isSelected);
                        }
                      }}
                      className={`relative z-10 h-5 w-5 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0 cursor-pointer ${
                        selectedItems.size > 0
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } ${
                        isSelected
                          ? "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white focus:ring-blue-500/20"
                          : "border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-blue-500 hover:border-blue-400 dark:hover:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Thumbnail for images */}
                  {(() => {
                    const ext = item.name.split(".").pop()?.toLowerCase();
                    if (
                      [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                        "bmp",
                        "tiff",
                      ].includes(ext || "") &&
                      item.url
                    ) {
                      return (
                        <Image
                          src={item.url}
                          alt={item.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover border border-slate-200 dark:border-white/10 hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onImageClick) {
                              onImageClick(item);
                            }
                          }}
                          onError={(e) => {
                            // On error, hide the image and show default icon
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      );
                    }
                    return getFileIcon(item);
                  })()}
                  <div className="min-w-0 flex-1 relative">
                    <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate transition-colors text-sm sm:text-base">
                      {item.name}
                    </div>
                    <div className="sm:hidden text-xs text-slate-500 dark:text-gray-400 truncate mt-1">
                      {item.type} •{" "}
                      {item.size ? formatFileSize(item.size) : "N/A"}
                    </div>
                    {/* Double-click hint */}
                    <div className="double-click-hint">
                      Double-click to {item.type === "dir" ? "open" : "view"}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex sm:col-span-2 md:col-span-2 items-center text-sm text-slate-600 dark:text-gray-300 capitalize">
                  {item.type}
                </div>
                <div className="hidden lg:flex lg:col-span-2 items-center text-sm text-slate-600 dark:text-gray-300">
                  {formatFileSize(item.size)}
                </div>
                <div className="hidden xl:flex xl:col-span-2 items-center text-sm text-slate-600 dark:text-gray-300">
                  {formatDate(item.mtime)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Infinite scroll loading indicator */}
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

  // Grid view - Clean Card Design
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      {uniqueItems.map((item, index) => {
        const isSelected = selectedItems.has(item.name);
        const isHighlighted = highlightedItem === item.name;
        const showBlueBorder =
          isSelected || (isHighlighted && selectedItems.size === 0);
        return (
          <div
            key={item.name}
            className={`relative group glass rounded-xl transition-all duration-300 transform hover:scale-[1.02] file-item-no-select ${
              showBlueBorder
                ? "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700/50 shadow-lg border-2 border-blue-500 dark:border-blue-400 file-item-blue-border"
                : "border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
            } cursor-pointer interactive file-item-animate`}
            onContextMenu={(e) => onContextMenu(e, item)}
            onClick={(e) => handleItemClick(item, isSelected, e)}
            onMouseDown={(e) => {
              // Prevent text selection
              if (e.detail > 1) {
                e.preventDefault();
              }
            }}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Subtle hover overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-100/50 dark:bg-white/5"></div>

            <div className="p-3 sm:p-4 md:p-6 text-center relative z-10 h-full flex flex-col justify-between min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
              <div className="flex flex-col items-center flex-1">
                <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                  {(() => {
                    const ext = item.name.split(".").pop()?.toLowerCase();
                    if (
                      [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                        "bmp",
                        "tiff",
                      ].includes(ext || "") &&
                      item.url
                    ) {
                      return (
                        <Image
                          src={item.url}
                          alt={item.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-lg object-cover border border-slate-200 dark:border-white/10 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onImageClick) {
                              onImageClick(item);
                            }
                          }}
                          onError={(e) => {
                            // On error, hide the image and show default icon
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      );
                    }
                    // Return scaled icon for different screen sizes
                    const IconComponent = getFileIcon(item).type;
                    const iconClasses = getFileIcon(
                      item
                    ).props.className.replace(
                      "h-10 w-10",
                      "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
                    );
                    return <IconComponent className={iconClasses} />;
                  })()}
                </div>
                <h3 className="text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm mb-1 sm:mb-2 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors relative w-full">
                  {item.name}
                  {/* Double-click hint */}
                  <div className="double-click-hint">
                    Double-click to {item.type === "dir" ? "open" : "view"}
                  </div>
                </h3>
              </div>
              <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1 hidden sm:block mt-auto">
                {item.size && (
                  <div className="flex justify-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-xs">
                      {formatFileSize(item.size)}
                    </span>
                  </div>
                )}
                <div className="text-slate-500 dark:text-gray-500 text-xs hidden md:block">
                  {formatDate(item.mtime)}
                </div>
              </div>
            </div>

            {/* Selection checkbox */}
            <div className="absolute top-3 right-3 z-10">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect(item, e.target.checked);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle Cmd+click / Ctrl+click on checkbox same as on item
                    if (e.ctrlKey || e.metaKey) {
                      onSelect(item, !isSelected);
                    }
                  }}
                  className={`h-4 w-4 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0 cursor-pointer ${
                    selectedItems.size > 0
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  } ${
                    isSelected
                      ? "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white focus:ring-blue-500/20"
                      : "border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-blue-500 hover:border-blue-400 dark:hover:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Infinite scroll loading indicator for grid view */}
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
}
