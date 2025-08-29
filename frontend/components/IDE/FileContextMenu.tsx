"use client";

import { useState } from "react";
import {
  DocumentIcon,
  FolderIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { isTextFile } from "@/lib/file-utils";

interface FileContextMenuProps {
  x: number;
  y: number;
  filePath: string;
  isDirectory: boolean;
  onClose: () => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onDuplicate: (path: string) => void;
  onOpen: (path: string) => void;
}

export default function FileContextMenu({
  x,
  y,
  filePath,
  isDirectory,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
  onOpen,
}: FileContextMenuProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleAction = (action: () => void) => {
    action();
    setIsVisible(false);
    onClose();
  };

  const fileName = filePath.split("/").pop() || "";
  const canOpen = !isDirectory && isTextFile(fileName);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => handleAction(() => {})}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        {canOpen && (
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleAction(() => onOpen(filePath))}
          >
            <DocumentIcon className="w-4 h-4" />
            Open
          </button>
        )}

        {isDirectory && (
          <>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction(() => onNewFile(filePath))}
            >
              <DocumentIcon className="w-4 h-4" />
              New File
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction(() => onNewFolder(filePath))}
            >
              <FolderIcon className="w-4 h-4" />
              New Folder
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          </>
        )}

        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          onClick={() => handleAction(() => onRename(filePath))}
        >
          <PencilIcon className="w-4 h-4" />
          Rename
        </button>

        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          onClick={() => handleAction(() => onDuplicate(filePath))}
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          Duplicate
        </button>

        <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
          onClick={() => handleAction(() => onDelete(filePath))}
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>
  );
}