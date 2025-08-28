"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { editor } from "monaco-editor";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  CommandLineIcon,
  BugAntIcon,
  PlayIcon,
  PuzzlePieceIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import Monaco from "./Monaco";
import FileTree from "./FileTree";
import FileTab from "./FileTab";
import StatusBar from "./StatusBar";
import { getFileLanguage, isTextFile } from "@/lib/file-utils";
import { apiClient } from "@/lib/api-client";

interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  language: string;
  size: number;
  mtime: number;
  cursorPosition?: { line: number; column: number };
}

interface IDEProps {
  rootPath?: string;
  initialFile?: string;
  className?: string;
}

type SidebarView = "explorer" | "search" | "scm" | "run" | "extensions";
type BottomView = "terminal" | "output" | "problems";

const LS_KEYS = {
  sidebarWidth: "nb.ide.sidebarWidth",
  bottomHeight: "nb.ide.bottomHeight",
  sidebarCollapsed: "nb.ide.sidebarCollapsed",
  bottomOpen: "nb.ide.bottomOpen",
  autosave: "nb.ide.autosave",
};

export default function IDE({
  rootPath = "/",
  initialFile,
  className = "",
}: IDEProps) {
  const router = useRouter();

  // Files & editor
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Layout
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
  const [bottomView, setBottomView] = useState<BottomView>("terminal");
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem(LS_KEYS.sidebarWidth));
    return Number.isFinite(saved) && saved > 160 ? saved : 240;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(LS_KEYS.sidebarCollapsed) === "1";
  });
  const [bottomOpen, setBottomOpen] = useState<boolean>(() => {
    return localStorage.getItem(LS_KEYS.bottomOpen) !== "0";
  });
  const [bottomHeight, setBottomHeight] = useState<number>(() => {
    const saved = Number(localStorage.getItem(LS_KEYS.bottomHeight));
    return Number.isFinite(saved) && saved > 120 ? saved : 220;
  });

  // UX state
  const [isLoading, setIsLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [quickOpenValue, setQuickOpenValue] = useState("");
  const [autosave, setAutosave] = useState<boolean>(() => {
    return localStorage.getItem(LS_KEYS.autosave) === "1";
  });

  // Refs
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const resizingSidebarRef = useRef(false);
  const resizingBottomRef = useRef(false);
  const lastSidebarWidthRef = useRef(sidebarWidth);

  // Derived
  const activeFileData = activeFile ? openFiles[activeFile] : null;
  const isDirty = activeFileData
    ? activeFileData.content !== activeFileData.originalContent
    : false;

  const breadcrumbs = useMemo(() => {
    if (!activeFile) return [];
    const parts = activeFile.split("/").filter(Boolean);
    const out: { label: string; path: string }[] = [];
    let acc = activeFile.startsWith("/") ? "" : ".";
    parts.forEach((p) => {
      acc = acc ? `${acc}/${p}` : p;
      out.push({ label: p, path: acc });
    });
    return out;
  }, [activeFile]);

  // Persist layout
  useEffect(() => {
    localStorage.setItem(LS_KEYS.sidebarWidth, String(sidebarWidth));
  }, [sidebarWidth]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.bottomHeight, String(bottomHeight));
  }, [bottomHeight]);
  useEffect(() => {
    localStorage.setItem(
      LS_KEYS.sidebarCollapsed,
      sidebarCollapsed ? "1" : "0"
    );
  }, [sidebarCollapsed]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.bottomOpen, bottomOpen ? "1" : "0");
  }, [bottomOpen]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.autosave, autosave ? "1" : "0");
  }, [autosave]);

  // Core actions
  const loadFile = useCallback(
    async (path: string) => {
      if (openFiles[path]) {
        setActiveFile(path);
        return;
      }

      if (!isTextFile(path.split("/").pop() || "")) {
        toast.error("Cannot open binary file in editor");
        return;
      }

      setIsLoading(true);
      try {
        const data = await apiClient.readFile(path);
        if (!data.ok) throw new Error(data.error || "Failed to load file");

        const language = getFileLanguage(path.split("/").pop() || "");
        const newFile: OpenFile = {
          path,
          content: data.content,
          originalContent: data.content,
          language,
          size: data.size,
          mtime: data.mtime,
        };

        setOpenFiles((prev) => ({ ...prev, [path]: newFile }));
        setActiveFile(path);
        toast.success(`Opened ${path.split("/").pop()}`);
      } catch (error) {
        console.error("Error loading file:", error);
        toast.error(
          `Failed to open file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [openFiles]
  );

  const saveFile = useCallback(
    async (path: string) => {
      const file = openFiles[path];
      if (!file) return;

      try {
        const res = await fetch("/api/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content: file.content }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to save file");

        setOpenFiles((prev) => ({
          ...prev,
          [path]: {
            ...file,
            originalContent: file.content,
            size: data.size,
            mtime: data.mtime,
          },
        }));
        if (activeFile === path) {
          toast.success(`Saved ${path.split("/").pop()}`);
        }
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    [openFiles, activeFile]
  );

  const saveAll = useCallback(async () => {
    const dirty = Object.values(openFiles).filter(
      (f) => f.content !== f.originalContent
    );
    if (dirty.length === 0) {
      toast("No changes to save");
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all(dirty.map((f) => saveFile(f.path)));
      toast.success(`Saved ${dirty.length} file${dirty.length > 1 ? "s" : ""}`);
    } finally {
      setIsLoading(false);
    }
  }, [openFiles, saveFile]);

  const closeFile = useCallback(
    (path: string) => {
      const file = openFiles[path];
      if (file && file.content !== file.originalContent) {
        if (
          !confirm(
            `"${path.split("/").pop()}" has unsaved changes. Close anyway?`
          )
        ) {
          return;
        }
      }
      setOpenFiles((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      if (activeFile === path) {
        const remaining = Object.keys(openFiles).filter((p) => p !== path);
        setActiveFile(
          remaining.length ? remaining[remaining.length - 1] : null
        );
      }
    },
    [openFiles, activeFile]
  );

  const closeOthers = useCallback((path: string) => {
    setOpenFiles((prev) => {
      const keep = prev[path];
      return keep ? { [path]: keep } : prev;
    });
    setActiveFile(path);
  }, []);

  const closeAll = useCallback(() => {
    const dirty = Object.values(openFiles).some(
      (f) => f.content !== f.originalContent
    );
    if (dirty && !confirm("There are unsaved changes. Close all anyway?"))
      return;
    setOpenFiles({});
    setActiveFile(null);
  }, [openFiles]);

  const updateFileContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) => {
      const file = prev[path];
      if (!file) return prev;
      return { ...prev, [path]: { ...file, content } };
    });
  }, []);

  // Autosave (debounced)
  const autosaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!autosave || !activeFile) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const file = openFiles[activeFile];
      if (file && file.content !== file.originalContent) {
        saveFile(activeFile);
      }
    }, 1000); // 1s debounce
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [autosave, activeFile, openFiles, saveFile, activeFileData?.content]);

  // Monaco wiring
  const handleEditorMount = useCallback(
    (editorInst: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInst;

      editorInst.onDidChangeCursorPosition((e) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // Save
      editorInst.addAction({
        id: "save-file",
        label: "Save",
        keybindings: [2048 | 49], // Ctrl/Cmd+S
        run: () => {
          if (activeFile) {
            saveFile(activeFile);
          }
        },
      });
      // Save All
      editorInst.addAction({
        id: "save-all",
        label: "Save All",
        keybindings: [2048 | 1024 | 49], // Ctrl/Cmd+Shift+S
        run: () => saveAll(),
      });
      // Close Tab
      editorInst.addAction({
        id: "close-tab",
        label: "Close Tab",
        keybindings: [2048 | 54], // Ctrl/Cmd+W
        run: () => {
          if (activeFile) {
            closeFile(activeFile);
          }
        },
      });
      // Toggle Sidebar
      editorInst.addAction({
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        keybindings: [2048 | 48], // Ctrl/Cmd+B
        run: () => setSidebarCollapsed((v) => !v),
      });
      // Toggle Bottom Panel
      editorInst.addAction({
        id: "toggle-terminal",
        label: "Toggle Bottom Panel",
        keybindings: [2048 | 192], // Ctrl/Cmd+`
        run: () => setBottomOpen((v) => !v),
      });
      // Quick Open
      editorInst.addAction({
        id: "quick-open",
        label: "Quick Open",
        keybindings: [2048 | 44], // Ctrl/Cmd+P
        run: () => {
          setQuickOpenValue("");
          setShowQuickOpen(true);
        },
      });
      // Find in file (delegate to Monaco)
      editorInst.addAction({
        id: "find-in-file",
        label: "Find",
        keybindings: [2048 | 33], // Ctrl/Cmd+F
        run: () => editorInst.trigger("keyboard", "actions.find", {}),
      });
    },
    [activeFile, saveFile, saveAll, closeFile]
  );

  // Listen to custom "monaco-save" events
  useEffect(() => {
    const handleMonacoSave = (event: CustomEvent) => {
      const { path } = event.detail;
      if (path && openFiles[path]) saveFile(path);
    };
    window.addEventListener("monaco-save", handleMonacoSave as EventListener);
    return () =>
      window.removeEventListener(
        "monaco-save",
        handleMonacoSave as EventListener
      );
  }, [openFiles, saveFile]);

  // Initial file load
  useEffect(() => {
    if (initialFile && !openFiles[initialFile]) {
      loadFile(initialFile);
    }
  }, [initialFile, openFiles, loadFile]);

  // Sidebar resize
  const onSidebarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarCollapsed) return;
      resizingSidebarRef.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: MouseEvent) => {
        if (!resizingSidebarRef.current) return;
        const dx = ev.clientX - startX;
        const next = Math.max(180, Math.min(600, startWidth + dx));
        setSidebarWidth(next);
      };
      const onUp = () => {
        resizingSidebarRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sidebarCollapsed, sidebarWidth]
  );

  // Double click to collapse/restore sidebar
  const onSidebarDividerDoubleClick = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setSidebarWidth(lastSidebarWidthRef.current || 240);
    } else {
      lastSidebarWidthRef.current = sidebarWidth;
      setSidebarCollapsed(true);
    }
  }, [sidebarCollapsed, sidebarWidth]);

  // Bottom panel resize
  const onBottomMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizingBottomRef.current = true;
      const startY = e.clientY;
      const startH = bottomHeight;

      const onMove = (ev: MouseEvent) => {
        if (!resizingBottomRef.current) return;
        const dy = startY - ev.clientY;
        const next = Math.max(140, Math.min(600, startH + dy));
        setBottomHeight(next);
      };
      const onUp = () => {
        resizingBottomRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [bottomHeight]
  );

  // Quick Open submit
  const handleQuickOpenSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = quickOpenValue.trim();
      if (!value) {
        setShowQuickOpen(false);
        return;
      }
      loadFile(value);
      setShowQuickOpen(false);
    },
    [quickOpenValue, loadFile]
  );

  return (
    <div className={`h-full flex flex-col bg-gray-900 ${className}`}>
      {/* Title Bar */}
      <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-1"
            title="Back to Files"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            <span>Files</span>
          </button>
          <span className="text-sm font-medium text-gray-300">
            NextBrowse IDE
          </span>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="ml-4 flex items-center text-xs text-gray-400">
              {breadcrumbs.map((b, i) => (
                <div key={b.path} className="flex items-center">
                  {i > 0 && (
                    <ChevronRightIcon className="h-3 w-3 mx-1 text-gray-500" />
                  )}
                  <button
                    onClick={() => loadFile(b.path)}
                    className={`hover:text-gray-200 ${
                      i === breadcrumbs.length - 1 ? "text-gray-200" : ""
                    }`}
                    title={b.path}
                  >
                    {b.label}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Right side: Autosave */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 select-none flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
            />
            Autosave
          </label>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Activity Bar */}
        <div className="w-12 bg-gray-850 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-2 gap-2">
          <button
            title="Explorer (Ctrl+B)"
            onClick={() => {
              setSidebarView("explorer");
              setSidebarCollapsed(false);
            }}
            className={`p-2 rounded hover:bg-gray-700 ${
              sidebarView === "explorer" && !sidebarCollapsed
                ? "bg-gray-700"
                : ""
            }`}
          >
            <FolderIcon className="h-5 w-5 text-gray-200" />
          </button>
          <button
            title="Search (Ctrl+F in editor)"
            onClick={() => {
              setSidebarView("search");
              setSidebarCollapsed(false);
            }}
            className={`p-2 rounded hover:bg-gray-700 ${
              sidebarView === "search" && !sidebarCollapsed ? "bg-gray-700" : ""
            }`}
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-200" />
          </button>
          <button
            title="Source Control"
            onClick={() => {
              setSidebarView("scm");
              setSidebarCollapsed(false);
            }}
            className={`p-2 rounded hover:bg-gray-700 ${
              sidebarView === "scm" && !sidebarCollapsed ? "bg-gray-700" : ""
            }`}
          >
            <BugAntIcon className="h-5 w-5 text-gray-200" />
          </button>
          <button
            title="Run"
            onClick={() => {
              setSidebarView("run");
              setSidebarCollapsed(false);
            }}
            className={`p-2 rounded hover:bg-gray-700 ${
              sidebarView === "run" && !sidebarCollapsed ? "bg-gray-700" : ""
            }`}
          >
            <PlayIcon className="h-5 w-5 text-gray-200" />
          </button>
          <button
            title="Extensions"
            onClick={() => {
              setSidebarView("extensions");
              setSidebarCollapsed(false);
            }}
            className={`p-2 rounded hover:bg-gray-700 ${
              sidebarView === "extensions" && !sidebarCollapsed
                ? "bg-gray-700"
                : ""
            }`}
          >
            <PuzzlePieceIcon className="h-5 w-5 text-gray-200" />
          </button>

          <div className="mt-auto flex flex-col items-center gap-2">
            <button
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon />
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={`bg-gray-800 border-r border-gray-700 ${
            sidebarCollapsed ? "w-0" : ""
          } overflow-hidden`}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          {/* Sidebar Header */}
          <div className="h-8 px-3 border-b border-gray-700 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {sidebarView === "explorer" && "Explorer"}
              {sidebarView === "search" && "Search"}
              {sidebarView === "scm" && "Source Control"}
              {sidebarView === "run" && "Run & Debug"}
              {sidebarView === "extensions" && "Extensions"}
            </div>
            <div className="text-[10px] text-gray-500">Root: {rootPath}</div>
          </div>

          {/* Sidebar Content */}
          <div className="h-[calc(100%-2rem)] overflow-auto">
            {sidebarView === "explorer" && (
              <FileTree
                rootPath={rootPath}
                onFileSelect={loadFile}
                selectedFile={activeFile || undefined}
                onFileCreate={(path) => {
                  if (isTextFile(path.split("/").pop() || "")) loadFile(path);
                }}
                onFileDelete={(path) => {
                  if (openFiles[path]) closeFile(path);
                }}
              />
            )}

            {sidebarView === "search" && (
              <div className="p-3 text-sm text-gray-300 space-y-3">
                <div className="text-gray-400">
                  Tip: Use{" "}
                  <kbd className="px-1 py-0.5 bg-gray-700 rounded">
                    Ctrl/Cmd + F
                  </kbd>{" "}
                  for in-file search.
                </div>
                <button
                  onClick={() =>
                    editorRef.current?.trigger("keyboard", "actions.find", {})
                  }
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                >
                  Open Find
                </button>
                <div className="text-xs text-gray-500">
                  Workspace search can be wired to your backend (grep/ripgrep)
                  later.
                </div>
              </div>
            )}

            {sidebarView !== "explorer" && sidebarView !== "search" && (
              <div className="p-3 text-sm text-gray-400">
                This panel is a placeholder. Hook it to your backend when ready.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Divider */}
        <div
          className={`w-1 ${
            sidebarCollapsed ? "cursor-default" : "cursor-col-resize"
          } bg-gray-700 hover:bg-blue-600 transition-colors`}
          onMouseDown={onSidebarMouseDown}
          onDoubleClick={onSidebarDividerDoubleClick}
        />

        {/* Center Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          {Object.keys(openFiles).length > 0 && (
            <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
              {Object.entries(openFiles).map(([path, file]) => (
                <FileTab
                  key={path}
                  path={path}
                  isActive={activeFile === path}
                  isDirty={file.content !== file.originalContent}
                  onClick={() => setActiveFile(path)}
                  onClose={() => closeFile(path)}
                  onCloseOthers={() => closeOthers(path)}
                  onCloseAll={() => closeAll()}
                />
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 min-h-0">
            {activeFileData ? (
              <Monaco
                value={activeFileData.content}
                onChange={(value) =>
                  updateFileContent(activeFile!, value || "")
                }
                language={activeFileData.language}
                path={activeFile!}
                onMount={handleEditorMount}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🧭</div>
                  <p className="text-lg font-medium">
                    Welcome to NextBrowse IDE
                  </p>
                  <p className="text-sm">
                    Open a file from Explorer or press{" "}
                    <kbd className="px-1 py-0.5 bg-gray-800 rounded">
                      Ctrl/Cmd + P
                    </kbd>{" "}
                    to Quick Open.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel Divider */}
          <div
            className={`h-1 ${
              bottomOpen ? "cursor-row-resize" : "cursor-default"
            } bg-gray-700 hover:bg-blue-600 transition-colors`}
            onMouseDown={bottomOpen ? onBottomMouseDown : undefined}
          />

          {/* Bottom Panel */}
          {bottomOpen && (
            <div
              className="bg-gray-800 border-t border-gray-700 flex flex-col"
              style={{ height: bottomHeight }}
            >
              <div className="h-8 px-2 flex items-center gap-2 text-xs">
                {(["terminal", "output", "problems"] as BottomView[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setBottomView(tab)}
                      className={`px-2 py-1 rounded ${
                        bottomView === tab
                          ? "bg-gray-700 text-gray-100"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {tab === "terminal" && "Terminal"}
                      {tab === "output" && "Output"}
                      {tab === "problems" && "Problems"}
                    </button>
                  )
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setBottomOpen(false)}
                    className="px-2 py-1 text-gray-300 hover:bg-gray-700 rounded"
                    title="Close Panel (Ctrl/Cmd+`)"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto text-sm text-gray-200 px-3 py-2">
                {bottomView === "terminal" && (
                  <div className="font-mono text-gray-300">
                    <div className="text-gray-400 mb-2">
                      Integrated terminal placeholder. Wire to your backend (PTY
                      / WebSocket).
                    </div>
                    <div>$ _</div>
                  </div>
                )}
                {bottomView === "output" && (
                  <div className="text-gray-300">
                    No output yet. Print build logs here.
                  </div>
                )}
                {bottomView === "problems" && (
                  <div className="text-gray-300">
                    No problems detected. Hook ESLint/TypeScript diagnostics
                    here.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        currentFile={activeFile || undefined}
        fileSize={activeFileData?.size}
        cursorPosition={cursorPosition}
        language={activeFileData?.language}
        isDirty={isDirty}
        isLoading={isLoading}
      />

      {/* Quick Open Modal */}
      {showQuickOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50"
          onClick={() => setShowQuickOpen(false)}
        >
          <form
            className="w-[640px] rounded-xl overflow-hidden shadow-2xl"
            onSubmit={handleQuickOpenSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-800 border border-gray-700">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  value={quickOpenValue}
                  onChange={(e) => setQuickOpenValue(e.target.value)}
                  placeholder="Type a path (e.g. /app/pages/index.tsx)"
                  className="w-full bg-transparent outline-none text-sm text-gray-100 placeholder-gray-500"
                />
              </div>
              <div className="p-3 text-xs text-gray-400">
                Tip: Paste or type an absolute/relative path. Hook a fuzzy file
                indexer later.
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** Small inline ChevronLeft to avoid extra imports */
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-gray-200">
      <path
        d="M12.5 15l-5-5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
