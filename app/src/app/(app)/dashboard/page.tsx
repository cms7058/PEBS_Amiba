"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Plus, Loader2, Factory } from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input, Label } from "../../../components/ui/Input";
import { MobileQRCard } from "../../../components/dashboard/MobileQRCard";
import { INDUSTRY_LABELS, type Industry } from "../../../lib/diagnosis-types";

interface Enterprise {
  id: string;
  name: string;
  industry: Industry;
  scale?: string;
  latestSummary?: { score: number; level: string } | null;
}

export default function ConsolePage() {
  const router = useRouter();
  const [list, setList] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ name: string; industry: Industry; scale: string }>({
    name: "", industry: "auto_parts", scale: "",
  });

  function load() {
    fetch("/api/enterprises").then((r) => r.json()).then((d) => {
      setList(d.enterprises || []);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/enterprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "创建失败");
      router.push(`/e/${d.enterprise.id}`);
    } catch (err) {
      alert((err as Error).message);
      setCreating(false);
    }
  }

  return (
    <PageShell title="企业台账" subtitle="阿米巴动态智能体 · 选择一家企业进入工作区（首页为诊断）">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {list.length} 家服务企业
          </div>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> 新建企业
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader title="新建服务企业" desc="创建后进入其工作区开始诊断" />
            <CardBody>
              <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Label>企业名称</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：宁波恒展精密冲压" />
                </div>
                <div>
                  <Label>所属行业</Label>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value as Industry })}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
                      <option key={k} value={k}>{INDUSTRY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>规模（可选）</Label>
                  <Input value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value })} placeholder="如：320 人 / 营收 2.8 亿" />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 创建并进入
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">加载中…</div>
        ) : list.length === 0 ? (
          <Card><CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <Factory className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">还没有服务企业，点击「新建企业」开始。</div>
          </CardBody></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <button key={e.id} onClick={() => router.push(`/e/${e.id}`)}
                className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-[color:var(--primary)]/40 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  {e.latestSummary
                    ? <Badge tone="success">就绪度 {e.latestSummary.score}</Badge>
                    : <Badge tone="muted">待诊断</Badge>}
                </div>
                <div className="mt-3 font-semibold text-foreground">{e.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{INDUSTRY_LABELS[e.industry]}{e.scale ? ` · ${e.scale}` : ""}</div>
                <div className="mt-3 flex items-center gap-1 text-xs text-[color:var(--primary)]">
                  进入工作区 <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        <MobileQRCard />
      </div>
    </PageShell>
  );
}
