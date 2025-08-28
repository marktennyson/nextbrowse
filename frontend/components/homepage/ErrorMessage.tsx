interface ErrorMessageProps {
  error: string;
  onClose: () => void;
}

export default function ErrorMessage({ error, onClose }: ErrorMessageProps) {
  return (
    <div className="mb-6 p-4 glass-dark border border-red-500/30 rounded-xl text-red-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
          {error}
        </div>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-300 ml-4 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}