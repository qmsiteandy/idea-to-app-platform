import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idea to App",
  description: "從點子到上線的自動化開發平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
