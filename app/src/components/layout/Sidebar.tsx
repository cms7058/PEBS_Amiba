"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Settings,
  Users,
  ListChecks,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { cn } from "../../lib/utils";
import type { Role } from "../../lib/users-types";

const nav = [
  { href: "/dashboard", label: "企业台账", icon: Building2, sub: "选择企业进入工作区" },
];

const adminNav = [
  { href: "/admin/users", label: "用户管理", icon: Users, sub: "账号 / 权限 / 工具令牌" },
  { href: "/admin/questions", label: "题库与建议", icon: ListChecks, sub: "诊断题目维护" },
  { href: "/settings", label: "模型与设置", icon: Settings, sub: "大模型 API 配置" },
];

// Width constraints (px). MIN fits "Amoeba Copilot" + logo + padding without clipping.
const MIN_WIDTH = 232;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = "amiba.sidebar.width.v1";

export function Sidebar({ role }: { role?: Role }) {
  const pathname = usePathname();
  const [width, setWidthState] = useState<number>(DEFAULT_WIDTH);
  const widthRef = useRef(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  function setWidth(w: number) {
    widthRef.current = w;
    setWidthState(w);
  }

  // Restore saved width on mount
  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (saved && saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = widthRef.current;
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const delta = e.clientX - startXRef.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(next);
    }
    function onUp() {
      setDragging(false);
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  function onDoubleClickHandle() {
    setWidth(DEFAULT_WIDTH);
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
  }

  return (
    <aside
      style={{ width }}
      className="relative hidden shrink-0 flex-col border-r border-border bg-card lg:flex"
    >
      <div className="border-b border-border px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          核心模块
        </div>
        {nav.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}

        {role === "admin" && (
          <>
            <div className="mt-5 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              系统管理
            </div>
            {adminNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href} />
            ))}
          </>
        )}
      </nav>

      {/* Drag handle on the right edge */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧边栏宽度（双击恢复默认）"
        title="拖动调整 · 双击恢复默认宽度"
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClickHandle}
        className={cn(
          "absolute right-0 top-0 z-30 h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none",
          "transition-colors hover:bg-[color:var(--primary)]/40",
          dragging && "bg-[color:var(--primary)]/60"
        )}
      />
    </aside>
  );
}

function NavItem({
  item,
  active,
  compact,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; sub?: string };
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-[color:var(--primary)]/8 text-[color:var(--primary)]"
          : compact
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-foreground hover:bg-muted"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[color:var(--primary)]" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{item.label}</div>
        {item.sub && !compact && (
          <div className={cn("truncate text-[11px]", active ? "text-[color:var(--primary)]/70" : "text-muted-foreground")}>
            {item.sub}
          </div>
        )}
      </div>
    </Link>
  );
}
