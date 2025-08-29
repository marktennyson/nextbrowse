"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface NewFileDialogProps {
  isOpen: boolean;
  type: "file" | "folder";
  parentPath: string;
  onClose: () => void;
  onConfirm: (name: string, isFolder: boolean) => void;
}

export default function NewFileDialog({
  isOpen,
  type,
  parentPath,
  onClose,
  onConfirm,
}: NewFileDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.includes("/") || name.includes("\\")) {
      setError("Name cannot contain slashes");
      return;
    }

    if (name.startsWith(".") && name.length === 1) {
      setError("Invalid name");
      return;
    }

    onConfirm(name.trim(), type === "folder");
    setName("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            New {type === "folder" ? "Folder" : "File"}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Parent: {parentPath}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {type === "folder" ? "Folder" : "File"} Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={type === "folder" ? "folder-name" : "filename.txt"}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}