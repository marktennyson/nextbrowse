"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { editor } from "monaco-editor";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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

export default function IDE({
  rootPath = "/",
  initialFile,
  className = "",
}: IDEProps) {
  const router = useRouter();
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isLoading, setIsLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{
    line: number;
    column: number;
  }>({ line: 1, column: 1 });

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const resizingRef = useRef(false);

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

        if (!data.ok) {
          throw new Error(data.error || "Failed to load file");
        }

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

      setIsLoading(true);
      try {
        const response = await fetch("/api/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            content: file.content,
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to save file");
        }

        setOpenFiles((prev) => ({
          ...prev,
          [path]: {
            ...file,
            originalContent: file.content,
            size: data.size,
            mtime: data.mtime,
          },
        }));

        toast.success(`Saved ${path.split("/").pop()}`);
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [openFiles]
  );

  const closeFile = useCallback(
    (path: string) => {
      const file = openFiles[path];
      if (file && file.content !== file.originalContent) {
        if (!confirm("File has unsaved changes. Close anyway?")) {
          return;
        }
      }

      setOpenFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[path];
        return newFiles;
      });

      if (activeFile === path) {
        const remainingFiles = Object.keys(openFiles).filter((p) => p !== path);
        setActiveFile(
          remainingFiles.length > 0
            ? remainingFiles[remainingFiles.length - 1]
            : null
        );
      }
    },
    [openFiles, activeFile]
  );

  const updateFileContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) => {
      const file = prev[path];
      if (!file) return prev;

      return {
        ...prev,
        [path]: { ...file, content },
      };
    });
  }, []);

  const handleEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // Save on Ctrl+S / Cmd+S
      editor.addAction({
        id: "save-file",
        label: "Save",
        keybindings: [2048 | 49], // Ctrl+S (2048 = CtrlCmd, 49 = KeyS)
        contextMenuGroupId: "1_modification",
        run: () => {
          if (activeFile) {
            saveFile(activeFile);
          }
        },
      });
    },
    [activeFile, saveFile]
  );

  // Handle Monaco save event
  useEffect(() => {
    const handleMonacoSave = (event: CustomEvent) => {
      const { path } = event.detail;
      if (path && openFiles[path]) {
        saveFile(path);
      }
    };

    window.addEventListener("monaco-save", handleMonacoSave as EventListener);
    return () => {
      window.removeEventListener(
        "monaco-save",
        handleMonacoSave as EventListener
      );
    };
  }, [openFiles, saveFile]);

  // Handle sidebar resize
  const handleMouseDown = useCallback(() => {
    resizingRef.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingRef.current) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Load initial file if specified
  useEffect(() => {
    if (initialFile && !openFiles[initialFile]) {
      loadFile(initialFile);
    }
  }, [initialFile, openFiles, loadFile]);

  const activeFileData = activeFile ? openFiles[activeFile] : null;
  const isDirty = activeFileData
    ? activeFileData.content !== activeFileData.originalContent
    : false;

  return (
    <div
      className={`h-full flex flex-col bg-gray-900 ${className}`}
    >
      {/* Header with theme toggle */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/")}
            className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 flex items-center space-x-1"
            title="Back to Files"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            <span>Files</span>
          </button>
          <span className="text-sm font-medium text-gray-300">
            NextBrowse IDE
          </span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div
          className="bg-gray-800 border-r border-gray-700"
          style={{ width: sidebarWidth }}
        >
          <FileTree
            rootPath={rootPath}
            onFileSelect={loadFile}
            selectedFile={activeFile || undefined}
            onFileCreate={(path) => {
              // Auto-open newly created files
              if (isTextFile(path.split("/").pop() || "")) {
                loadFile(path);
              }
            }}
            onFileDelete={(path) => {
              // Close file if it was open
              if (openFiles[path]) {
                closeFile(path);
              }
            }}
          />
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-gray-700 cursor-col-resize hover:bg-blue-600 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Main editor area */}
        <div className="flex-1 flex flex-col">
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
                />
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
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
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-lg font-medium">
                    Welcome to NextBrowse IDE
                  </p>
                  <p className="text-sm">
                    Select a file from the explorer to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        currentFile={activeFile || undefined}
        fileSize={activeFileData?.size}
        cursorPosition={cursorPosition}
        language={activeFileData?.language}
        isDirty={isDirty}
        isLoading={isLoading}
      />
    </div>
  );
}
