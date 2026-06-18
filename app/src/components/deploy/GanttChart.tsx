"use client";

import { DeployTask, STATUS_COLOR, STATUS_LABEL, parseDate, taskDays, dayMs, fmtDate, todayStr } from "../../lib/deploy-types";

// 轻量甘特图（纯 HTML/CSS）：左侧任务，右侧按时间轴定位的状态色条。
export function GanttChart({ tasks, onSelect, selectedId }: { tasks: DeployTask[]; onSelect?: (id: string) => void; selectedId?: string | null }) {
  if (tasks.length === 0) return <div className="py-8 text-center text-xs text-muted-foreground">暂无任务，点上方「从诊断生成计划」</div>;
  const starts = tasks.map((t) => parseDate(t.start));
  const ends = tasks.map((t) => parseDate(t.end));
  const min = Math.min(...starts), max = Math.max(...ends);
  const span = Math.max(1, Math.round((max - min) / dayMs) + 1);
  const pct = (t: number) => ((t - min) / dayMs / span) * 100;

  // 周刻度
  const ticks: { left: number; label: string }[] = [];
  for (let d = min; d <= max; d += 7 * dayMs) ticks.push({ left: pct(d), label: fmtDate(d).slice(5) });
  const todayLeft = (() => { const t = parseDate(todayStr()); return t >= min && t <= max ? pct(t) : null; })();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* 轴 */}
        <div className="flex border-b border-border pb-1 text-[10px] text-muted-foreground">
          <div className="w-[240px] shrink-0">任务 / 责任人</div>
          <div className="relative h-4 flex-1">
            {ticks.map((tk, i) => <span key={i} className="absolute -translate-x-1/2" style={{ left: `${tk.left}%` }}>{tk.label}</span>)}
          </div>
        </div>
        {/* 行 */}
        <div className="relative">
          {todayLeft != null && (
            <div className="pointer-events-none absolute top-0 z-10 h-full border-l border-dashed border-red-400" style={{ left: `calc(240px + ${todayLeft}% * (100% - 240px) / 100)` }}>
              <span className="absolute -top-0.5 left-0.5 text-[9px] text-red-500">今天</span>
            </div>
          )}
          {tasks.map((t) => {
            const on = selectedId === t.id;
            return (
              <div key={t.id} onClick={() => onSelect?.(t.id)} className={`flex cursor-pointer items-center border-b border-border py-1.5 last:border-0 ${on ? "bg-[color:var(--primary)]/5" : "hover:bg-muted/40"}`}>
                <div className="w-[240px] shrink-0 pr-2">
                  <div className="truncate text-xs font-medium" title={t.title}>{t.title}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{t.owner || "未指派"}{t.dimension ? ` · ${t.dimension}` : ""}</div>
                </div>
                <div className="relative h-6 flex-1">
                  <div className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded" title={`${t.start} ~ ${t.end} · ${STATUS_LABEL[t.status]}`}
                    style={{ left: `${pct(parseDate(t.start))}%`, width: `${Math.max(1.5, (taskDays(t) / span) * 100)}%`, background: STATUS_COLOR[t.status] }}>
                    <span className="absolute inset-y-0 right-1 flex items-center text-[9px] text-white">{taskDays(t)}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
