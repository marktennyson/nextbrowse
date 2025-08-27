"use client";
import React, { useEffect, useRef } from "react";
import {
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  item?: FileItem;
  onClose: () => void;
  onAction: (action: string, item?: FileItem) => void;
}

export default function ContextMenu({
  open,
  x,
  y,
  item,
  onClose,
  onAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Adjust position if menu would go outside viewport
      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 10;
      }

      if (y + rect.height > viewport.height) {
        adjustedY = viewport.height - rect.height - 10;
      }

      menu.style.left = `${Math.max(10, adjustedX)}px`;
      menu.style.top = `${Math.max(10, adjustedY)}px`;
    }
  }, [open, x, y]);

  if (!open) return null;

  const menuItems = [
    {
      label: item?.type === "dir" ? "Open" : "Preview",
      icon: EyeIcon,
      action: "open",
      show: true,
      gradient: "",
      borderColor: "",
      textColor: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Download",
      icon: ArrowDownTrayIcon,
      action: "download",
      show: item?.type === "file" && item.url,
      gradient: "",
      borderColor: "",
      textColor: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Copy",
      icon: DocumentDuplicateIcon,
      action: "copy",
      show: true,
      gradient: "",
      borderColor: "",
      textColor: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Rename",
      icon: PencilIcon,
      action: "rename",
      show: true,
      gradient: "",
      borderColor: "",
      textColor: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Delete",
      icon: TrashIcon,
      action: "delete",
      show: true,
      danger: true,
      gradient: "",
      borderColor: "",
      textColor: "text-red-600 dark:text-red-300",
    },
    {
      label: "Properties",
      icon: InformationCircleIcon,
      action: "properties",
      show: true,
      gradient: "",
      borderColor: "",
      textColor: "text-slate-700 dark:text-slate-200",
    },
  ];

  const visibleItems = menuItems.filter((menuItem) => menuItem.show);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 glass rounded-xl border border-slate-200 dark:border-white/10 py-2 min-w-[200px] context-menu shadow-xl"
      style={{
        left: x,
        top: y,
      }}
    >
      {item && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <div
            className="font-medium text-slate-800 dark:text-white truncate text-sm"
            title={item.name}
          >
            {item.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-400 capitalize mt-1 flex items-center">
            <CpuChipIcon className="h-3 w-3 mr-1" />
            {item.type}
            {item.size && ` • ${Math.round(item.size / 1024)} KB`}
          </div>
        </div>
      )}

      <div className="py-2">
        {visibleItems.map((menuItem, index) => {
          const Icon = menuItem.icon;
          return (
            <button
              key={menuItem.action}
              onClick={() => {
                onAction(menuItem.action, item);
                onClose();
              }}
              className={`w-full flex items-center px-4 py-3 text-sm transition-colors duration-150 ${menuItem.textColor} hover:bg-slate-100 dark:hover:bg-white/5 group interactive`}
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span>{menuItem.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
