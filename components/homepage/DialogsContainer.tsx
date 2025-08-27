import MoveCopyDialog from "@/components/MoveCopyDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ContextMenu from "@/components/ContextMenu";
import ImageViewer from "@/components/ImageViewer";
import RenameDialog from "@/components/RenameDialog";
import PropertiesDialog from "@/components/PropertiesDialog";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface DialogsContainerProps {
  // Dialog states
  moveCopyDialog: {
    open: boolean;
    mode: "move" | "copy";
    items: string[];
  };
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    item?: FileItem;
  };
  imageViewer: {
    open: boolean;
    currentIndex: number;
  };
  renameDialog: {
    open: boolean;
    item: FileItem | null;
  };
  propertiesDialog: {
    open: boolean;
    item: FileItem | null;
  };

  // Data
  currentPath: string;
  filteredItems: FileItem[];

  // Handlers
  onMoveCopyClose: () => void;
  onMoveCopyConfirm: (targetPath: string) => Promise<void>;
  onConfirmDialogClose: () => void;
  onConfirmDialogConfirm: () => void;
  onContextMenuClose: () => void;
  onContextMenuAction: (action: string) => Promise<void>;
  onImageViewerClose: () => void;
  onImageViewerNavigate: (index: number) => void;
  onRenameDialogClose: () => void;
  onRenameConfirm: (newName: string) => Promise<void>;
  onPropertiesDialogClose: () => void;
}

export default function DialogsContainer({
  moveCopyDialog,
  confirmDialog,
  contextMenu,
  imageViewer,
  renameDialog,
  propertiesDialog,
  currentPath,
  filteredItems,
  onMoveCopyClose,
  onMoveCopyConfirm,
  onConfirmDialogClose,
  onConfirmDialogConfirm,
  onContextMenuClose,
  onContextMenuAction,
  onImageViewerClose,
  onImageViewerNavigate,
  onRenameDialogClose,
  onRenameConfirm,
  onPropertiesDialogClose,
}: DialogsContainerProps) {
  return (
    <>
      <MoveCopyDialog
        open={moveCopyDialog.open}
        mode={moveCopyDialog.mode}
        currentPath={currentPath}
        onClose={onMoveCopyClose}
        onConfirm={onMoveCopyConfirm}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={onConfirmDialogClose}
        onConfirm={onConfirmDialogConfirm}
      />

      <ContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        item={contextMenu.item}
        onClose={onContextMenuClose}
        onAction={onContextMenuAction}
      />

      <ImageViewer
        open={imageViewer.open}
        items={filteredItems}
        currentIndex={imageViewer.currentIndex}
        onClose={onImageViewerClose}
        onNavigate={onImageViewerNavigate}
      />

      <RenameDialog
        open={renameDialog.open}
        itemName={renameDialog.item?.name || ""}
        itemType={renameDialog.item?.type || "file"}
        onClose={onRenameDialogClose}
        onConfirm={onRenameConfirm}
      />

      <PropertiesDialog
        open={propertiesDialog.open}
        item={propertiesDialog.item}
        path={currentPath}
        onClose={onPropertiesDialogClose}
      />
    </>
  );
}