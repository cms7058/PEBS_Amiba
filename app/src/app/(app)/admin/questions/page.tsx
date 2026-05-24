"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Input, Label, Textarea } from "../../../../components/ui/Input";
import { Badge } from "../../../../components/ui/Badge";
import {
  DIMENSION_LABELS, type DimensionKey, type CardType,
} from "../../../../lib/diagnosis-types";

interface Question {
  id: string;
  dimension: DimensionKey;
  level: "L1" | "L2" | "L3";
  type: CardType;
  question: string;
  options?: string[];
  status: "active" | "draft" | "archived";
  source: "builtin" | "admin" | "ai_suggested";
  createdAt: string;
}

interface Suggestion {
  id: string;
  dimension: DimensionKey;
  level: "L1" | "L2" | "L3";
  type: CardType;
  question: string;
  options?: string[];
  reason: string;
  conversationId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type Tab = "bank" | "pending";

export default function AdminQuestionsPage() {
  const [tab, setTab] = useState<Tab>("bank");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pendings, setPendings] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<Suggestion | null>(null);

  async function reloadAll() {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      fetch("/api/questions"),
      fetch("/api/suggestions?status=pending"),
    ]);
    setQuestions((await qRes.json()).questions || []);
    setPendings((await sRes.json()).suggestions || []);
    setLoading(false);
  }

  useEffect(() => { reloadAll(); }, []);

  async function deleteQuestion(q: Question) {
    if (!confirm(`确认删除题目「${q.question}」？`)) return;
    await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
    reloadAll();
  }

  return (
    <PageShell title="题库管理" subtitle="维护诊断题库 · 审核智能体提出的新题目建议">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            <TabButton active={tab === "bank"} onClick={() => setTab("bank")}>
              题库 <Badge tone="muted">{questions.length}</Badge>
            </TabButton>
            <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
              <AlertCircle className="h-3.5 w-3.5" />
              待审建议
              {pendings.length > 0 && <Badge tone="warning">{pendings.length}</Badge>}
            </TabButton>
          </div>
          {tab === "bank" && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> 新增题目
            </Button>
          )}
        </div>

        {loading ? (
          <Card><CardBody className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中
          </CardBody></Card>
        ) : tab === "bank" ? (
          <QuestionBank questions={questions} onEdit={setEditing} onDelete={deleteQuestion} />
        ) : (
          <PendingList suggestions={pendings} onReview={setReviewing} />
        )}
      </div>

      {(creating || editing) && (
        <QuestionDialog
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); reloadAll(); }}
        />
      )}

      {reviewing && (
        <ReviewDialog
          suggestion={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); reloadAll(); }}
        />
      )}
    </PageShell>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
        active ? "bg-[color:var(--primary)] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionBank({ questions, onEdit, onDelete }: { questions: Question[]; onEdit: (q: Question) => void; onDelete: (q: Question) => void }) {
  const byDim: Record<DimensionKey, Question[]> = {} as never;
  questions.forEach((q) => {
    (byDim[q.dimension] = byDim[q.dimension] || []).push(q);
  });
  return (
    <div className="space-y-4">
      {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((dim) => {
        const items = byDim[dim] || [];
        return (
          <Card key={dim}>
            <CardHeader title={DIMENSION_LABELS[dim]} desc={`${items.length} 题`} />
            <CardBody className="px-0 py-0">
              {items.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">无</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {items.sort((a, b) => a.level.localeCompare(b.level)).map((q) => (
                      <tr key={q.id} className="border-b border-border last:border-0">
                        <td className="w-16 px-5 py-3">
                          <Badge tone={q.level === "L1" ? "primary" : q.level === "L2" ? "success" : "warning"}>{q.level}</Badge>
                        </td>
                        <td className="w-20 px-2 py-3 text-xs text-muted-foreground">{q.type}</td>
                        <td className="px-2 py-3">
                          <div>{q.question}</div>
                          {q.options && <div className="mt-0.5 text-xs text-muted-foreground">{q.options.join(" / ")}</div>}
                        </td>
                        <td className="w-24 px-2 py-3">
                          <Badge tone={q.source === "builtin" ? "muted" : q.source === "ai_suggested" ? "warning" : "primary"}>
                            {q.source === "builtin" ? "内置" : q.source === "ai_suggested" ? "AI 建议" : "管理员"}
                          </Badge>
                        </td>
                        <td className="w-24 px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => onEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(q)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function PendingList({ suggestions, onReview }: { suggestions: Suggestion[]; onReview: (s: Suggestion) => void }) {
  if (suggestions.length === 0) {
    return (
      <Card><CardBody className="py-10 text-center text-sm text-muted-foreground">
        当前没有待审核的建议题目
      </CardBody></Card>
    );
  }
  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <Card key={s.id}>
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge tone="warning">AI 建议</Badge>
                  <Badge tone="muted">{DIMENSION_LABELS[s.dimension]} · {s.level} · {s.type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <div className="text-sm font-medium">{s.question}</div>
                {s.options && (
                  <div className="text-xs text-muted-foreground">选项：{s.options.join(" / ")}</div>
                )}
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-medium">智能体理由：</span>{s.reason}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <MessageSquare className="mr-1 inline h-3 w-3" />
                  来自会话 {s.conversationId}
                </div>
              </div>
              <Button size="sm" onClick={() => onReview(s)}>审核</Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

const TYPES: CardType[] = ["single", "multi", "number", "text", "textarea"];

function QuestionDialog({
  initial, onClose, onSaved,
}: { initial: Question | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [dimension, setDimension] = useState<DimensionKey>(initial?.dimension || "organization");
  const [level, setLevel] = useState<"L1" | "L2" | "L3">(initial?.level || "L1");
  const [type, setType] = useState<CardType>(initial?.type || "single");
  const [question, setQuestion] = useState(initial?.question || "");
  const [optionsText, setOptionsText] = useState(initial?.options?.join("\n") || "");
  const [status, setStatus] = useState<"active" | "draft" | "archived">(initial?.status || "active");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const body = {
      dimension, level, type, question,
      options: ["single", "multi"].includes(type) ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
      status,
    };
    try {
      const url = isEdit ? `/api/questions/${initial!.id}` : "/api/questions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">{isEdit ? "编辑题目" : "新增题目"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>维度</Label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as DimensionKey)}
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((k) => (
                <option key={k} value={k}>{DIMENSION_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>层级</Label>
            <div className="flex gap-1">
              {(["L1", "L2", "L3"] as const).map((l) => (
                <button
                  key={l} type="button" onClick={() => setLevel(l)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                    level === l ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]" : "border-border hover:bg-muted"
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label>题目类型</Label>
          <div className="grid grid-cols-5 gap-1">
            {TYPES.map((t) => (
              <button
                key={t} type="button" onClick={() => setType(t)}
                className={`rounded-md border px-2 py-1.5 text-[11px] ${
                  type === t ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]" : "border-border hover:bg-muted"
                }`}
              >{t}</button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="dlg-q">问题文本</Label>
          <Textarea id="dlg-q" value={question} onChange={(e) => setQuestion(e.target.value)} required rows={3} />
        </div>
        {(type === "single" || type === "multi") && (
          <div>
            <Label htmlFor="dlg-opts" hint="每行一个选项">选项</Label>
            <Textarea id="dlg-opts" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} />
          </div>
        )}
        <div>
          <Label>状态</Label>
          <div className="flex gap-1">
            {(["active", "draft", "archived"] as const).map((s) => (
              <button
                key={s} type="button" onClick={() => setStatus(s)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                  status === s ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]" : "border-border hover:bg-muted"
                }`}
              >{s === "active" ? "启用" : s === "draft" ? "草稿" : "归档"}</button>
            ))}
          </div>
        </div>
        {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} 保存</Button>
        </div>
      </form>
    </div>
  );
}

function ReviewDialog({
  suggestion, onClose, onDone,
}: { suggestion: Suggestion; onClose: () => void; onDone: () => void }) {
  const [question, setQuestion] = useState(suggestion.question);
  const [optionsText, setOptionsText] = useState(suggestion.options?.join("\n") || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function approve() {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          patch: {
            question,
            options: ["single", "multi"].includes(suggestion.type)
              ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "批准失败");
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function reject() {
    if (!confirm("确认拒绝该建议？")) return;
    setSaving(true);
    await fetch(`/api/suggestions/${suggestion.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">审核建议题目</h3>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
          <div className="mb-1 font-medium text-amber-800">智能体理由</div>
          <div className="text-amber-900">{suggestion.reason}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          维度：{DIMENSION_LABELS[suggestion.dimension]} · 层级：{suggestion.level} · 类型：{suggestion.type}
        </div>
        <div>
          <Label>问题文本（可编辑后再批准）</Label>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
        </div>
        {["single", "multi"].includes(suggestion.type) && (
          <div>
            <Label hint="每行一个">选项</Label>
            <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} />
          </div>
        )}
        {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="danger" onClick={reject} disabled={saving}>
            <X className="h-4 w-4" /> 拒绝
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={approve} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              批准并加入题库
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
