"use client";

import { useEffect, useRef } from "react";
import type { CostFinding } from "../../lib/diagnosis";

// 成本超支分组柱状图 —— 参照 G2 general/interval#bar-basic-grouped：
// interval + transform dodgeX 分组；每个「节点·要素」并排显示 标准参考 vs 实际，直观对比超支。
const TYPE = { std: "标准参考", act: "实际" } as const;
const RANGE = ["#94a3b8", "#dc2626"]; // 标准=灰，实际=红

export function CostGroupedBar({ findings, top = 12 }: { findings: CostFinding[]; top?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = findings.slice(0, top);
  const rows = items.flatMap((f, i) => {
    const short = f.nodeName.length > 8 ? f.nodeName.slice(0, 7) + "…" : f.nodeName;
    const cat = `${i + 1}.${short}·${f.factorLabel.replace(/（.*）/, "")}`;
    return [
      { category: cat, type: TYPE.std, value: Math.round(f.std) },
      { category: cat, type: TYPE.act, value: Math.round(f.act) },
    ];
  });
  const key = JSON.stringify(rows);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any; let disposed = false;
    (async () => {
      const { Chart } = await import("@antv/g2");
      if (disposed || !ref.current) return;
      const data = JSON.parse(key);
      const cats = Array.from(new Set(data.map((d: { category: string }) => d.category))) as string[];
      chart = new Chart({ container: ref.current, autoFit: true, height: Math.max(280, cats.length * 46) });
      chart.coordinate({ transform: [{ type: "transpose" }] }); // 横向条形
      chart
        .interval()
        .data(data)
        .encode("x", "category")
        .encode("y", "value")
        .encode("color", "type")
        .transform({ type: "dodgeX" })
        .scale("color", { domain: [TYPE.std, TYPE.act], range: RANGE })
        .scale("x", { domain: cats }) // 超支排名第1在最上
        .axis("y", { labelFormatter: (v: number) => "¥" + v, title: false })
        .axis("x", { title: false })
        .legend("color", { position: "top" })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .tooltip({ title: (d: any) => d.category, items: [(d: any) => ({ name: d.type, value: "¥" + d.value.toLocaleString("zh-CN") })] });
      chart.render();
    })();
    return () => { disposed = true; try { chart?.destroy(); } catch { /* noop */ } };
  }, [key]);

  if (items.length === 0) return <div className="py-6 text-center text-xs text-muted-foreground">暂无超支项</div>;
  return <div ref={ref} style={{ width: "100%", height: Math.max(280, items.length * 46) }} />;
}
