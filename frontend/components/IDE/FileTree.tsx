"use client";

import { useState, useEffect } from "react";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { getFileIcon, isTextFile } from "@/lib/file-utils";
import FileContextMenu from "./FileContextMenu";
import NewFileDialog from "./NewFileDialog";
import toast from "react-hot-toast";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface FileTreeProps {
  rootPath: string;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
}

interface FileTreeItemProps {
  node: FileTreeNode;
  level: number;
  onFileSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
  selectedFile?: string;
  onContextMenu?: (
    e: React.MouseEvent,
    path: string,
    isDirectory: boolean
  ) => void;
}

function FileTreeItem({
  node,
  level,
  onFileSelect,
  onToggleExpand,
  selectedFile,
  onContextMenu,
}: FileTreeItemProps) {
  const isSelected = selectedFile === node.path;
  const canOpen = node.type === "file" && isTextFile(node.name);

  const handleClick = () => {
    if (node.type === "dir") {
      onToggleExpand(node.path);
    } else if (canOpen) {
      onFileSelect(node.path);
    }
  };

  const Icon = getFileIcon(node.name);
  const FolderIconComponent = node.isExpanded ? FolderOpenIcon : FolderIcon;

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
          ${isSelected ? "bg-blue-100 dark:bg-blue-900" : ""}
          ${!canOpen && node.type === "file" ? "opacity-60" : ""}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e, node.path, node.type === "dir");
        }}
        title={node.path}
      >
        {node.type === "dir" && (
          <div className="w-4 h-4 mr-1 flex-shrink-0">
            {node.isLoading ? (
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            ) : node.isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </div>
        )}

        {node.type === "dir" ? (
          <FolderIconComponent className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
        ) : (
          <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
        )}

        <span className="text-sm truncate">{node.name}</span>
      </div>

      {node.type === "dir" && node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onToggleExpand={onToggleExpand}
              selectedFile={selectedFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({
  rootPath,
  onFileSelect,
  selectedFile,
  onFileCreate,
  onFileDelete,
}: FileTreeProps) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isDirectory: boolean;
  } | null>(null);
  const [newFileDialog, setNewFileDialog] = useState<{
    isOpen: boolean;
    type: "file" | "folder";
    parentPath: string;
  }>({
    isOpen: false,
    type: "file",
    parentPath: "",
  });

  const loadDirectory = async (path: string): Promise<FileTreeNode[]> => {
    try {
      const response = await fetch(
        `/api/fs/list?path=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to load directory");
      }

      return data.items
        .map((item: FileItem) => ({
          name: item.name,
          path: path === "/" ? `/${item.name}` : `${path}/${item.name}`,
          type: item.type,
          isExpanded: false,
          isLoading: false,
        }))
        .sort((a: FileTreeNode, b: FileTreeNode) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === "dir" ? -1 : 1;
          }
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    } catch (error) {
      console.error("Error loading directory:", error);
      return [];
    }
  };

  const updateNodeInTree = (
    nodes: FileTreeNode[],
    targetPath: string,
    updater: (node: FileTreeNode) => FileTreeNode
  ): FileTreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetPath, updater),
        };
      }
      return node;
    });
  };

  const handleToggleExpand = async (path: string) => {
    setTree((prevTree) =>
      updateNodeInTree(prevTree, path, (node) => {
        if (node.isExpanded) {
          // Collapse
          return {
            ...node,
            isExpanded: false,
            children: undefined,
          };
        } else {
          // Expand - set loading state
          return {
            ...node,
            isExpanded: true,
            isLoading: true,
            children: [],
          };
        }
      })
    );

    // Load children
    const children = await loadDirectory(path);
    setTree((prevTree) =>
      updateNodeInTree(prevTree, path, (node) => ({
        ...node,
        isLoading: false,
        children,
      }))
    );
  };

  useEffect(() => {
    const initializeTree = async () => {
      setLoading(true);
      const rootNodes = await loadDirectory(rootPath);
      setTree(rootNodes);
      setLoading(false);
    };

    initializeTree();
  }, [rootPath]);

  const onContextMenu = (
    e: React.MouseEvent,
    path: string,
    isDirectory: boolean
  ) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      isDirectory,
    });
  };

  const handleCreateFile = async (name: string, isFolder: boolean) => {
    try {
      const parentPath = newFileDialog.parentPath;

      if (isFolder) {
        const response = await fetch("/api/fs/mkdir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: parentPath, name }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create folder");
        }
      } else {
        // Create empty file via single-chunk upload
        const formData = new FormData();
        formData.append("path", parentPath);
        formData.append("fileName", name);
        formData.append(
          "fileId",
          `ide_create_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        formData.append("chunkIndex", "0");
        formData.append("totalChunks", "1");
        const emptyBlob = new Blob([], { type: "application/octet-stream" });
        formData.append("chunk", emptyBlob, name);

        const response = await fetch("/api/fs/upload-chunk", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let msg = "Failed to create file";
          try {
            const data = await response.json();
            if (
              data &&
              typeof data === "object" &&
              Object.prototype.hasOwnProperty.call(data as object, "error")
            ) {
              msg = (data as { error?: string }).error || msg;
            }
          } catch {}
          throw new Error(msg);
        }

        onFileCreate?.(
          parentPath === "/" ? `/${name}` : `${parentPath}/${name}`
        );
      }

      // Refresh the parent directory
      const children = await loadDirectory(parentPath);
      setTree((prevTree) =>
        updateNodeInTree(prevTree, parentPath, (node) => ({
          ...node,
          children,
          isExpanded: true,
        }))
      );

      toast.success(`${isFolder ? "Folder" : "File"} created successfully`);
    } catch (error) {
      console.error("Error creating file/folder:", error);
      toast.error(
        `Failed to create ${isFolder ? "folder" : "file"}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleDelete = async (path: string) => {
    if (
      !confirm(`Are you sure you want to delete "${path.split("/").pop()}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch("/api/fs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      onFileDelete?.(path);

      // Refresh the tree
      const parentPath = path.substring(0, path.lastIndexOf("/")) || "/";
      const children = await loadDirectory(parentPath);

      if (parentPath === rootPath) {
        setTree(children);
      } else {
        setTree((prevTree) =>
          updateNodeInTree(prevTree, parentPath, (node) => ({
            ...node,
            children,
          }))
        );
      }

      toast.success("Deleted successfully");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(
        `Failed to delete: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
          EXPLORER
        </h3>
      </div>
      <div className="py-2">
        {tree.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            onToggleExpand={handleToggleExpand}
            selectedFile={selectedFile}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          filePath={contextMenu.path}
          isDirectory={contextMenu.isDirectory}
          onClose={() => setContextMenu(null)}
          onNewFile={(parentPath) => {
            setNewFileDialog({ isOpen: true, type: "file", parentPath });
            setContextMenu(null);
          }}
          onNewFolder={(parentPath) => {
            setNewFileDialog({ isOpen: true, type: "folder", parentPath });
            setContextMenu(null);
          }}
          onRename={() => {
            // TODO: Implement rename
            toast.error("Rename functionality not yet implemented");
            setContextMenu(null);
          }}
          onDelete={handleDelete}
          onDuplicate={() => {
            // TODO: Implement duplicate
            toast.error("Duplicate functionality not yet implemented");
            setContextMenu(null);
          }}
          onOpen={onFileSelect}
        />
      )}

      {/* New File/Folder Dialog */}
      <NewFileDialog
        isOpen={newFileDialog.isOpen}
        type={newFileDialog.type}
        parentPath={newFileDialog.parentPath}
        onClose={() => setNewFileDialog({ ...newFileDialog, isOpen: false })}
        onConfirm={handleCreateFile}
      />
    </div>
  );
}
