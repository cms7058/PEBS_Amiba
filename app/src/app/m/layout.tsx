import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amoeba Copilot · 移动端",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Viewport-constrained for desktop preview */}
      <div className="mx-auto min-h-screen max-w-md bg-card shadow-sm">{children}</div>
    </div>
  );
}
