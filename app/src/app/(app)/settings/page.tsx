"use client";

import { useEffect, useState } from "react";
import { Check, Save, Sparkles, KeyRound } from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Input, Label } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type LLMSettings,
  type ProviderConfig,
  type ProviderId,
} from "../../../lib/llm";

export default function SettingsPage() {
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<ProviderId | null>(null);
  const [testResult, setTestResult] = useState<Record<ProviderId, string>>({} as never);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function update(id: ProviderId, patch: Partial<ProviderConfig>) {
    setSettings((s) => ({
      ...s,
      providers: { ...s.providers, [id]: { ...s.providers[id], ...patch } },
    }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (confirm("确认恢复为默认配置？将清除已保存的 API Key。")) {
      setSettings(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
    }
  }

  async function handleTest(id: ProviderId) {
    const p = settings.providers[id];
    if (!p.apiKey) {
      setTestResult((r) => ({ ...r, [id]: "请先填入 API Key" }));
      return;
    }
    setTesting(id);
    setTestResult((r) => ({ ...r, [id]: "" }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: p.baseUrl,
          model: p.model,
          apiKey: p.apiKey,
          protocol: p.protocol || "openai",
          messages: [{ role: "user", content: "你好，请用一句话回应。" }],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setTestResult((r) => ({ ...r, [id]: "连接成功 ✓" }));
    } catch (e) {
      setTestResult((r) => ({ ...r, [id]: `失败：${(e as Error).message.slice(0, 120)}` }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <PageShell title="模型与设置" subtitle="配置每个大模型的 API 地址、Key 和默认模型">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader
            title="默认对话模型"
            desc="诊断对话、设计建议等智能体默认调用以下模型；可随时切换。"
            action={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  恢复默认
                </Button>
                <Button size="sm" onClick={handleSave}>
                  {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saved ? "已保存" : "保存全部"}
                </Button>
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(settings.providers) as ProviderId[]).map((id) => {
                const p = settings.providers[id];
                const active = settings.defaultProvider === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSettings((s) => ({ ...s, defaultProvider: id }))}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5"
                        : "border-border hover:border-[color:var(--primary)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{p.name}</div>
                      {active && <Badge tone="primary">默认</Badge>}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{p.brand} · {p.model}</div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {(Object.keys(settings.providers) as ProviderId[]).map((id) => {
          const p = settings.providers[id];
          return (
            <Card key={id}>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[color:var(--primary)]" />
                    {p.name}
                    <span className="text-xs font-normal text-muted-foreground">· {p.brand}</span>
                  </div>
                }
                desc="所有兼容 OpenAI 协议的模型都按 /chat/completions 端点调用。"
                action={
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => update(id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-[color:var(--primary)]"
                    />
                    启用
                  </label>
                }
              />
              <CardBody className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label hint="选错协议会导致 502 上游错误">API 协议</Label>
                  <div className="flex gap-2">
                    {(["openai", "anthropic"] as const).map((proto) => {
                      const active = (p.protocol || "openai") === proto;
                      return (
                        <button
                          key={proto}
                          type="button"
                          onClick={() => update(id, { protocol: proto })}
                          className={`flex-1 rounded-md border px-3 py-2 text-xs transition ${
                            active
                              ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <div className="font-semibold">
                            {proto === "openai" ? "OpenAI 兼容" : "Anthropic Messages"}
                          </div>
                          <div className="mt-0.5 text-[10px] opacity-70">
                            {proto === "openai" ? "POST /chat/completions" : "POST /v1/messages"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label htmlFor={`${id}-baseUrl`}>Base URL</Label>
                  <Input
                    id={`${id}-baseUrl`}
                    value={p.baseUrl}
                    onChange={(e) => update(id, { baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div>
                  <Label htmlFor={`${id}-model`}>Model</Label>
                  <Input
                    id={`${id}-model`}
                    value={p.model}
                    onChange={(e) => update(id, { model: e.target.value })}
                    placeholder="模型名称"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor={`${id}-key`} hint="仅保存在本地浏览器，不会上传服务器">
                    <span className="flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> API Key</span>
                  </Label>
                  <Input
                    id={`${id}-key`}
                    type="password"
                    value={p.apiKey}
                    onChange={(e) => update(id, { apiKey: e.target.value })}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{testResult[id]}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testing === id}
                    onClick={() => handleTest(id)}
                  >
                    {testing === id ? "测试中..." : "测试连接"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}

        <p className="text-center text-[11px] text-muted-foreground">
          API Key 仅存储在你当前浏览器的 localStorage，请勿在公共设备上保存。
        </p>
      </div>
    </PageShell>
  );
}
