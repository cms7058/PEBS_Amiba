"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { MobileShell } from "../../../components/mobile/MobileShell";
import { INDUSTRY_LABELS, type DiagnosisSummary, type Industry } from "../../../lib/diagnosis-types";

interface Enterprise {
  id: string; name: string; industry: Industry; scale?: string;
  latestSummary?: DiagnosisSummary | null;
}

export default function MobileEnterprises() {
  const [ents, setEnts] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/enterprises").then((r) => r.json()).then((d) => {
      setEnts(d.enterprises || []); setLoading(false);
    });
  }, []);
  return (
    <MobileShell title="企业画像">
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : ents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          暂无企业
        </div>
      ) : (
        <ul className="space-y-2">
          {ents.map((e) => (
            <li key={e.id}>
              <Link href={`/m/enterprises/${e.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {INDUSTRY_LABELS[e.industry]}{e.scale && ` · ${e.scale}`}
                  </div>
                </div>
                {e.latestSummary ? (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">就绪度</div>
                    <div className="font-mono text-base font-semibold text-[color:var(--primary)]">{e.latestSummary.score}</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">未诊断</div>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}
