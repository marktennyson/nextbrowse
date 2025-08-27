"use client";
import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  const parts = path.split("/").filter(Boolean);

  return (
    <nav
      className="flex items-center gap-1 text-xs"
      aria-label="Path Navigation"
    >
      {/* Home */}
      <button
        onClick={() => onNavigate("/")}
        className={`flex items-center px-2 py-1 rounded transition-colors ${
          path === "/"
            ? "text-white bg-white/15"
            : "text-slate-300 hover:text-white hover:bg-white/10"
        }`}
        title="Home"
      >
        <HomeIcon className="h-3 w-3" />
        <span className="ml-1 hidden sm:inline">Home</span>
      </button>

      {/* Path segments */}
      {parts.map((part, index) => {
        const partPath = "/" + parts.slice(0, index + 1).join("/");
        const isLast = index === parts.length - 1;

        return (
          <React.Fragment key={partPath}>
            {/* Separator */}
            <ChevronRightIcon className="h-3 w-3 text-slate-500" />

            {/* Path segment */}
            <button
              onClick={() => onNavigate(partPath)}
              className={`px-2 py-1 rounded transition-colors truncate max-w-24 sm:max-w-32 ${
                isLast
                  ? "text-white bg-white/15 font-medium"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              title={part}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
