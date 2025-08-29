"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudArrowUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface UploadButtonProps {
  onFilesSelected: (files: FileList) => void;
}

export default function UploadButton({ onFilesSelected }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure folder input has correct attributes for selecting directories across browsers
  useEffect(() => {
    if (folderInputRef.current) {
      try {
        folderInputRef.current.setAttribute("webkitdirectory", "");
        folderInputRef.current.setAttribute("directory", "");
      } catch {}
    }
  }, []);

  // Track mount so we can safely use portals (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleFolderClick = () => {
    folderInputRef.current?.click();
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const btn = containerRef.current;
      const menu = menuRef.current;
      const target = e.target as Node;
      const clickedInsideTrigger = !!(btn && target && btn.contains(target));
      const clickedInsideMenu = !!(menu && target && menu.contains(target));
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute dropdown position relative to the trigger button
  const updateMenuPosition = () => {
    const triggerRect = containerRef.current?.getBoundingClientRect();
    const el = menuRef.current;
    if (!triggerRect || !el) return;
    const gap = 4;
    const menuWidth = 176; // ~ w-44 (44 * 4)
    const maxLeft = Math.max(0, window.innerWidth - menuWidth - 8);
    const left = Math.min(triggerRect.left, maxLeft);
    const top = triggerRect.bottom + gap;
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  };

  // Keep menu positioned on open/resize/scroll
  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onResize = () => updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <div ref={containerRef} className="relative z-50">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          aria-label="Select files to upload"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          aria-label="Select folder to upload"
        />

        {/* Split button: primary action + dropdown toggle */}
        <div className="inline-flex rounded-md sm:rounded-lg shadow-sm">
          <button
            onClick={handleFileClick}
            className="group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors duration-200 rounded-l-md sm:rounded-l-lg"
            aria-label="Upload files"
          >
            <CloudArrowUpIcon className="h-4 w-4 text-cyan-400 mr-1.5 transition-all duration-300 group-hover:text-cyan-300 group-hover:scale-110 group-hover:-translate-y-1" />
            Upload
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            className="group px-2 sm:px-3 py-1.5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm border-l border-white/20 rounded-r-md sm:rounded-r-lg"
            title="More upload options"
          >
            <ChevronDownIcon className="h-4 w-4 text-cyan-300 transition-all duration-300 group-hover:text-cyan-200 group-hover:rotate-180 group-hover:scale-110" />
          </button>
        </div>
      </div>

      {/* Dropdown menu rendered in a portal to escape any stacking/overflow contexts */}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-[2147483647] overflow-hidden w-44"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          >
            <button
              onClick={handleFileClick}
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Choose Files
            </button>
            <button
              onClick={handleFolderClick}
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Choose Folder
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
