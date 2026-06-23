"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package, Plus, Loader2, ExternalLink, Clock } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Input, Label } from "../../../../components/ui/Input";
import { TOOLS, getTool } from "../../../../lib/tools-registry";
import type { ToolId } from "../../../../lib/otd-types";

interface ToolData { manHours?: number; laborCost?: number; summary?: string; metrics?: { label: string; value: number; unit?: string }[]; reportedAt: string }
interface Product {
  id: string; partNo: string; name: string; status: string;
  toolData?: Partial<Record<ToolId, ToolData>>;
  createdAt: string;
}

// 支持「按产品建项目」的工具集合（registry 标记 productWorkbench）
const WORKBENCH_TOOLS = TOOLS.filter((t) => t.productWorkbench).map((t) => t.id as ToolId);

export default function ProductsPage() {
  const params = useParams<{ id: string }>();
  const entId = params.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [connected, setConnected] = useState<Set<ToolId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [partNo, setPartNo] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null); // `${productId}:${tool}`

  async function reload() {
    setLoading(true);
    const [d, c] = await Promise.all([
      fetch(`/api/products?enterpriseId=${entId}`).then((r) => r.json()),
      fetch(`/api/connectors?enterpriseId=${entId}`).then((r) => r.json()).catch(() => ({})),
    ]);
    setProducts(d.products || []);
    // 已接入工具：注册过 或 上报过数据，且支持 productWorkbench
    const sources = new Set<string>([
      ...((c.registrations || []) as { source: string }[]).map((r) => r.source),
      ...((c.ingested || []) as string[]),
    ]);
    setConnected(new Set(WORKBENCH_TOOLS.filter((t) => sources.has(t))));
    setLoading(false);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [entId]);

  async function create() {
    if (!partNo.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: entId, partNo, name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "创建失败");
      setPartNo(""); setName(""); reload();
    } catch (e) { alert((e as Error).message); }
    finally { setCreating(false); }
  }

  async function openWorkbench(p: Product, tool: ToolId) {
    setLaunching(`${p.id}:${tool}`);
    try {
      const res = await fetch(`/api/products/${p.id}/launch?tool=${tool}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "打开失败");
      window.location.href = d.launchUrl;
    } catch (e) { alert((e as Error).message); setLaunching(null); }
  }

  const noTools = connected.size === 0;

  return (
    <PageShell title="产品工作台" subtitle="按产品（订单/零件号）建项目；接入的子工具完成后把工时与指标自动回传到该产品">
      <div className="space-y-4">
        <Card>
          <CardHeader title="新建产品" desc="录入订单号 / 零件号" action={<Package className="h-4 w-4 text-[color:var(--primary)]" />} />
          <CardBody className="flex flex-wrap items-end gap-3">
            <div><Label>零件号 / 订单号</Label><Input value={partNo} onChange={(e) => setPartNo(e.target.value)} placeholder="如 PN-2024-018" className="mt-1 w-48" /></div>
            <div><Label>产品名称（可选）</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 前桥支架总成" className="mt-1 w-56" /></div>
            <Button onClick={create} disabled={creating} size="sm">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 新建</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="产品列表" desc="点工具按钮用平台令牌登入该工具、按本产品建项目并开始作业；完成后工时/指标回传到此产品" />
          <CardBody>
            {loading && <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />加载中…</div>}
            {!loading && noTools && <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">本企业尚无支持「按产品建项目」的已接入工具。请先在诊断结论的「对症工具」处接入 BOM / APS / LeanAI / 视频工时等工具。</div>}
            {!loading && products.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">暂无产品，先在上方新建。</div>}
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">{p.name} <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{p.partNo}</span></div>
                    </div>
                    {/* 仅 BOM 走产品页打开工作台；APS/Lean 等改为在诊断结论页接入时选产品 */}
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      {WORKBENCH_TOOLS.filter((t) => t === "bom" && connected.has(t)).map((t) => {
                        const tool = getTool(t);
                        const key = `${p.id}:${t}`;
                        return (
                          <Button key={t} size="sm" variant="outline" onClick={() => openWorkbench(p, t)} disabled={launching === key}>
                            {launching === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} {tool?.name.split("·")[0].replace(/^PEBS\s+/, "").trim() || t}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  {/* 各工具回填摘要 */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {WORKBENCH_TOOLS.map((t) => {
                      const d = p.toolData?.[t];
                      if (!d) return null;
                      const tool = getTool(t);
                      return (
                        <div key={t} className="flex items-center gap-1 text-[11px] text-emerald-700">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{tool?.name.split("·")[1]?.trim() || t}</span>
                          {typeof d.manHours === "number" && <span>{d.manHours}h</span>}
                          {d.laborCost ? <span>· ¥{Math.round(d.laborCost).toLocaleString("zh-CN")}</span> : null}
                          {(d.metrics || []).map((m) => <span key={m.label}>· {m.label} {m.value}{m.unit || ""}</span>)}
                          {d.summary ? <span className="text-muted-foreground">· {d.summary}</span> : null}
                          <span className="text-muted-foreground">· {new Date(d.reportedAt).toLocaleString("zh-CN")}</span>
                        </div>
                      );
                    })}
                    {!WORKBENCH_TOOLS.some((t) => p.toolData?.[t]) && <div className="text-[11px] text-muted-foreground">尚无工具回填</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
