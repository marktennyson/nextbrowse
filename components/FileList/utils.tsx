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

export interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

export interface FileListProps {
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

export function getFileIcon(item: FileItem) {
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

export function formatFileSize(bytes?: number): string {
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

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isImageFile(item: FileItem): boolean {
  if (item.type !== "file" || !item.url) return false;
  const ext = item.name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(
    ext || ""
  );
}
