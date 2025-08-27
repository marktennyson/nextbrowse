interface EmptyStateProps {
  searchQuery: string;
}

export default function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-lg mb-2">No files found</div>
      {searchQuery && (
        <div className="text-gray-500 text-sm">
          Try adjusting your search query or upload some files
        </div>
      )}
    </div>
  );
}