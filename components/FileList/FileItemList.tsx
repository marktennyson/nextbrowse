"use client";
import React from "react";
import Image from "next/image";
import { FileItem } from "./utils";
import { formatFileSize, formatDate, getFileIcon } from "./utils";

export default function FileItemList({
  items,
  selectedItems,
  highlightedItem,
  onSelect,
  onHighlight: _onHighlight,
  onContextMenu,
  onImageClick,
  onFileEdit: _onFileEdit,
  onAudioPlay: _onAudioPlay,
  onItemClick,
  loadingRef,
  hasMore,
  loadingMore,
}: {
  items: FileItem[];
  selectedItems: Set<string>;
  highlightedItem: string | null;
  onSelect: (item: FileItem, selected: boolean) => void;
  onHighlight: (item: FileItem | null) => void;
  onContextMenu: (e: React.MouseEvent, item?: FileItem) => void;
  onImageClick?: (item: FileItem) => void;
  onFileEdit?: (item: FileItem) => void;
  onAudioPlay?: (item: FileItem) => void;
  onItemClick: (
    item: FileItem,
    isSelected: boolean,
    e: React.MouseEvent
  ) => void;
  loadingRef: React.Ref<HTMLDivElement> | null;
  hasMore?: boolean;
  loadingMore?: boolean;
}) {
  // reference unused props in a no-op so linters/TS won't complain
  if (false) {
    _onHighlight(null);
    _onFileEdit?.({ name: "", type: "file", mtime: Date.now() } as FileItem);
  }
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="hidden sm:grid grid-cols-12 gap-4 p-4 md:p-6 bg-white/5 border-b border-white/10 text-sm font-medium text-slate-200">
        <div className="col-span-6">Name</div>
        <div className="col-span-2 hidden md:block">Type</div>
        <div className="col-span-2 hidden lg:block">Size</div>
        <div className="col-span-2 hidden xl:block">Modified</div>
      </div>
      <div className="divide-y divide-white/5">
        {items.map((item, index) => {
          const isSelected = selectedItems.has(item.name);
          const isHighlighted = highlightedItem === item.name;
          const showBlueBorder =
            isSelected || (isHighlighted && selectedItems.size === 0);
          return (
            <div
              key={item.name}
              className={`flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 transition-all duration-300 file-item-no-select min-h-[80px] sm:min-h-[88px] ${
                showBlueBorder
                  ? "bg-blue-900/30 ring-2 ring-blue-700/50 shadow-md border-2 border-blue-400 file-item-blue-border"
                  : "hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-white/10"
              } group cursor-pointer rounded-lg file-item-animate`}
              onContextMenu={(e) => onContextMenu(e, item)}
              onClick={(e) => onItemClick(item, isSelected, e)}
              onMouseDown={(e) => {
                if (e.detail > 1) {
                  e.preventDefault();
                }
              }}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="flex-1 sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(item, e.target.checked);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey) {
                        onSelect(item, !isSelected);
                      }
                    }}
                    className={`relative z-10 h-5 w-5 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0 cursor-pointer ${
                      selectedItems.size > 0
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    } ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white focus:ring-blue-500/20"
                        : "border-slate-500 bg-slate-800 text-blue-500 hover:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {(() => {
                  const ext = item.name.split(".").pop()?.toLowerCase();
                  if (
                    [
                      "jpg",
                      "jpeg",
                      "png",
                      "gif",
                      "webp",
                      "bmp",
                      "tiff",
                    ].includes(ext || "") &&
                    item.url
                  ) {
                    return (
                      <Image
                        src={item.url}
                        alt={item.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover border border-white/10 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onImageClick) {
                            onImageClick(item);
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    );
                  }
                  return getFileIcon(item);
                })()}

                <div className="min-w-0 flex-1 relative">
                  <div className="font-medium text-slate-200 group-hover:text-white truncate transition-colors text-sm sm:text-base">
                    {item.name}
                  </div>
                  <div className="sm:hidden text-xs text-gray-400 truncate mt-1">
                    {item.type} •{" "}
                    {item.size ? formatFileSize(item.size) : "N/A"}
                  </div>
                  <div className="double-click-hint">
                    Double-click to {item.type === "dir" ? "open" : "view"}
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex sm:col-span-2 md:col-span-2 items-center text-sm text-gray-300 capitalize">
                {item.type}
              </div>
              <div className="hidden lg:flex lg:col-span-2 items-center text-sm text-gray-300">
                {formatFileSize(item.size)}
              </div>
              <div className="hidden xl:flex xl:col-span-2 items-center text-sm text-gray-300">
                {formatDate(item.mtime)}
              </div>
            </div>
          );
        })}
      </div>

      {(hasMore || loadingMore) && (
        <div ref={loadingRef} className="flex justify-center p-4">
          {loadingMore ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-400">
                Loading more items...
              </span>
            </div>
          ) : hasMore ? (
            <div className="text-sm text-slate-400">
              Scroll down to load more
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
