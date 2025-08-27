"use client";
import React from "react";

interface DividerProps {
  className?: string;
}

export default function Divider({ className = "" }: DividerProps) {
  return (
    <div
      className={`w-px h-4 sm:h-6 md:h-8 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent ${className}`}
    />
  );
}
