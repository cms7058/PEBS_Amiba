"use client";

import { Workflow, Loader2, Sparkles, Layers, CircleDot } from "lucide-react";
import { NeuralMap } from "../demo/NeuralMap";
import { buildSubflowHierarchy } from "../../lib/subflow-hierarchy";
import type { Subflow } from "../../lib/process-types";

// 子流程"神经网络图"卡片：多层级可点击进入；显示层数/总数；为 0 时智能体提示创建。
export function SubflowHierarchyCard({
  ownerId, allSubflows, onEnter, onCreate, creating,
}: {
  ownerId: string;
  allSubflows: Subflow[];
  onEnter: (subflowId: string) => void;
  onCreate: () => void;
  creating?: boolean;
}) {
  const h = buildSubflowHierarchy(ownerId, allSubflows);

  if (h.total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--primary)]">
          <Sparkles className="h-3.5 w-3.5" /> 智能体提示
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          该节点还没有子流程。是否创建一个 BPMN 泳道子流程，把它拆解到部门级别并做成本归因？
        </div>
        <button onClick={onCreate} disabled={creating}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-[color:var(--primary)] px-2.5 py-1 text-[11px] text-primary-foreground hover:brightness-110 disabled:opacity-50">
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 创建子流程 →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <Workflow className="h-3.5 w-3.5 text-[color:var(--primary)]" /> 子流程结构
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          <Layers className="h-3 w-3" /> {h.layers} 层
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          <CircleDot className="h-3 w-3" /> {h.total} 个节点
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground">点击节点进入对应层的泳道图编辑</div>
      <div className="mt-1.5">
        <NeuralMap
          nodes={h.nodes}
          edges={h.edges}
          aspect={1.5}
          onNodeClick={(actId) => { const sid = h.navById[actId]; if (sid) onEnter(sid); }}
        />
      </div>
    </div>
  );
}
