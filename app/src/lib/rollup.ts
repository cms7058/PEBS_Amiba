import { listByEnterprise as listCosts } from "./node-cost";
import { listByEnterprise as listSubflows } from "./subflow";
import { getTemplate } from "./otd";
import { costBreakdown } from "./cost-types";

// 成本自底向上汇总（设计方案 §13.5）：
// 叶子节点成本 = 人/机/料录入；有子流程的节点 = Σ 子流程活动（递归）。
// OTD 顶层节点 → 各节点 rollup → 全链总成本。

export interface Roll { labor: number; equipment: number; material: number; total: number }
const zero = (): Roll => ({ labor: 0, equipment: 0, material: 0, total: 0 });
const round = (n: number) => Math.round(n * 100) / 100;
const add = (a: Roll, b: Roll): Roll => ({
  labor: round(a.labor + b.labor), equipment: round(a.equipment + b.equipment),
  material: round(a.material + b.material), total: round(a.total + b.total),
});

export interface NodeRoll extends Roll { nodeId: string; key: string; name: string; seq: number; hasSubflow: boolean; leaf: boolean }

export async function rollupTemplate(enterpriseId: string, templateId: string): Promise<{ nodes: NodeRoll[]; total: Roll }> {
  const [tpl, costs, subflows] = await Promise.all([
    getTemplate(templateId), listCosts(enterpriseId), listSubflows(enterpriseId),
  ]);
  const costMap = new Map(costs.map((c) => [c.nodeId, c]));
  const subflowMap = new Map(subflows.map((s) => [s.ownerNodeId, s]));
  const seen = new Set<string>(); // 防环

  function roll(nodeId: string): Roll {
    if (seen.has(nodeId)) return zero();
    seen.add(nodeId);
    const sf = subflowMap.get(nodeId);
    if (sf) return sf.activities.reduce((acc, a) => add(acc, roll(a.id)), zero());
    const c = costMap.get(nodeId);
    if (!c) return zero();
    const b = costBreakdown(c);
    return { labor: b.labor, equipment: b.equipment, material: b.material, total: b.total };
  }

  const nodes: NodeRoll[] = (tpl?.nodes || [])
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((n) => {
      const r = roll(n.id);
      return { nodeId: n.id, key: n.key, name: n.name, seq: n.seq, hasSubflow: subflowMap.has(n.id), leaf: !subflowMap.has(n.id), ...r };
    });
  const total = nodes.reduce((acc, n) => add(acc, n), zero());
  return { nodes, total };
}
