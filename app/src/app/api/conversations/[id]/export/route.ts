import { getCurrentSession } from "../../../../../lib/auth";
import { getConversation } from "../../../../../lib/conversations";
import { getEnterprise } from "../../../../../lib/enterprises";
import { DIMENSION_LABELS, INDUSTRY_LABELS } from "../../../../../lib/diagnosis-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return new Response("未登录", { status: 401 });

  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return new Response("会话不存在", { status: 404 });
  if (s.role !== "admin" && conv.ownerId !== s.sub) return new Response("无权限", { status: 403 });

  const ent = await getEnterprise(conv.enterpriseId);
  const md = renderMarkdown(conv, ent);
  const filename = `amoeba-diagnosis-${ent?.name || conv.enterpriseId}-${conv.id}.md`;

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

function renderMarkdown(conv: import("../../../../../lib/conversations").Conversation, ent: import("../../../../../lib/enterprises").Enterprise | null): string {
  const lines: string[] = [];
  lines.push(`# 阿米巴诊断报告 · ${ent?.name || "未命名企业"}`);
  lines.push("");
  lines.push(`> 由 Amoeba Copilot 生成 · 上海零参科技 · ${new Date().toLocaleString("zh-CN")}`);
  lines.push("");

  lines.push("## 一、企业概况");
  lines.push("");
  lines.push(`| 字段 | 内容 |`);
  lines.push(`|---|---|`);
  lines.push(`| 公司名称 | ${ent?.name || "—"} |`);
  lines.push(`| 所属行业 | ${ent ? INDUSTRY_LABELS[ent.industry] : "—"} |`);
  lines.push(`| 规模 | ${ent?.scale || "—"} |`);
  lines.push(`| 联系方式 | ${ent?.contact || "—"} |`);
  lines.push(`| 诊断状态 | ${statusLabel(conv.status)} |`);
  lines.push(`| 开始时间 | ${new Date(conv.createdAt).toLocaleString("zh-CN")} |`);
  if (conv.completedAt) lines.push(`| 完成时间 | ${new Date(conv.completedAt).toLocaleString("zh-CN")} |`);
  lines.push("");

  lines.push("## 二、六维覆盖度");
  lines.push("");
  for (const k of Object.keys(conv.progress) as Array<keyof typeof conv.progress>) {
    const v = conv.progress[k] || 0;
    const bar = "█".repeat(Math.round(v / 5)) + "░".repeat(20 - Math.round(v / 5));
    lines.push(`- **${DIMENSION_LABELS[k]}** \`${bar}\` ${v}%`);
  }
  lines.push("");

  if (conv.summary) {
    lines.push("## 三、诊断画像");
    lines.push("");
    lines.push(`- **综合就绪度**：${conv.summary.score}/100`);
    lines.push(`- **推荐档次**：${conv.summary.level}`);
    lines.push(`- **预计周期**：${conv.summary.cycle}`);
    lines.push("");
    lines.push("### 优势项");
    conv.summary.advantages.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
    lines.push("### 风险项");
    conv.summary.risks.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
    lines.push("### 关键决策点");
    conv.summary.decisions.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }

  lines.push("## 四、对话原文");
  lines.push("");
  for (const t of conv.turns) {
    const role = t.role === "ai" ? "**Copilot**" : "**用户**";
    const time = new Date(t.at).toLocaleTimeString("zh-CN");
    if (t.role === "ai") {
      lines.push(`### ${role} _( ${time} )_`);
      if (t.text) lines.push("", t.text);
      if (t.card) {
        lines.push("", `> ❓ ${t.card.question}`);
        if (t.card.options) lines.push(`> 选项：${t.card.options.join(" / ")}`);
      }
      lines.push("");
    } else {
      lines.push(`### ${role} _( ${time} )_`);
      lines.push("", `> ${t.text}`);
      lines.push("");
    }
  }

  if (ent?.memory) {
    lines.push("## 五、长期记忆（供下次对话参考）");
    lines.push("");
    lines.push(ent.memory);
    lines.push("");
  }

  return lines.join("\n");
}

function statusLabel(s: string): string {
  return s === "completed" ? "已完成" : s === "in_progress" ? "进行中" : "已放弃";
}
