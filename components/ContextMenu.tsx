"use client";
import React, { useEffect, useRef } from "react";
import {
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
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
    },
    {
      label: "Download",
      icon: ArrowDownTrayIcon,
      action: "download",
      show: item?.type === "file" && item.url,
    },
    {
      label: "Copy",
      icon: DocumentDuplicateIcon,
      action: "copy",
      show: true,
    },
    {
      label: "Rename",
      icon: PencilIcon,
      action: "rename",
      show: true,
    },
    {
      label: "Delete",
      icon: TrashIcon,
      action: "delete",
      show: true,
      danger: true,
    },
    {
      label: "Properties",
      icon: InformationCircleIcon,
      action: "properties",
      show: true,
    },
  ];

  const visibleItems = menuItems.filter((menuItem) => menuItem.show);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] animate-fade-in"
      style={{
        left: x,
        top: y,
      }}
    >
      {item && (
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="font-medium text-gray-900 truncate text-sm" title={item.name}>
            {item.name}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {item.type}
            {item.size && ` " ${Math.round(item.size / 1024)} KB`}
          </div>
        </div>
      )}
      
      <div className="py-1">
        {visibleItems.map((menuItem) => {
          const Icon = menuItem.icon;
          return (
            <button
              key={menuItem.action}
              onClick={() => {
                onAction(menuItem.action, item);
                onClose();
              }}
              className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                menuItem.danger
                  ? "text-red-700 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {menuItem.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}