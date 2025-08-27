import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextBrowse 2026 - Futuristic File Explorer",
  description:
    "A next-generation file browser with holographic UI and advanced AI features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="relative min-h-screen overflow-hidden">
            {/* Set initial theme before hydration to avoid sticking to system default */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      var saved = localStorage.getItem('theme');
                      var theme = saved || 'light';
                      var root = document.documentElement;
                      if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
                      root.setAttribute('data-theme', theme);
                      root.style.colorScheme = theme;
                    } catch (e) {}
                  })();
                `,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "var(--background)",
                backgroundImage:
                  "linear-gradient(135deg, rgba(59,130,246,0.04), rgba(139,92,246,0.04))",
              }}
            />
            {/* Subtle grid overlay - only visible in dark mode */}
            <div className="pointer-events-none absolute inset-0 grid-pattern opacity-0 dark:opacity-10" />

            {/* Main content with theme-aware glass surface */}
            <div className="relative z-10 min-h-screen">
              <div className="min-h-screen bg-white/40 dark:bg-black/20">
                {children}
              </div>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
