"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TreeNode } from "../../lib/diagnosis";

const yuan = (n: number) => "¥" + Math.round(n).toLocaleString("zh-CN");
type Factor = "labor" | "equipment" | "material";
const FACTOR_LABEL: Record<Factor, string> = { labor: "人工", equipment: "工作方式", material: "材料" };

// 杜邦成本科目 → OTD 节点逐层成本归集树形表（标准/实际/差值），与诊断引擎同源数据
export function CostRollupTree({ tree, factor }: { tree: TreeNode[]; factor: Factor }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totStd = tree.reduce((s, t) => s + t[factor].std, 0);
  const totAct = tree.reduce((s, t) => s + t[factor].act, 0);
  const totDiff = totAct - totStd;

  const Row = ({ n, depth }: { n: TreeNode; depth: number }) => {
    const v = n[factor];
    if (v.std === 0 && v.act === 0) return null;
    const expandable = n.children.some((c) => c[factor].std > 0 || c[factor].act > 0);
    const open = expanded.has(n.nodeId);
    return (
      <>
        <tr className="border-b border-border last:border-0 hover:bg-muted/30">
          <td className="py-1.5 pr-2">
            <button type="button" onClick={() => expandable && toggle(n.nodeId)} className={`flex items-center gap-1 text-left text-xs ${expandable ? "cursor-pointer" : "cursor-default"}`} style={{ paddingLeft: depth * 14 }}>
              {expandable ? (open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />) : <span className="inline-block w-3" />}
              <span className="truncate" title={n.nodeName}>{n.nodeName}</span>
            </button>
          </td>
          <td className="py-1.5 text-right font-mono text-xs">{yuan(v.std)}</td>
          <td className="py-1.5 text-right font-mono text-xs text-[color:var(--primary)]">{yuan(v.act)}</td>
          <td className={`py-1.5 text-right font-mono text-xs ${v.diff > 0 ? "text-red-600" : v.diff < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{v.diff > 0 ? "+" : ""}{yuan(v.diff)}</td>
        </tr>
        {open && n.children.map((c) => <Row key={c.nodeId} n={c} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium">「{FACTOR_LABEL[factor]}成本」按 OTD 节点逐层归集（与诊断引擎同源 · 点节点展开子流程）</div>
      <table className="w-full">
        <thead className="border-b border-border text-[10px] text-muted-foreground">
          <tr><th className="py-1 text-left font-medium">节点</th><th className="py-1 text-right font-medium">标准</th><th className="py-1 text-right font-medium">实际</th><th className="py-1 text-right font-medium">差值</th></tr>
        </thead>
        <tbody>
          {tree.map((t) => <Row key={t.nodeId} n={t} depth={0} />)}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-1.5 text-xs">全链合计</td>
            <td className="py-1.5 text-right font-mono text-xs">{yuan(totStd)}</td>
            <td className="py-1.5 text-right font-mono text-xs text-[color:var(--primary)]">{yuan(totAct)}</td>
            <td className={`py-1.5 text-right font-mono text-xs ${totDiff > 0 ? "text-red-600" : totDiff < 0 ? "text-emerald-600" : ""}`}>{totDiff > 0 ? "+" : ""}{yuan(totDiff)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
