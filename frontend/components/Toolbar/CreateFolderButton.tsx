"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  FolderPlusIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface CreateFolderButtonProps {
  onCreateFolder: (name: string) => void;
}

export default function CreateFolderButton({
  onCreateFolder,
}: CreateFolderButtonProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const newFolderRef = useRef<HTMLDivElement>(null);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  const cancelFolderCreation = () => {
    setShowNewFolder(false);
    setNewFolderName("");
  };

  // Handle click outside to close folder creation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        newFolderRef.current &&
        !newFolderRef.current.contains(event.target as Node)
      ) {
        cancelFolderCreation();
      }
    };

    if (showNewFolder) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNewFolder]);

  return (
    <div className="relative">
      {showNewFolder ? (
        <div
          ref={newFolderRef}
          className="relative inline-flex items-center bg-gray-800 border border-gray-600 rounded-md sm:rounded-lg shadow-lg shadow-gray-900/30 overflow-hidden min-w-[200px] sm:min-w-[240px]"
        >
          <div className="flex items-center justify-center px-2 sm:px-4 py-1.5 sm:py-2.5 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-r border-gray-600">
            <FolderPlusIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
          </div>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") cancelFolderCreation();
            }}
            placeholder="Enter folder name"
            className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2.5 text-gray-100 placeholder-gray-500 text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className="flex items-center border-l border-gray-600">
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
              title="Create folder"
            >
              <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={cancelFolderCreation}
              className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border-l border-gray-600"
              title="Cancel"
            >
              <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewFolder(true)}
          className="group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-gray-200 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:border-gray-500 shadow-sm hover:shadow-md"
          title="Create new folder"
        >
          <FolderPlusIcon className="h-3 w-3 text-blue-500 sm:h-4 sm:w-4 sm:mr-2 transition-all duration-300 group-hover:text-blue-400 group-hover:scale-110 group-hover:rotate-12" />
          <span className="hidden sm:inline">New Folder</span>
        </button>
      )}
    </div>
  );
}
