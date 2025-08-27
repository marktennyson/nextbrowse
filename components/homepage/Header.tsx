import Breadcrumbs from "@/components/Breadcrumbs";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { CodeBracketIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  currentPath: string;
  filteredItemsCount: number;
  selectedItemsCount: number;
  onNavigate: (path: string) => void;
}

export default function Header({
  currentPath,
  filteredItemsCount,
  selectedItemsCount,
  onNavigate,
}: HeaderProps) {
  return (
    <div className="glass border-b border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2">
      <div className="flex items-center justify-between gap-2 min-h-[2.5rem]">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 bg-blue-100 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0">
            <span className="text-blue-600 dark:text-white font-bold text-sm">
              NB
            </span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-slate-300 dark:bg-white/20 mx-1"></div>
          <div className="min-w-0 flex-1">
            <Breadcrumbs path={currentPath} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Center: Stats (on larger screens) */}
        <div className="hidden md:flex items-center text-xs text-slate-500 dark:text-gray-400 gap-1.5 px-2">
          <span>{filteredItemsCount}</span>
          <span>•</span>
          <span>{selectedItemsCount} selected</span>
        </div>

        {/* Right: IDE Link + Theme Toggle */}
        <div className="shrink-0 flex items-center gap-2">
          <Link
            href="/ide"
            className="p-2 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Open IDE"
          >
            <CodeBracketIcon className="w-5 h-5" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}