import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "../components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextBrowse - Modern File Browser",
  description:
    "A modern, secure file browser built with Next.js and Go for browsing and managing files through a web interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            className: "",
            duration: 3000,
            style: {
              background: "rgb(24 24 27)",
              color: "rgb(244 244 245)",
              border: "1px solid rgb(63 63 70)",
            },
          }}
        />
        <div className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-dark" />
          {/* Subtle grid overlay */}
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-10" />

          {/* Main content with dark glass surface */}
          <div className="relative z-10 min-h-screen">
            <div className="min-h-screen bg-black/20">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
