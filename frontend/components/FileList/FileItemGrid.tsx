"use client";
import React from "react";
import Image from "next/image";
import { FileItem } from "./utils";
import { getFileIcon, formatFileSize, formatDate } from "./utils";

export default function FileItemGrid({
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
  // Reference underscored unused props to satisfy linters
  if (false) {
    _onHighlight(null);
    _onFileEdit?.({ name: "", type: "file", mtime: Date.now() } as FileItem);
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6">
      {items.map((item, index) => {
        const isSelected = selectedItems.has(item.name);
        const isHighlighted = highlightedItem === item.name;
        const showBlueBorder =
          isSelected || (isHighlighted && selectedItems.size === 0);
        return (
          <div
            key={item.name}
            className={`relative group glass rounded-xl transition-all duration-300 transform hover:scale-[1.02] file-item-no-select ${
              showBlueBorder
                ? "bg-blue-900/30 ring-2 ring-blue-700/50 shadow-lg border-2 border-blue-400 file-item-blue-border"
                : "border border-white/10 hover:border-white/20 hover:shadow-md"
            } cursor-pointer interactive file-item-animate`}
            onContextMenu={(e) => onContextMenu(e, item)}
            onClick={(e) => onItemClick(item, isSelected, e)}
            onMouseDown={(e) => {
              if (e.detail > 1) {
                e.preventDefault();
              }
            }}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/5"></div>

            <div className="p-3 sm:p-4 md:p-6 text-center relative z-10 h-full flex flex-col justify-between min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
              <div className="flex flex-col items-center flex-1">
                <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
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
                          width={64}
                          height={64}
                          unoptimized
                          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-lg object-cover border border-white/10 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
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
                    const IconComponent = getFileIcon(item).type;
                    const iconClasses = getFileIcon(
                      item
                    ).props.className.replace(
                      "h-10 w-10",
                      "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
                    );
                    return <IconComponent className={iconClasses} />;
                  })()}
                </div>
                <h3 className="text-slate-200 font-medium text-xs sm:text-sm mb-1 sm:mb-2 truncate group-hover:text-white transition-colors relative w-full">
                  {item.name}
                  <div className="double-click-hint">
                    Double-click to {item.type === "dir" ? "open" : "view"}
                  </div>
                </h3>
              </div>
              <div className="text-xs text-slate-400 space-y-1 hidden sm:block mt-auto">
                {item.size && (
                  <div className="flex justify-center">
                    <span className="px-2 py-1 bg-white/5 rounded-full text-xs">
                      {formatFileSize(item.size)}
                    </span>
                  </div>
                )}
                <div className="text-slate-500 text-xs hidden md:block">
                  {formatDate(item.mtime)}
                </div>
              </div>
            </div>

            <div className="absolute top-3 right-3 z-10">
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
                  className={`h-4 w-4 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0 cursor-pointer ${
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
                      className="w-2.5 h-2.5 text-white"
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
            </div>
          </div>
        );
      })}

      {(hasMore || loadingMore) && (
        <div
          ref={loadingRef as React.Ref<HTMLDivElement>}
          className="col-span-full flex justify-center p-8"
        >
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

// intentionally unused props (_onHighlight, _onFileEdit) are accepted to match API
