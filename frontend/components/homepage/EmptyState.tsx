import UploadArea from "@/components/UploadArea";

interface EmptyStateProps {
  searchQuery: string;
  onFilesSelected: (files: FileList) => void;
}

export default function EmptyState({ searchQuery, onFilesSelected }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No files found</div>
        <div className="text-gray-500 text-sm">
          Try adjusting your search query or upload some files
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-md mx-auto">
        <UploadArea onFilesSelected={onFilesSelected} />
      </div>
    </div>
  );
}