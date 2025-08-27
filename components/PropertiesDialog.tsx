"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  LinkIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

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

  /** Optional quick action handlers (use your API routes behind these) */
  onDownload?: (item: FileItem) => void;
  onRevealInFolder?: (item: FileItem) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === undefined || bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  const decimals = size < 10 && unitIndex > 0 ? 1 : 0;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function getFileIcon(item: FileItem) {
  if (item.type === "dir") {
    return <FolderIcon className="h-8 w-8 text-cyan-400" />;
  }
  const ext = item.name.split(".").pop()?.toLowerCase();

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "tiff"].includes(
      ext || ""
    )
  ) {
    return <PhotoIcon className="h-8 w-8 text-green-400" />;
  }
  if (
    ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(
      ext || ""
    )
  ) {
    return <FilmIcon className="h-8 w-8 text-purple-400" />;
  }
  if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext || "")) {
    return <MusicalNoteIcon className="h-8 w-8 text-pink-400" />;
  }
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
      "json",
      "yml",
      "yaml",
      "md",
    ].includes(ext || "")
  ) {
    return <CodeBracketIcon className="h-8 w-8 text-yellow-400" />;
  }
  if (["zip", "rar", "tar", "gz", "7z", "bz2", "xz"].includes(ext || "")) {
    return <ArchiveBoxIcon className="h-8 w-8 text-orange-400" />;
  }
  return <DocumentIcon className="h-8 w-8 text-gray-400" />;
}

function getAccent(item: FileItem) {
  if (item.type === "dir")
    return {
      ring: "ring-cyan-500/40",
      dot: "bg-cyan-400",
      grad: "from-cyan-500/15 to-transparent",
    };
  const ext = item.name.split(".").pop()?.toLowerCase();
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "tiff"].includes(
      ext || ""
    )
  )
    return {
      ring: "ring-green-500/40",
      dot: "bg-green-400",
      grad: "from-green-500/15 to-transparent",
    };
  if (
    ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(
      ext || ""
    )
  )
    return {
      ring: "ring-purple-500/40",
      dot: "bg-purple-400",
      grad: "from-purple-500/15 to-transparent",
    };
  if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext || ""))
    return {
      ring: "ring-pink-500/40",
      dot: "bg-pink-400",
      grad: "from-pink-500/15 to-transparent",
    };
  if (["zip", "rar", "tar", "gz", "7z", "bz2", "xz"].includes(ext || ""))
    return {
      ring: "ring-orange-500/40",
      dot: "bg-orange-400",
      grad: "from-orange-500/15 to-transparent",
    };
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
      "json",
      "yml",
      "yaml",
      "md",
    ].includes(ext || "")
  )
    return {
      ring: "ring-yellow-500/40",
      dot: "bg-yellow-400",
      grad: "from-yellow-500/15 to-transparent",
    };
  return {
    ring: "ring-white/20",
    dot: "bg-gray-400",
    grad: "from-white/10 to-transparent",
  };
}

export default function PropertiesDialog({
  open,
  item,
  path,
  onClose,
  onDownload,
  onRevealInFolder,
}: PropertiesDialogProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const extension = useMemo(
    () =>
      item?.type === "file" ? item.name.split(".").pop()?.toLowerCase() : null,
    [item]
  );
  const isImage = useMemo(
    () =>
      Boolean(
        extension &&
          ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(
            extension
          )
      ),
    [extension]
  );

  const accent = useMemo(
    () =>
      item ? getAccent(item) : getAccent({ name: "", type: "file", mtime: 0 }),
    [item]
  );

  // Esc to close + focus management
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "c" &&
        item?.url
      ) {
        navigator.clipboard?.writeText(item.url);
      }
    };
    document.addEventListener("keydown", onKey);
    // Slight delay to allow mount before focusing
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose, item?.url]);

  if (!open || !item) return null;

  const modified = new Date(item.mtime);
  const typeLabel =
    item.type === "dir"
      ? "Folder"
      : extension
      ? `${extension.toUpperCase()} File`
      : "File";

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  /** Prevent dialog layout shift for images by reserving space */
  const Preview = () => {
    if (!(isImage && item.url)) return null;
    return (
      <div className="relative rounded-lg border border-white/10 overflow-hidden">
        {/* reserved aspect ratio box to avoid CLS */}
        <div className="w-full" style={{ aspectRatio: "16 / 9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url!}
            alt={item.name}
            className={`h-full w-full object-contain transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />
        </div>
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="File properties"
              className={`relative w-full max-w-2xl rounded-2xl glass-dark border border-white/10 shadow-2xl ring-1 ${accent.ring}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 30,
                mass: 0.8,
              }}
            >
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent.grad}`}
                />
                <div className="flex items-start justify-between p-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative">
                      {getFileIcon(item)}
                      <span
                        className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${accent.dot} shadow`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-white leading-tight">
                        Properties
                      </h2>
                      <p
                        className="text-sm text-gray-400 truncate max-w-[22rem]"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-gray-200 hover:bg-white/10 transition"
                        title="Open in new tab"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        Open
                      </a>
                    )}
                    <button
                      ref={closeBtnRef}
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-white/10 transition text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      aria-label="Close dialog"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-0">
                {/* Preview + Quick actions */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                  <div className="md:col-span-3">
                    <Preview />

                    {/* Quick actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {onDownload && item.type === "file" && (
                        <button
                          onClick={() => onDownload?.(item)}
                          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 px-3 py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </button>
                      )}

                      {onRevealInFolder && (
                        <button
                          onClick={() => onRevealInFolder?.(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition"
                        >
                          <MapPinIcon className="h-4 w-4" />
                          Reveal in folder
                        </button>
                      )}

                      {item.url && (
                        <>
                          <button
                            onClick={() => handleCopy(item.url!)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition"
                            title="Copy URL"
                          >
                            <ClipboardIcon className="h-4 w-4" />
                            Copy URL
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition"
                          >
                            <LinkIcon className="h-4 w-4" />
                            Open link
                          </a>
                        </>
                      )}

                      <button
                        onClick={() => handleCopy(item.name)}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition"
                        title="Copy name"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                        Copy name
                      </button>

                      <button
                        onClick={() => handleCopy(path)}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition"
                        title="Copy path"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                        Copy path
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="md:col-span-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-200">
                          {typeLabel}
                        </span>
                        {extension && item.type === "file" && (
                          <span className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-xs text-gray-300">
                            .{extension}
                          </span>
                        )}
                      </div>

                      <dl className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-start gap-3">
                          <TagIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <dt className="text-gray-400">Name</dt>
                            <dd
                              className="truncate text-white"
                              title={item.name}
                            >
                              {item.name}
                            </dd>
                          </div>
                        </div>

                        {item.size !== undefined && (
                          <div className="flex items-start gap-3">
                            <ScaleIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <dt className="text-gray-400">Size</dt>
                              <dd className="text-white">
                                {formatFileSize(item.size)}{" "}
                                <span className="text-gray-400">
                                  ({item.size.toLocaleString()} bytes)
                                </span>
                              </dd>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <dt className="text-gray-400">Modified</dt>
                            <dd className="text-white">
                              {new Intl.DateTimeFormat(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(modified)}
                            </dd>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <dt className="text-gray-400">Location</dt>
                            <dd
                              className="font-mono text-xs text-white/90 truncate"
                              title={path}
                            >
                              {path}
                            </dd>
                          </div>
                        </div>

                        {item.url && (
                          <div className="flex items-start gap-3">
                            <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <dt className="text-gray-400">URL</dt>
                              <dd
                                className="truncate text-cyan-300"
                                title={item.url}
                              >
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline break-all"
                                >
                                  {item.url}
                                </a>
                              </dd>
                            </div>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-white/10 rounded-b-2xl">
                <div className="text-xs text-gray-400">
                  Press{" "}
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd>{" "}
                  to close
                  {item.url && (
                    <>
                      ,{" "}
                      <kbd className="rounded bg-white/10 px-1.5 py-0.5">
                        ⌘/Ctrl
                      </kbd>
                      +
                      <kbd className="rounded bg-white/10 px-1.5 py-0.5">C</kbd>{" "}
                      to copy URL
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
