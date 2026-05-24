import type { ReactNode } from "react";
import { Header } from "./Header";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header title={title} subtitle={subtitle} />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
