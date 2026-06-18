"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plug, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { PageShell } from "../../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
import { TOOLS } from "../../../../../lib/tools-registry";
import { FACTOR_LABELS } from "../../../../../lib/factory-types";

interface ConnectorState {
  registrations: { source: string; version?: string; capabilities?: string[]; lastSeenAt: string }[];
  ingested: string[];
}

export default function IntegrationsPage() {
  const params = useParams<{ id: string }>();
  const entId = params.id;
  const [state, setState] = useState<ConnectorState>({ registrations: [], ingested: [] });
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!entId) return;
    fetch(`/api/connectors?enterpriseId=${entId}`)
      .then((r) => r.json())
      .then((d) => setState({ registrations: d.registrations || [], ingested: d.ingested || [] }));
  }, [entId]);

  async function connect(source: string) {
    if (!entId) return;
    setConnecting(source);
    try {
      const res = await fetch("/api/connectors/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: entId, source }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "接入失败");
      // 自动跳转到该工具的注册页，把接入参数带过去
      window.location.href = d.redirectUrl;
    } catch (e) {
      alert((e as Error).message);
      setConnecting(null);
    }
  }

  return (
    <PageShell title="工具接入" subtitle="把 Worktime / APS / BOM / LeanAI 插拔接入阿米巴 · 数据自动上传">
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          {TOOLS.map((tool) => {
            const reg = state.registrations.find((r) => r.source === tool.id);
            const hasData = state.ingested.includes(tool.id);
            const status = hasData ? "已上报数据" : reg ? "已注册" : "未接入";
            const tone = hasData ? "success" : reg ? "primary" : "muted";
            return (
              <Card key={tool.id} className="h-full">
                <CardHeader
                  title={tool.name}
                  desc={tool.tagline}
                  action={<Badge tone={tone as "success" | "primary" | "muted"}>{status}</Badge>}
                />
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tool.factors.map((f) => (
                      <Badge key={f} tone="muted">{FACTOR_LABELS[f]}</Badge>
                    ))}
                    {tool.capabilities.map((c) => (
                      <span key={c} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{c}</span>
                    ))}
                  </div>
                  {reg && (
                    <div className="text-[11px] text-muted-foreground">
                      {reg.version && <span>版本 {reg.version} · </span>}
                      最近在线 {new Date(reg.lastSeenAt).toLocaleString("zh-CN")}
                    </div>
                  )}
                  <Button
                    onClick={() => connect(tool.id)}
                    disabled={!entId || connecting === tool.id}
                    className="w-full"
                  >
                    {connecting === tool.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> 生成令牌中…</>
                    ) : hasData ? (
                      <><CheckCircle2 className="h-4 w-4" /> 重新接入 / 换令牌</>
                    ) : (
                      <><Plug className="h-4 w-4" /> 接入并跳转注册 <ExternalLink className="h-3.5 w-3.5" /></>
                    )}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardBody className="text-xs leading-relaxed text-muted-foreground">
            接入流程：点击「接入」→ 阿米巴为该企业+工具生成连接器令牌 → 自动跳转到工具注册页（携带
            <code className="mx-1">amiba_endpoint / amiba_token / enterprise_id / source</code>）→
            工具侧保存后即开始把现场数据上传到阿米巴。工具不配这些参数时仍可独立使用。
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
