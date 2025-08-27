"use client";
import React, { useState, useEffect } from "react";
import { XMarkIcon, FolderIcon, CheckIcon } from "@heroicons/react/24/outline";

interface MoveCopyDialogProps {
  open: boolean;
  mode: "move" | "copy";
  currentPath: string;
  onClose: () => void;
  onConfirm: (targetPath: string) => void;
}

interface DirectoryItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

export default function MoveCopyDialog({
  open,
  mode,
  currentPath,
  onClose,
  onConfirm,
}: MoveCopyDialogProps) {
  const [selectedPath, setSelectedPath] = useState(currentPath);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPath(currentPath);
      loadDirectories(currentPath);
    }
  }, [open, currentPath]);

  const loadDirectories = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const responseText = await response.text();
      if (responseText.includes('<html>')) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = JSON.parse(responseText);
      
      if (data.ok) {
        // Filter to show only directories
        const dirs = data.items.filter((item: DirectoryItem) => item.type === "dir");
        setDirectories(dirs);
        setSelectedPath(data.path);
      } else {
        setError(data.error || "Failed to load directories");
      }
    } catch {
      setError("Network error while loading directories");
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const parts = selectedPath.split("/").filter(Boolean);
    const parentPath = parts.length > 0 ? "/" + parts.slice(0, -1).join("/") : "/";
    loadDirectories(parentPath);
  };

  const navigateToDirectory = (dirName: string) => {
    const newPath = `${selectedPath}/${dirName}`.replace(/\/+/g, "/");
    loadDirectories(newPath);
  };

  const handleConfirm = () => {
    onConfirm(selectedPath);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "move" ? "Move" : "Copy"} to Directory
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Current Path */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current location:</span>
            <div className="flex items-center space-x-2">
              <code className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">
                {selectedPath || "/"}
              </code>
              {selectedPath !== "/" && (
                <button
                  onClick={navigateUp}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go Up
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-pulse text-gray-600">Loading directories...</div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              {error}
            </div>
          ) : directories.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No subdirectories found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {directories.map((dir) => (
                <button
                  key={dir.name}
                  onClick={() => navigateToDirectory(dir.name)}
                  className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 text-left transition-colors"
                >
                  <FolderIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{dir.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Selected destination: <strong>{selectedPath || "/"}</strong>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedPath === currentPath}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                selectedPath === currentPath
                  ? "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                  : "text-white bg-blue-600 border border-transparent hover:bg-blue-700"
              }`}
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              {mode === "move" ? "Move Here" : "Copy Here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}