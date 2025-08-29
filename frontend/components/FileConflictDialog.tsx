"use client";
import React, { useEffect, useRef } from "react";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface FileConflictDialogProps {
  open: boolean;
  fileName: string;
  onClose: () => void;
  onReplace: () => void;
}

export default function FileConflictDialog({
  open,
  fileName,
  onClose,
  onReplace,
}: FileConflictDialogProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus cancel button when dialog opens for accessibility
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onReplace();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onReplace]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        // Close when clicking the dim overlay only (not the card)
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="File conflict"
    >
      <div
        className="w-full max-w-md flex flex-col
                   rounded-2xl border border-zinc-800/70 bg-zinc-900/90 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/70">
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center
                         bg-gradient-to-br from-amber-500/15 to-orange-500/15
                         ring-1 ring-inset ring-amber-500/20"
            >
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">
              File Already Exists
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-xl p-2 hover:bg-zinc-800 transition-colors"
            aria-label="Close dialog"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6 text-zinc-300" />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 py-4">
          <p className="text-sm text-zinc-300 mb-2">
            The file{" "}
            <span className="font-medium text-zinc-100">
              &ldquo;{fileName}&rdquo;
            </span>{" "}
            already exists in this location.
          </p>
          <p className="text-sm text-zinc-400">
            Would you like to replace the existing file?
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-zinc-800/70 bg-zinc-900/60 backdrop-blur">
          <div className="flex justify-end gap-2">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium
                         border border-zinc-800/70 bg-zinc-900/70 hover:bg-zinc-800 transition-colors text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={onReplace}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
                         bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Replace
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Tip: Press{" "}
            <kbd className="rounded border px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
            to replace,{" "}
            <kbd className="rounded border px-1 py-0.5 text-[10px]">Esc</kbd> to
            cancel.
          </p>
        </div>
      </div>
    </div>
  );
}
