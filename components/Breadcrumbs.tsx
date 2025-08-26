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
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate("/")}
        className={`flex items-center px-3 py-2 rounded-md transition-colors ${
          path === "/"
            ? "text-blue-600 bg-blue-50"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        <HomeIcon className="h-4 w-4 mr-1" />
        Root
      </button>

      {parts.map((part, index) => {
        const partPath = "/" + parts.slice(0, index + 1).join("/");
        const isLast = index === parts.length - 1;

        return (
          <React.Fragment key={partPath}>
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => onNavigate(partPath)}
              className={`px-3 py-2 rounded-md transition-colors truncate max-w-32 ${
                isLast
                  ? "text-blue-600 bg-blue-50 font-medium"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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