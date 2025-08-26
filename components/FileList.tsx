"use client";
import React from "react";
import { 
  FolderIcon, 
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

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
  loading: boolean;
}

function getFileIcon(item: FileItem) {
  if (item.type === "dir") {
    return <FolderIcon className="h-8 w-8 text-blue-500" />;
  }
  
  const ext = item.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <PhotoIcon className="h-8 w-8 text-green-500" />;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return <FilmIcon className="h-8 w-8 text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'ogg':
      return <MusicalNoteIcon className="h-8 w-8 text-pink-500" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return <CodeBracketIcon className="h-8 w-8 text-orange-500" />;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return <ArchiveBoxIcon className="h-8 w-8 text-yellow-500" />;
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <DocumentTextIcon className="h-8 w-8 text-blue-400" />;
    default:
      return <DocumentIcon className="h-8 w-8 text-gray-500" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function FileList({ 
  items, 
  selectedItems, 
  viewMode, 
  onNavigate, 
  onSelect, 
  onContextMenu, 
  loading 
}: FileListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
              <div className="h-8 w-8 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg border shadow-soft overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-600">
          <div className="col-span-6">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Modified</div>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const isSelected = selectedItems.has(item.name);
            return (
              <div
                key={item.name}
                className={`grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                } group cursor-pointer`}
                onContextMenu={(e) => onContextMenu(e, item)}
              >
                <div 
                  className="col-span-6 flex items-center space-x-3"
                  onClick={() => item.type === "dir" ? onNavigate(item.name) : window.open(item.url!, "_blank")}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(item, e.target.checked);
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  {getFileIcon(item)}
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-500 capitalize">
                  {item.type}
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-500">
                  {formatFileSize(item.size)}
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-500">
                  {formatDate(item.mtime)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      {items.map((item) => {
        const isSelected = selectedItems.has(item.name);
        return (
          <div
            key={item.name}
            className={`relative group bg-white rounded-lg border shadow-soft hover:shadow-medium transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-gray-300'
            } cursor-pointer`}
            onContextMenu={(e) => onContextMenu(e, item)}
          >
            <div
              className="p-4 text-center"
              onClick={() => item.type === "dir" ? onNavigate(item.name) : window.open(item.url!, "_blank")}
            >
              <div className="flex justify-center mb-3">
                {getFileIcon(item)}
              </div>
              <div className="text-sm font-medium text-gray-900 truncate mb-1" title={item.name}>
                {item.name}
              </div>
              <div className="text-xs text-gray-500">
                {item.type === "dir" ? "Folder" : formatFileSize(item.size)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatDate(item.mtime)}
              </div>
            </div>
            
            {/* Selection checkbox */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(item, e.target.checked);
                }}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-white border-gray-300"
              />
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
