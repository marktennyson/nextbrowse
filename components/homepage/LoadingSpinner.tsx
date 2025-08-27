export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-4 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <div
            className="absolute inset-0 w-20 h-20 mx-auto border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin"
            style={{
              animationDirection: "reverse",
              animationDuration: "1.5s",
            }}
          ></div>
        </div>
        <div className="text-cyan-300 font-medium animate-pulse">
          Initializing Neural Network...
        </div>
      </div>
    </div>
  );
}