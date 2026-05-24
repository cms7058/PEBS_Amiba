"use client";

import { Bell, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface Me {
  username: string;
  displayName: string;
  role: string;
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user && setMe(d.user))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-[17px] font-semibold leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-xs hover:bg-muted"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--primary)] text-white">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="pr-1.5 text-left leading-tight">
              <div className="font-medium">{me?.displayName || "未登录"}</div>
              <div className="text-[10px] text-muted-foreground">
                {me ? `${roleName(me.role)} · ${me.username}` : "上海零参科技"}
              </div>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card shadow-lg">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function roleName(r: string): string {
  return r === "admin" ? "管理员" : r === "consultant" ? "顾问" : "查看者";
}
