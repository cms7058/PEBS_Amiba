import type { NMNode, NMEdge } from "../components/demo/NeuralMap";
import type { Subflow } from "./process-types";

// 从某个 owner 节点（OTD 节点或活动）出发，遍历其子流程→活动→活动的子流程…
// 构建多层级"神经网络图"数据：层=深度，节点=各层活动，边=父活动→子活动。

export interface SubflowHierarchy {
  nodes: NMNode[];
  edges: NMEdge[];
  layers: number;             // 子流程层数
  total: number;              // 活动节点总数
  navById: Record<string, string>; // 活动 id → 所在子流程 id（点击跳转用）
}

export function buildSubflowHierarchy(rootOwnerId: string, all: Subflow[]): SubflowHierarchy {
  const byOwner = new Map(all.map((s) => [s.ownerNodeId, s]));
  const nodes: NMNode[] = [];
  const edges: NMEdge[] = [];
  const navById: Record<string, string> = {};
  let maxLayer = -1;

  function visit(ownerId: string, parentNodeId: string | null, layer: number) {
    const sf = byOwner.get(ownerId);
    if (!sf) return;
    maxLayer = Math.max(maxLayer, layer);
    sf.activities.slice().sort((a, b) => a.seq - b.seq).forEach((a) => {
      const hasChild = byOwner.has(a.id);
      nodes.push({
        id: a.id,
        label: a.name.length > 6 ? a.name.slice(0, 5) + "…" : a.name,
        layer,
        tone: hasChild ? "primary" : "neutral",
      });
      navById[a.id] = sf.id;
      if (parentNodeId) edges.push({ from: parentNodeId, to: a.id });
      visit(a.id, a.id, layer + 1);
    });
  }
  visit(rootOwnerId, null, 0);

  return { nodes, edges, layers: maxLayer + 1, total: nodes.length, navById };
}
