"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  DocumentIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

interface RenameDialogProps {
  open: boolean;
  itemName: string;
  itemType: "file" | "dir";
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export default function RenameDialog({
  open,
  itemName,
  itemType,
  onClose,
  onConfirm,
}: RenameDialogProps) {
  const [newName, setNewName] = useState(itemName);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNewName(itemName);
      setError("");
      // Focus and select the name without extension for files
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (itemType === "file") {
            const dotIndex = itemName.lastIndexOf(".");
            if (dotIndex > 0) {
              inputRef.current.setSelectionRange(0, dotIndex);
            } else {
              inputRef.current.select();
            }
          } else {
            inputRef.current.select();
          }
        }
      }, 100);
    }
  }, [open, itemName, itemType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }
    
    if (trimmedName === itemName) {
      onClose();
      return;
    }
    
    // Validate filename
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      setError("Name contains invalid characters");
      return;
    }
    
    if (trimmedName.startsWith(".") && trimmedName.length === 1) {
      setError("Invalid name");
      return;
    }
    
    onConfirm(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative glass-dark rounded-xl border border-white/10 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {itemType === "dir" ? (
              <FolderIcon className="h-6 w-6 text-cyan-400" />
            ) : (
              <DocumentIcon className="h-6 w-6 text-gray-400" />
            )}
            <h2 className="text-lg font-semibold text-white">
              Rename {itemType === "dir" ? "Folder" : "File"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="rename-input" className="block text-sm font-medium text-gray-300 mb-2">
              New name
            </label>
            <input
              ref={inputRef}
              id="rename-input"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-colors"
              placeholder="Enter new name"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName === itemName}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium transition-colors focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}