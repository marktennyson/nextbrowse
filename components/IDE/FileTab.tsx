"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { getFileIcon } from "@/lib/file-utils";

interface FileTabProps {
  path: string;
  isActive: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default function FileTab({
  path,
  isActive,
  isDirty,
  onClick,
  onClose,
}: FileTabProps) {
  const fileName = path.split("/").pop() || "";
  const Icon = getFileIcon(fileName);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={`
        flex items-center px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer
        min-w-0 max-w-[200px] group relative
        ${
          isActive
            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }
      `}
      onClick={onClick}
      title={path}
    >
      <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
      
      <span className="truncate flex-1 min-w-0">
        {fileName}
      </span>
      
      {isDirty && (
        <div className="w-2 h-2 bg-blue-500 rounded-full ml-1 flex-shrink-0" />
      )}
      
      <button
        className={`
          ml-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
          hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0
          ${isDirty ? "opacity-100" : ""}
        `}
        onClick={handleClose}
        title="Close"
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </div>
  );
}