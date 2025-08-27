import React from "react";

export default function LoadingSkeleton({
  viewMode,
}: {
  viewMode: "list" | "grid";
}) {
  if (viewMode === "list") {
    return (
      <div
        className={
          viewMode === "list"
            ? "glass rounded-xl overflow-hidden"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6"
        }
      >
        <>
          <div className="hidden sm:grid grid-cols-12 gap-4 p-4 md:p-6 bg-slate-100/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200">
            <div className="col-span-6">Name</div>
            <div className="col-span-2 hidden md:block">Type</div>
            <div className="col-span-2 hidden lg:block">Size</div>
            <div className="col-span-2 hidden xl:block">Modified</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6"
              >
                <div className="flex-1 sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                  <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    ></div>
                    <div
                      className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse sm:hidden"
                      style={{ width: `${40 + Math.random() * 30}%` }}
                    ></div>
                  </div>
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center">
                  <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="hidden lg:flex lg:col-span-2 items-center">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="hidden xl:flex xl:col-span-2 items-center">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </>
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-3 sm:p-4 md:p-6 text-center">
          <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div
              className="h-3 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"
              style={{ width: `${50 + Math.random() * 40}%` }}
            ></div>
            <div
              className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mx-auto hidden sm:block"
              style={{ width: `${30 + Math.random() * 30}%` }}
            ></div>
          </div>
          <div className="absolute top-3 right-3">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  );
}
