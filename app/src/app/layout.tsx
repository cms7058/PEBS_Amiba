import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amoeba Copilot | PEBS · 上海零参科技",
  description: "面向汽车零部件与项目制非标设备制造业的阿米巴落地动态智能体系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
