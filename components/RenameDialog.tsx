"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  XMarkIcon,
  DocumentIcon,
  FolderIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface RenameDialogProps {
  open: boolean;
  itemName: string;
  itemType: "file" | "dir";
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

type Validation =
  | { ok: true; message?: undefined }
  | { ok: false; message: string };

const INVALID_CHARS = /[<>:"/\\|?*\x00-\x1F]/; // add control chars too
const MAX_LEN = 255;
const RESERVED = new Set([".", ".."]);

export default function RenameDialog({
  open,
  itemName,
  itemType,
  onClose,
  onConfirm,
}: RenameDialogProps) {
  const [newName, setNewName] = useState<string>(itemName);
  const [error, setError] = useState<string>("");
  const [lockExtension, setLockExtension] = useState<boolean>(
    itemType === "file"
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { base, ext } = useMemo(() => splitName(itemName), [itemName]);

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setNewName(itemName);
    setError("");
    setLockExtension(itemType === "file"); // default lock for files

    // Focus & select: base only for files (with lock), whole name for dirs
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      if (itemType === "file" && base && lockExtension && ext) {
        input.setSelectionRange(0, base.length);
      } else {
        input.select();
      }
    });
  }, [open, itemName, itemType, base, ext, lockExtension]);

  // Keep extension locked while typing
  useEffect(() => {
    if (!lockExtension || itemType !== "file") return;
    const current = newName;
    const currentSplit = splitName(current);
    // If user attempted to change extension, restore it.
    if (ext && currentSplit.ext !== ext) {
      setNewName(`${currentSplit.base}${ext}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newName, lockExtension]);

  const validation: Validation = useMemo(() => {
    const name = newName.trim();

    if (name.length === 0)
      return { ok: false, message: "Name cannot be empty." };
    if (name.length > MAX_LEN)
      return { ok: false, message: `Name is too long (>${MAX_LEN}).` };
    if (RESERVED.has(name)) return { ok: false, message: "Reserved name." };
    if (INVALID_CHARS.test(name))
      return { ok: false, message: "Contains invalid characters." };
    if (name === itemName) return { ok: false, message: "No changes to save." };

    // Warn if extension changed while unlocked (files only)
    if (itemType === "file" && !lockExtension) {
      const { ext: newExt } = splitName(name);
      if (ext && newExt !== ext) {
        return {
          ok: false,
          message: `Extension changed to “${
            newExt || "none"
          }”. Lock or confirm intended.`,
        };
      }
    }
    return { ok: true };
  }, [newName, itemName, itemType, lockExtension, ext]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validateName(newName, itemName, itemType, lockExtension, ext);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    onConfirm(newName.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4
                 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-title"
      aria-describedby="rename-desc"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl
                   border border-zinc-200/60 bg-white/90
                   dark:border-zinc-800/60 dark:bg-zinc-900/90"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            {itemType === "dir" ? (
              <FolderIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <DocumentIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
            )}
            <h2
              id="rename-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Rename {itemType === "dir" ? "Folder" : "File"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close rename dialog"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <p
            id="rename-desc"
            className="text-xs text-zinc-600 dark:text-zinc-400 mb-3"
          >
            Choose a new name. Avoid characters:{" "}
            <code>&lt; &gt; : &quot; / \ | ? *</code>
          </p>

          <label
            htmlFor="rename-input"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2"
          >
            New name
          </label>

          <div className="relative">
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
              placeholder={itemName}
              // borderless look, clean focus ring, works in dark mode
              className="w-full rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70
                         px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100
                         placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                         outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              aria-invalid={!validation.ok || !!error}
              aria-describedby={
                !validation.ok || error ? "rename-error" : undefined
              }
              maxLength={MAX_LEN}
              autoComplete="off"
              spellCheck={false}
            />
            {itemType === "file" && ext && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400 select-none">
                {lockExtension ? ext : ""}
              </span>
            )}
          </div>

          {/* Extension lock (files only) */}
          {itemType === "file" && (
            <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                checked={lockExtension}
                onChange={(e) => setLockExtension(e.target.checked)}
              />
              <ShieldCheckIcon className="h-4 w-4" />
              Lock file extension
              {ext ? (
                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                  ({ext})
                </span>
              ) : null}
            </label>
          )}

          {/* Error / helper text */}
          <div className="min-h-[1.5rem] mt-2">
            {error ? (
              <p id="rename-error" className="text-sm text-red-500">
                {error}
              </p>
            ) : !validation.ok ? (
              <p
                id="rename-error"
                className="text-sm text-amber-600 dark:text-amber-500"
              >
                {validation.message}
              </p>
            ) : (
              <span className="text-sm text-transparent">.</span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium
                         border border-zinc-200/60 bg-white/70 hover:bg-zinc-50
                         dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.ok}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${
                  validation.ok
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                    : "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function splitName(name: string): { base: string; ext: string } {
  // Handles hidden files like ".env" (no "base"/"ext" split), multi-dots like "a.b.c"
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, lastDot), ext: name.slice(lastDot) }; // ext includes the dot
}

function validateName(
  candidate: string,
  original: string,
  kind: "file" | "dir",
  lockExt: boolean,
  origExt: string
): Validation {
  const name = candidate.trim();
  if (name.length === 0) return { ok: false, message: "Name cannot be empty." };
  if (name.length > MAX_LEN)
    return { ok: false, message: `Name is too long (>${MAX_LEN}).` };
  if (RESERVED.has(name)) return { ok: false, message: "Reserved name." };
  if (INVALID_CHARS.test(name))
    return { ok: false, message: "Contains invalid characters." };
  if (name === original) return { ok: false, message: "No changes to save." };

  if (kind === "file") {
    const { ext } = splitName(name);
    if (lockExt && origExt && ext !== origExt) {
      return { ok: false, message: `Extension must remain “${origExt}”.` };
    }
    if (!lockExt && origExt && ext !== origExt) {
      // soft guard; UI shows message while typing, but still allow submit after pressing again if you want strict block, change to ok:false always.
      return {
        ok: false,
        message: `Extension changed to “${
          ext || "none"
        }”. Enable lock to keep it.`,
      };
    }
  }
  return { ok: true };
}
