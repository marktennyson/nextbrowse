"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowDownTrayIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface ImageViewerProps {
  open: boolean;
  items: FileItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageViewer({
  open,
  items,
  currentIndex,
  onClose,
  onNavigate,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);

  // Filter items to only include images
  const imageItems = items.filter((item) => {
    if (item.type !== "file" || !item.url) return false;
    const ext = item.name.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(
      ext || ""
    );
  });

  const currentItem = imageItems[currentIndex];

  // Reset zoom and position when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (currentIndex < imageItems.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case "=":
        case "+":
          e.preventDefault();
          setScale(Math.min(5, scale * 1.2));
          break;
        case "-":
          e.preventDefault();
          setScale(Math.max(0.1, scale / 1.2));
          break;
        case "0":
          e.preventDefault();
          setScale(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, imageItems.length, scale, onClose, onNavigate]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    setScale(Math.max(0.1, Math.min(5, scale * zoomFactor)));
  };

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    if (currentItem?.url) {
      const link = document.createElement("a");
      link.href = currentItem.url;
      link.download = currentItem.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (currentItem && navigator.share) {
      try {
        await navigator.share({
          title: currentItem.name,
          url: currentItem.url || "",
        });
      } catch {
        // Fallback: copy to clipboard
        if (currentItem.url && navigator.clipboard) {
          await navigator.clipboard.writeText(currentItem.url);
        }
      }
    }
  };

  if (!open || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium truncate max-w-md">
              {currentItem.name}
            </h2>
            <span className="text-sm text-gray-300">
              {currentIndex + 1} / {imageItems.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScale(Math.max(0.1, scale / 1.2))}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom out (-)"
            >
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="px-3 py-1 text-sm rounded hover:bg-white/10 transition-colors"
              title="Reset zoom (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => setScale(Math.min(5, scale * 1.2))}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom in (+)"
            >
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Share"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Previous (←)"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      {currentIndex < imageItems.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Next (→)"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-w-full max-h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        
        <Image
          ref={imageRef}
          src={currentItem.url!}
          alt={currentItem.name}
          width={1200}
          height={800}
          unoptimized
          className="max-w-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${
              position.y / scale
            }px)`,
            transition: isDragging ? "none" : "transform 0.2s ease",
            maxHeight: "90vh",
            maxWidth: "90vw",
            width: "auto",
            height: "auto",
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      {/* Thumbnail strip */}
      {imageItems.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center space-x-2 bg-black/60 rounded-lg p-2 max-w-md overflow-x-auto">
            {imageItems.map((item, index) => (
              <button
                key={item.name}
                onClick={() => onNavigate(index)}
                className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? "border-white scale-110"
                    : "border-white/30 hover:border-white/60"
                }`}
              >
                <Image
                  src={item.url!}
                  alt={item.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}