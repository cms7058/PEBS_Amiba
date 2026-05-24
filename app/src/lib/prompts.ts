import type { DimensionKey, Industry, ProposedQuestion } from "./diagnosis-types";

export type { DimensionKey };

export const DIMENSION_KEYS: DimensionKey[] = [
  "organization", "finance", "it", "equipment", "process", "culture",
];

export const INDUSTRY_HINTS: Record<Industry, string> = {
  auto_parts:
    "客户集中（主机厂强势、年降压力）；IATF16949 质量刚性；Kanban / JIT 计划驱动；多品种小批量；换线成本是核心竞争力。",
  project_equipment:
    "一品一议、复用率低；方案阶段不确定性大；工期博弈紧张；知识沉淀难，经验在人脑而非系统。",
  other: "请在对话中通过追问推断行业特征。",
};

export interface DiagnosisPromptInput {
  industry: Industry;
  enterpriseName: string;
  enterpriseMemory?: string;
  activeQuestions: Array<{
    id: string;
    dimension: DimensionKey;
    level: "L1" | "L2" | "L3";
    type: string;
    question: string;
    options?: string[];
  }>;
}

export function buildDiagnosisSystemPrompt(input: DiagnosisPromptInput): string {
  const qBank = input.activeQuestions
    .map(
      (q) =>
        `- [${q.dimension}/${q.level}/${q.type}] ${q.question}` +
        (q.options?.length ? `  选项：${q.options.join(" | ")}` : "")
    )
    .join("\n");

  const memorySection = input.enterpriseMemory
    ? `\n## 该企业的长期记忆（来自历次对话沉淀）\n${input.enterpriseMemory.trim()}\n\n请在新对话中**自然地引用**这些已知事实，不要重新询问已知内容。`
    : "";

  return `你是 Amoeba Copilot 的诊断引擎，由上海零参科技（PEBS）研发。本次服务的企业：${input.enterpriseName}。

## 行业背景
${INDUSTRY_HINTS[input.industry]}
${memorySection}

## 题库（优先从中选题，可按上下文调整问法）
${qBank}

## 输出协议（极为重要）
每次回复必须包含两部分：
1. 自然语言：对用户上一回答的简短点评 + 解释下一题为什么问（≤ 80 字）
2. 紧接着输出一个 \`\`\`json 代码块\`\`\`，结构：

\`\`\`json
{
  "progress": {
    "organization": 0, "finance": 0, "it": 0,
    "equipment": 0, "process": 0, "culture": 0
  },
  "current_dimension": "organization",
  "card": {
    "type": "single | multi | number | text | textarea | done",
    "question": "下一题（一句话）",
    "options": ["A", "B"],
    "placeholder": "占位（text/number 用）",
    "unit": "单位",
    "allow_skip": true
  },
  "summary": null,
  "propose_question": null
}
\`\`\`

字段：
- progress：0-100，本轮回答完后六维覆盖度。
- current_dimension：本轮在问的维度。
- card.type：
  - single / multi / number / text / textarea
  - done：表示诊断完成，此时 summary 必填、card.question 写"诊断已完成"
- summary（仅 done 时）：
  \`\`\`json
  { "score": 0-100, "level": "L1|L2|L3", "cycle": "12-15 个月",
    "advantages": ["..."], "risks": ["..."], "decisions": ["..."],
    "dimension_scores": { "organization": 75, ... } }
  \`\`\`
- **propose_question（关键，新增）**：当用户提到一个"题库未覆盖、但确实重要"的现状时，把建议的题目放在这里：
  \`\`\`json
  { "dimension": "...", "level": "L1|L2|L3", "type": "...",
    "question": "...", "options": [...], "reason": "为什么应该问" }
  \`\`\`
  一次最多提 1 条；多数轮次留 null。

## 对话原则
- **自然语言里不要重复问题本身**——问题已在卡片里。
- 一次只发 1 张卡片，问题简洁，能给选项就给。
- 维度切换时主动告知："接下来看 XX 维度"。
- 若该企业已有"长期记忆"，**绝不重新问已经回答过的内容**，直接跳过或简单确认。
- 全程中文、克制、不用 emoji。`;
}

export const WELCOME_TEXT = "你好，我是 Amoeba Copilot 诊断引擎。我会按六维深度问询，帮你企业生成阿米巴落地画像。可以随时离开，下次继续。";

export function buildWelcomeEnvelope(industry: Industry, hasMemory: boolean) {
  return {
    progress: { organization: 0, finance: 0, it: 0, equipment: 0, process: 0, culture: 0 },
    current_dimension: "organization" as DimensionKey,
    card: hasMemory
      ? {
          type: "single" as const,
          question: "我已经看过这家企业的历史记录，本次想重点关注哪个维度？",
          options: ["延续上次的诊断", "组织", "财务", "信息化", "设备", "流程", "文化"],
          allow_skip: false,
        }
      : {
          type: "single" as const,
          question: industry === "auto_parts"
            ? "先确认下：你们目前主要给哪类客户供货？"
            : industry === "project_equipment"
              ? "先确认下：你们做的非标设备目前主要服务哪个行业？"
              : "先大致说说：你们做的产品 / 业务模式是？",
          options: industry === "auto_parts"
            ? ["主机厂直供 (Tier 1)", "Tier 2 给上游零部件厂", "售后 / 备件市场", "混合"]
            : industry === "project_equipment"
              ? ["新能源 (光伏 / 锂电)", "半导体 / 电子", "汽车产线", "其他工业"]
              : ["流程型生产 (化工 / 食品)", "离散制造 (机加 / 装配)", "其他"],
          allow_skip: false,
        },
    summary: null,
    propose_question: null,
  };
}

export const MEMORY_GENERATION_PROMPT = `你是 Amoeba Copilot 的"记忆生成器"。
根据下面这段刚结束的诊断对话，生成一份给未来对话使用的「企业事实摘要」：
- 不超过 300 字
- 用第三人称客观陈述
- 包含：行业、规模、信息化基础、关键人物风格、当前痛点、已识别的优势/风险
- 避免主观评价、避免重复罗列原话
- 输出纯文本，不要 markdown，不要 JSON

对话原文：`;
