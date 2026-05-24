"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MessageSquare } from "lucide-react";
import { MobileShell } from "../../../components/mobile/MobileShell";
import { INDUSTRY_LABELS, type Industry } from "../../../lib/diagnosis-types";

interface ConvSummary { id: string; enterpriseId: string; status: string; turnCount: number; updatedAt: string; createdAt: string }
interface Enterprise { id: string; name: string; industry: Industry }

export default function MobileConversations() {
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [entMap, setEntMap] = useState<Record<string, Enterprise>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/enterprises").then((r) => r.json()),
    ]).then(([c, e]) => {
      setConvs(c.conversations || []);
      const ents: Enterprise[] = e.enterprises || [];
      setEntMap(Object.fromEntries(ents.map((x) => [x.id, x])));
      setLoading(false);
    });
  }, []);

  return (
    <MobileShell title="诊断对话">
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : convs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          暂无诊断会话
        </div>
      ) : (
        <ul className="space-y-2">
          {convs.map((c) => {
            const ent = entMap[c.enterpriseId];
            return (
              <li key={c.id}>
                <Link href={`/m/conversations/${c.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ent?.name || c.enterpriseId}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {ent ? INDUSTRY_LABELS[ent.industry] : ""} · {c.turnCount} 轮 · {new Date(c.updatedAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      c.status === "completed" ? "bg-emerald-100 text-emerald-700"
                        : c.status === "in_progress" ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {c.status === "completed" ? "已完成" : c.status === "in_progress" ? "进行中" : "已放弃"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </MobileShell>
  );
}
