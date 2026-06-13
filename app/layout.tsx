import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOU鹅 - AI 全流程招聘助手",
  description: "YOU鹅 AI 全流程招聘助手，基于鸽鹅机制和一键约面改面 Agent 的招聘工作台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
