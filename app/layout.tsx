import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNS投稿半自動化ツール",
  description: "ThreadsとXの投稿をAIでまとめて作る初心者向けツール"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
