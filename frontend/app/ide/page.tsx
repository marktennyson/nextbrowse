"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const IDE = dynamic(() => import("@/components/IDE/IDE"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading IDE...</p>
      </div>
    </div>
  ),
});

function IDEContent() {
  const searchParams = useSearchParams();
  const filePath = searchParams.get("file");
  const folderPath = searchParams.get("folder");

  const rootPath = folderPath || "/";
  const initialFile = filePath || undefined;

  return (
    <div className="h-screen">
      <IDE rootPath={rootPath} initialFile={initialFile} />
    </div>
  );
}

export default function IDEPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading IDE...</p>
          </div>
        </div>
      }
    >
      <IDEContent />
    </Suspense>
  );
}
