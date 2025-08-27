"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  XMarkIcon,
  FolderIcon,
  CheckIcon,
  ChevronRightIcon,
  HomeIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface MoveCopyDialogProps {
  open: boolean;
  mode: "move" | "copy";
  currentPath: string;
  onClose: () => void;
  onConfirm: (targetPath: string) => void;
}

export interface DirectoryItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number; // epoch ms
  url?: string | null;
}

interface FsListResponse {
  ok: boolean;
  path: string;
  items: DirectoryItem[];
  error?: string;
}

export default function MoveCopyDialog({
  open,
  mode,
  currentPath,
  onClose,
  onConfirm,
}: MoveCopyDialogProps) {
  const [selectedPath, setSelectedPath] = useState<string>(currentPath || "/");
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedPath(currentPath || "/");
    setQuery("");
    setActiveIndex(0);
    void loadDirectories(currentPath || "/");
    // focus search once mounted
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPath]);

  async function loadDirectories(path: string): Promise<void> {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`, {
        signal: controller.signal,
        headers: { "x-requested-with": "MoveCopyDialog" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.includes("<html"))
        throw new Error("Unexpected HTML from server");
      const json: unknown = JSON.parse(text);
      if (!isFsListResponse(json)) {
        throw new Error("Malformed response");
      }
      if (!json.ok) throw new Error(json.error ?? "Failed to load");
      const dirs = json.items.filter((i) => i.type === "dir");
      setDirectories(dirs);
      setSelectedPath(json.path || path || "/");
      setActiveIndex(0);
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      setError(
        (e as Error).message || "Network error while loading directories"
      );
    } finally {
      setLoading(false);
    }
  }

  function navigateUp(): void {
    const parts = selectedPath.split("/").filter(Boolean);
    const parent = parts.length > 0 ? "/" + parts.slice(0, -1).join("/") : "/";
    void loadDirectories(parent);
  }

  function navigateHome(): void {
    void loadDirectories("/");
  }

  function navigateToDirectory(dirName: string): void {
    const next = `${selectedPath}/${dirName}`.replace(/\/+/g, "/");
    void loadDirectories(next);
  }

  function handleConfirm(): void {
    onConfirm(selectedPath || "/");
  }

  const filtered: DirectoryItem[] = useMemo(() => {
    if (!query.trim()) return directories;
    const q = query.toLowerCase();
    return directories.filter((d) => d.name.toLowerCase().includes(q));
  }, [directories, query]);

  // Keep active row smoothly in view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const row = container.querySelector<HTMLButtonElement>(
      `[data-row-index="${activeIndex}"]`
    );
    if (!row) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    row.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeIndex, filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          Math.min(i + 1, Math.max(filtered.length - 1, 0))
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          if (selectedPath !== currentPath) handleConfirm();
        } else {
          e.preventDefault();
          const dir = filtered[activeIndex];
          if (dir) navigateToDirectory(dir.name);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, selectedPath, currentPath]);

  if (!open) return null;

  const crumbs = selectedPath.split("/").filter(Boolean);

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "move" ? "Move" : "Copy"} to directory`}
    >
      <div
        className="w-full max-w-3xl h-[72vh] flex flex-col rounded-2xl
                   border border-zinc-200/60 bg-white/90 shadow-2xl
                   dark:border-zinc-800/60 dark:bg-zinc-900/90"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-blue-500/15 to-indigo-500/15 ring-1 ring-inset ring-blue-500/20 dark:from-blue-400/10 dark:to-indigo-400/10">
              <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === "move" ? "Move" : "Copy"} to
            </h2>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void loadDirectories(selectedPath)}
              className="rounded-xl px-3 py-2 text-sm font-medium
                         border border-zinc-200/60 bg-white/70 hover:bg-zinc-50
                         dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close dialog"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Path + Filter */}
        <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={navigateHome}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5
                         bg-zinc-100/70 hover:bg-zinc-200
                         dark:bg-zinc-800/70 dark:hover:bg-zinc-700
                         text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
              title="Go to root"
            >
              <HomeIcon className="h-4 w-4" />
              Root
            </button>

            {crumbs.length > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            )}

            <nav className="flex items-center gap-1 overflow-x-auto max-w-full">
              {crumbs.map((seg, i) => {
                const to = "/" + crumbs.slice(0, i + 1).join("/");
                const last = i === crumbs.length - 1;
                return (
                  <div key={to} className="flex items-center gap-1">
                    <button
                      onClick={() => void loadDirectories(to)}
                      className={`truncate max-w-[160px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors
                        ${
                          last
                            ? "bg-blue-600 text-white dark:bg-blue-500"
                            : "bg-zinc-100/70 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        }`}
                      title={to}
                    >
                      {seg}
                    </button>
                    {!last && (
                      <ChevronRightIcon className="h-4 w-4 mx-0.5 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="ml-auto relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Filter folders…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                // borderless, clean focus ring
                className="w-[240px] rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70
                           pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100
                           placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                           outline-none focus:ring-2 focus:ring-blue-500/50
                           shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <LoadingList />
          ) : error ? (
            <div className="h-full grid place-items-center px-6 text-center">
              <div className="space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {error}
                </p>
                <button
                  onClick={() => void loadDirectories(selectedPath)}
                  className="mx-auto rounded-lg px-3 py-2 text-sm font-medium
                             border border-zinc-200/60 bg-white/70 hover:bg-zinc-50
                             dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:hover:bg-zinc-800 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full grid place-items-center text-center px-6">
              <div className="space-y-2">
                <p className="text-zinc-600 dark:text-zinc-300 font-medium">
                  {query ? "No matching folders." : "No subfolders here."}
                </p>
                {selectedPath !== "/" && (
                  <button
                    onClick={navigateUp}
                    className="mx-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                               bg-zinc-100/70 hover:bg-zinc-200
                               dark:bg-zinc-800/70 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                    Go up
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={listRef}
              className="h-full overflow-y-auto scroll-smooth divide-y divide-zinc-200/60 dark:divide-zinc-800/60"
            >
              {filtered.map((dir, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={dir.name}
                    data-row-index={idx}
                    onClick={() => navigateToDirectory(dir.name)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors focus:outline-none
                                ${
                                  isActive
                                    ? "bg-blue-50/80 dark:bg-blue-500/10"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                                }`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl grid place-items-center ring-1 ring-inset
                                  ${
                                    isActive
                                      ? "bg-blue-600 ring-blue-500/60"
                                      : "bg-zinc-100 dark:bg-zinc-800 ring-zinc-200/60 dark:ring-zinc-700/60"
                                  }`}
                    >
                      <FolderIcon
                        className={`h-5 w-5 ${
                          isActive
                            ? "text-white"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span
                        className={`truncate text-sm font-medium ${
                          isActive
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {dir.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Updated {formatRelativeTime(dir.mtime)}
                      </span>
                    </div>
                    <ChevronRightIcon className="ml-auto h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
              Destination:{" "}
              <span className="font-mono font-medium">
                {selectedPath || "/"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedPath !== "/" && (
                <button
                  onClick={navigateUp}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
                             bg-zinc-100/70 hover:bg-zinc-200
                             dark:bg-zinc-800/70 dark:hover:bg-zinc-700 transition-colors"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  Up
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium
                           border border-zinc-200/60 bg-white/70 hover:bg-zinc-50
                           dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedPath === currentPath}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors
                  ${
                    selectedPath === currentPath
                      ? "cursor-not-allowed border border-zinc-200/60 bg-zinc-100 text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-800 dark:text-zinc-500"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                  }`}
                title={
                  selectedPath === currentPath
                    ? "Pick a different folder"
                    : undefined
                }
              >
                <CheckIcon className="h-4 w-4" />
                {mode === "move" ? "Move here" : "Copy here"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Tip: Use{" "}
            <kbd className="rounded border px-1 py-0.5 text-[10px]">↑</kbd>/
            <kbd className="rounded border px-1 py-0.5 text-[10px]">↓</kbd> to
            navigate,{" "}
            <kbd className="rounded border px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
            to open,{" "}
            <kbd className="rounded border px-1 py-0.5 text-[10px]">⌘/Ctrl</kbd>
            +<kbd className="rounded border px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
            to confirm.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: string }).name === "AbortError")
  );
}

function isFsListResponse(v: unknown): v is FsListResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const ok = typeof o.ok === "boolean";
  const path = typeof o.path === "string";
  const items = Array.isArray(o.items);
  const itemsShape = items
    ? (o.items as unknown[]).every((it) => {
        if (typeof it !== "object" || it === null) return false;
        const d = it as Record<string, unknown>;
        return (
          typeof d.name === "string" &&
          (d.type === "file" || d.type === "dir") &&
          typeof d.mtime === "number"
        );
      })
    : false;
  return ok && path && items && itemsShape;
}

function formatRelativeTime(epochMs: number): string {
  const diffMs = epochMs - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000)
    return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
}

function LoadingList(): React.JSX.Element {
  return (
    <div className="h-full overflow-hidden">
      <div className="animate-pulse divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-200/70 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-zinc-200/70 dark:bg-zinc-800" />
              <div className="h-2 w-24 rounded bg-zinc-200/70 dark:bg-zinc-800" />
            </div>
            <div className="h-5 w-5 rounded bg-zinc-200/70 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
