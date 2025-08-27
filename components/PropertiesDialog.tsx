"use client";
import React from "react";
import {
  XMarkIcon,
  DocumentIcon,
  FolderIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ScaleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface PropertiesDialogProps {
  open: boolean;
  item: FileItem | null;
  path: string;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function getFileIcon(item: FileItem) {
  if (item.type === "dir") {
    return <FolderIcon className="h-8 w-8 text-cyan-400" />;
  }

  const ext = item.name.split(".").pop()?.toLowerCase();

  // Image files
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "tiff"].includes(ext || "")) {
    return <PhotoIcon className="h-8 w-8 text-green-400" />;
  }

  // Video files
  if (["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(ext || "")) {
    return <FilmIcon className="h-8 w-8 text-purple-400" />;
  }

  // Audio files
  if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext || "")) {
    return <MusicalNoteIcon className="h-8 w-8 text-pink-400" />;
  }

  // Code files
  if (["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "cs", "php", "rb", "go", "rs", "swift", "kt"].includes(ext || "")) {
    return <CodeBracketIcon className="h-8 w-8 text-yellow-400" />;
  }

  // Archive files
  if (["zip", "rar", "tar", "gz", "7z", "bz2", "xz"].includes(ext || "")) {
    return <ArchiveBoxIcon className="h-8 w-8 text-orange-400" />;
  }

  return <DocumentIcon className="h-8 w-8 text-gray-400" />;
}

export default function PropertiesDialog({
  open,
  item,
  path,
  onClose,
}: PropertiesDialogProps) {
  if (!open || !item) return null;

  const extension = item.type === "file" ? item.name.split(".").pop()?.toLowerCase() : null;
  const isImage = extension && ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"].includes(extension);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative glass-dark rounded-xl border border-white/10 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            {getFileIcon(item)}
            <div>
              <h2 className="text-lg font-semibold text-white">Properties</h2>
              <p className="text-sm text-gray-400 truncate max-w-xs">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Image preview */}
          {isImage && item.url && (
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className="max-w-full max-h-32 rounded-lg object-contain border border-white/10"
              />
            </div>
          )}

          {/* Properties list */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <TagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-400">Name</div>
                <div className="text-white font-medium truncate">{item.name}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-400">Type</div>
                <div className="text-white capitalize">
                  {item.type === "dir" ? "Folder" : extension ? `${extension.toUpperCase()} File` : "File"}
                </div>
              </div>
            </div>

            {item.size !== undefined && (
              <div className="flex items-center space-x-3">
                <ScaleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Size</div>
                  <div className="text-white">
                    {formatFileSize(item.size)} ({item.size.toLocaleString()} bytes)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-400">Modified</div>
                <div className="text-white">
                  {new Date(item.mtime).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-400">Location</div>
                <div className="text-white font-mono text-sm truncate">{path}</div>
              </div>
            </div>

            {item.url && (
              <div className="flex items-center space-x-3">
                <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">URL</div>
                  <div className="text-cyan-400 text-sm truncate">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {item.url}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}