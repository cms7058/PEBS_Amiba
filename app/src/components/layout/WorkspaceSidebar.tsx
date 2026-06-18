"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  PieChart, Network, Workflow, Stethoscope, Building2, Activity,
  ChevronLeft, Lock, Check, Loader2,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { cn } from "../../lib/utils";
import { STEP_KEYS, isUnlocked, type StepKey } from "../../lib/progress-types";

interface Step { key: StepKey; href: string; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }

const STEPS: Step[] = [
  { key: "design", href: "/design", label: "设计引擎", sub: "阿米巴单元/部门/转让价", icon: Network },
  { key: "rules", href: "/rules", label: "规则引擎", sub: "OTD流程+子流程+成本", icon: Workflow },
  { key: "diagnosis", href: "/diagnosis", label: "诊断引擎", sub: "成本问题+改进方向", icon: Stethoscope },
  { key: "profile", href: "/profile", label: "企业画像", sub: "人机料法环+成本六维", icon: Building2 },
  { key: "deployment", href: "/deployment", label: "部署引擎", sub: "方案+周期+甘特", icon: Activity },
];

type Completed = Record<StepKey, boolean>;

export function WorkspaceSidebar({ enterpriseId, enterpriseName }: { enterpriseId: string; enterpriseName: string }) {
  const pathname = usePathname();
  const base = `/e/${enterpriseId}`;
  const [completed, setCompleted] = useState<Completed>({ design: false, rules: false, diagnosis: false, profile: false, deployment: false });
  const [marking, setMarking] = useState<StepKey | null>(null);

  const load = useCallback(() => {
    fetch(`/api/progress?enterpriseId=${enterpriseId}`).then((r) => r.json()).then((d) => { if (d.progress) setCompleted(d.progress.completed); });
  }, [enterpriseId]);
  useEffect(load, [load]);

  async function mark(step: StepKey, done: boolean) {
    setMarking(step);
    try {
      const res = await fetch("/api/progress", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId, step, done }),
      });
      const d = await res.json();
      if (d.progress) setCompleted(d.progress.completed);
    } finally { setMarking(null); }
  }

  // 当前活动步骤 = 第一个未完成且已解锁的
  const activeKey = STEP_KEYS.find((k) => !completed[k] && isUnlocked(k, completed));

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="border-b border-border px-5 py-5"><Logo /></div>

      <div className="border-b border-border px-3 py-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> 返回企业台账
        </Link>
        <div className="mt-1.5 truncate text-sm font-semibold text-foreground" title={enterpriseName}>{enterpriseName}</div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* 总览驾驶舱：始终可点，不参与门控 */}
        <Link href={base}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
            pathname === base ? "bg-[color:var(--primary)]/8 text-[color:var(--primary)]" : "text-foreground hover:bg-muted")}>
          <PieChart className={cn("h-4 w-4 shrink-0", pathname === base ? "text-[color:var(--primary)]" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium leading-tight">总览 · 驾驶舱</div>
            <div className="truncate text-[11px] text-muted-foreground">实时成本归集</div>
          </div>
        </Link>

        <div className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">实施流水线</div>

        {STEPS.map((s, i) => {
          const unlocked = isUnlocked(s.key, completed);
          const done = completed[s.key];
          const href = `${base}${s.href}`;
          const active = pathname === href || pathname.startsWith(href + "/");
          const Icon = s.icon;
          const inner = (
            <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              !unlocked ? "cursor-not-allowed text-muted-foreground/50"
                : active ? "bg-[color:var(--primary)]/8 text-[color:var(--primary)]" : "text-foreground hover:bg-muted")}>
              <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                done ? "bg-emerald-500 text-white" : unlocked ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]" : "bg-muted text-muted-foreground/60")}>
                {done ? <Check className="h-3 w-3" /> : !unlocked ? <Lock className="h-3 w-3" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium leading-tight">{s.label}</span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{s.sub}</div>
              </div>
            </div>
          );
          return (
            <div key={s.key}>
              {unlocked ? <Link href={href}>{inner}</Link> : <div title="需先完成前序步骤">{inner}</div>}
              {/* 当前步骤：标记完成以解锁下一步 */}
              {activeKey === s.key && (
                <button onClick={() => mark(s.key, true)} disabled={marking === s.key}
                  className="ml-8 mt-1 inline-flex items-center gap-1 rounded-md bg-[color:var(--primary)] px-2 py-1 text-[11px] text-primary-foreground hover:brightness-110 disabled:opacity-50">
                  {marking === s.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} 完成本步 · 解锁下一步
                </button>
              )}
              {done && (
                <button onClick={() => mark(s.key, false)}
                  className="ml-8 mt-0.5 text-[10px] text-muted-foreground hover:text-foreground">撤销完成</button>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
