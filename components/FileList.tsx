"use client";
import Image from "next/image";
import React from "react";
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
  viewMode: "grid" | "list";
  onNavigate: (path: string) => void;
  onSelect: (item: FileItem, selected: boolean) => void;
  onContextMenu: (e: React.MouseEvent, item?: FileItem) => void;
  onImageClick?: (item: FileItem) => void;
  onFileEdit?: (item: FileItem) => void;
  loading: boolean;
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
  viewMode,
  onNavigate,
  onSelect,
  onContextMenu,
  onImageClick,
  onFileEdit,
  loading,
}: FileListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-6 glass rounded-xl">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-cyan-500/20 dark:to-blue-500/20 rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-purple-500/20 dark:to-pink-500/20 rounded w-1/3"></div>
                <div className="h-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-green-500/20 dark:to-cyan-500/20 rounded w-1/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="glass rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-4 p-4 md:p-6 bg-slate-100/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200">
          <div className="col-span-6">Name</div>
          <div className="col-span-2 hidden md:block">Type</div>
          <div className="col-span-2 hidden lg:block">Size</div>
          <div className="col-span-2 hidden xl:block">Modified</div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/5">
          {items.map((item, index) => {
            const isSelected = selectedItems.has(item.name);
            return (
              <div
                key={item.name}
                className={`flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 transition-colors duration-200 ${
                  isSelected
                    ? "file-item-selected"
                    : "hover:bg-slate-100 dark:hover:bg-white/5"
                } group cursor-pointer interactive`}
                onContextMenu={(e) => onContextMenu(e, item)}
                onClick={(e) => {
                  // Check if Ctrl/Cmd key is held for multi-selection
                  if (e.ctrlKey || e.metaKey) {
                    onSelect(item, !isSelected);
                  } else if (selectedItems.size > 0) {
                    // If there are selected items, toggle current item selection
                    onSelect(item, !isSelected);
                  } else {
                    // Default behavior: navigate/open
                    if (item.type === "dir") {
                      onNavigate(item.name);
                    } else if (isEditableFile(item.name) && onFileEdit) {
                      onFileEdit(item);
                    } else if (isImageFile(item) && onImageClick) {
                      onImageClick(item);
                    } else {
                      window.open(item.url!, "_blank");
                    }
                  }
                }}
                style={{
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <div className="flex-1 sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(item, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 h-5 w-5 rounded border-slate-300 dark:border-white/30 bg-white dark:bg-white/5 text-blue-500 dark:text-cyan-500 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                  />
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
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate transition-colors text-sm sm:text-base">
                      {item.name}
                    </div>
                    <div className="sm:hidden text-xs text-slate-500 dark:text-gray-400 truncate mt-1">
                      {item.type} •{" "}
                      {item.size ? formatFileSize(item.size) : "N/A"}
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
      </div>
    );
  }

  // Grid view - Clean Card Design
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6">
      {items.map((item, index) => {
        const isSelected = selectedItems.has(item.name);
        return (
          <div
            key={item.name}
            className={`relative group glass rounded-xl transition-colors duration-200 ${
              isSelected
                ? "file-item-selected"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
            } cursor-pointer interactive`}
            onContextMenu={(e) => onContextMenu(e, item)}
            onClick={(e) => {
              // Check if Ctrl/Cmd key is held for multi-selection
              if (e.ctrlKey || e.metaKey) {
                onSelect(item, !isSelected);
              } else if (selectedItems.size > 0) {
                // If there are selected items, toggle current item selection
                onSelect(item, !isSelected);
              } else {
                // Default behavior: navigate/open
                if (item.type === "dir") {
                  onNavigate(item.name);
                } else if (isEditableFile(item.name) && onFileEdit) {
                  onFileEdit(item);
                } else if (isImageFile(item) && onImageClick) {
                  onImageClick(item);
                } else {
                  window.open(item.url!, "_blank");
                }
              }
            }}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            {/* Subtle hover overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-100/50 dark:bg-white/5"></div>

            <div className="p-3 sm:p-4 md:p-6 text-center relative z-10">
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
                  const iconClasses = getFileIcon(item).props.className.replace(
                    "h-10 w-10",
                    "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
                  );
                  return <IconComponent className={iconClasses} />;
                })()}
              </div>
              <h3 className="text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm mb-1 sm:mb-2 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {item.name}
              </h3>
              <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1 hidden sm:block">
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
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(item, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/30 bg-white dark:bg-white/5 text-blue-500 dark:text-sky-400 focus:ring-blue-500 dark:focus:ring-sky-400 focus:ring-offset-0 cursor-pointer transition-opacity"
                style={{ opacity: isSelected ? 1 : undefined }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
