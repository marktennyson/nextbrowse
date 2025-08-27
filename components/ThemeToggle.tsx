"use client";
import React from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="p-2 rounded-lg border transition-all duration-200 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm"
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 text-amber-500" />
      ) : (
        <MoonIcon className="h-4 w-4 text-slate-600" />
      )}
    </button>
  );
}
