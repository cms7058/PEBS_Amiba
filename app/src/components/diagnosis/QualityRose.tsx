"use client";

import { useEffect, useRef } from "react";
import type { PerNode } from "../../lib/diagnosis";

// 质量玫瑰图（donut rose）—— 参照 G2 general/rose#donut-rose：
// 每个节点一瓣，半径=该节点输入/输出准确率·及时率的均值，按达标状态着色；hover 看节点与数值。
const METRICS: (keyof PerNode)[] = ["inputAccuracy", "inputTimeliness", "outputAccuracy", "outputTimeliness"];
const STATUS = { low: "偏低(<90)", ok: "良好(90-95)", good: "达标(≥95)" } as const;
const STATUS_RANGE = ["#dc2626", "#4a90d9", "#16a34a"]; // 对应 [偏低, 良好, 达标]

function nodeAvg(n: PerNode): number | null {
  const xs = METRICS.map((k) => n[k]).filter((v): v is number => typeof v === "number");
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

export function QualityRose({ nodes }: { nodes: PerNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  type Row = { id: string; name: string; value: number; status: string };
  const data = nodes
    .map((n): Row | null => { const v = nodeAvg(n); return v == null ? null : { id: n.nodeId, name: n.nodeName, value: v, status: v >= 95 ? STATUS.good : v >= 90 ? STATUS.ok : STATUS.low }; })
    .filter((x): x is Row => x != null);
  const key = JSON.stringify(data);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any; let disposed = false;
    (async () => {
      const { Chart } = await import("@antv/g2");
      if (disposed || !ref.current) return;
      const rows = JSON.parse(key);
      chart = new Chart({ container: ref.current, autoFit: true, height: 380 });
      chart.coordinate({ type: "polar", innerRadius: 0.2, outerRadius: 0.92 });
      chart
        .interval()
        .data(rows)
        .encode("x", "id")
        .encode("y", "value")
        .encode("color", "status")
        .scale("y", { domainMin: 0, domainMax: 100 })
        .scale("x", { padding: 0 })
        .scale("color", { domain: [STATUS.low, STATUS.ok, STATUS.good], range: STATUS_RANGE })
        .style("stroke", "#fff")
        .style("lineWidth", 0.5)
        .axis("x", false)
        .axis("y", false)
        .legend("color", { position: "bottom" })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .tooltip({ title: (d: any) => d.name, items: [(d: any) => ({ name: "质量均值", value: `${d.value}%` })] });
      chart.render();
    })();
    return () => { disposed = true; try { chart?.destroy(); } catch { /* noop */ } };
  }, [key]);

  if (data.length === 0) return <div className="py-8 text-center text-xs text-muted-foreground">暂无质量指标数据</div>;
  return (
    <div>
      <div className="mb-1 text-[11px] text-muted-foreground">共 {data.length} 个节点 · 每瓣=一个节点的质量均值 · hover 查看节点与数值</div>
      <div ref={ref} style={{ width: "100%", height: 380 }} />
    </div>
  );
}
