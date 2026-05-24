import { Check } from "lucide-react";
import type { DimensionKey } from "../../lib/diagnosis-types";

const DIMENSIONS: { key: DimensionKey; name: string; desc: string }[] = [
  { key: "organization", name: "组织维度", desc: "结构 / 决策权 / 变革承受" },
  { key: "finance", name: "财务维度", desc: "成本核算 / 利润中心 / 数据质量" },
  { key: "it", name: "信息化维度", desc: "ERP / MES / IoT 系统成熟度" },
  { key: "equipment", name: "设备维度", desc: "OEE / 能耗 / 维修归属" },
  { key: "process", name: "流程维度", desc: "订单交付 / 内部定价 / 质量体系" },
  { key: "culture", name: "文化维度", desc: "改善意识 / 变革阻力" },
];

export function DimensionProgress({
  progress,
  current,
}: {
  progress: Record<DimensionKey, number>;
  current?: DimensionKey;
}) {
  const total = DIMENSIONS.reduce((sum, d) => sum + (progress[d.key] || 0), 0);
  const overall = Math.round(total / DIMENSIONS.length);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">整体覆盖度</span>
          <span className="font-mono text-foreground">{overall}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {DIMENSIONS.map((d, i) => {
          const p = Math.min(100, Math.max(0, progress[d.key] || 0));
          const done = p >= 100;
          const active = current === d.key;
          return (
            <div key={d.key} className="space-y-1.5">
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-[color:var(--primary)] text-white"
                        : p > 0
                          ? "bg-[color:var(--primary)]/30 text-[color:var(--primary)]"
                          : "border border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={`text-sm font-medium ${active ? "text-[color:var(--primary)]" : ""}`}>
                      {d.name}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p}%</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                </div>
              </div>
              <div className="ml-7 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done ? "bg-emerald-500" : "bg-[color:var(--primary)]"
                  }`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
