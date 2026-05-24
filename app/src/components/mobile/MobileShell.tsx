"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, MessageSquare, Building2, LogOut } from "lucide-react";
import { LogoMark } from "../brand/Logo";
import { cn } from "../../lib/utils";

export function MobileShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user || null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/m/login";
  }

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <div className="leading-tight">
            <div className="text-sm font-semibold">{title}</div>
            {user && <div className="text-[10px] text-muted-foreground">{user.displayName}</div>}
          </div>
        </div>
        <button onClick={logout} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-border bg-card lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-full lg:max-w-md">
        <TabLink href="/m" active={pathname === "/m"} icon={Home} label="总览" />
        <TabLink href="/m/conversations" active={pathname.startsWith("/m/conversations")} icon={MessageSquare} label="对话" />
        <TabLink href="/m/enterprises" active={pathname.startsWith("/m/enterprises")} icon={Building2} label="企业" />
      </nav>
    </div>
  );
}

function TabLink({
  href, active, icon: Icon, label,
}: { href: string; active: boolean; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href} className={cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
      active ? "text-[color:var(--primary)]" : "text-muted-foreground"
    )}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
