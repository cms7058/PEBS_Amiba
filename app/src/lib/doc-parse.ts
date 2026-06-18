"use client";

import { DEPARTMENTS } from "./departments";
import { chatStream, loadSettings } from "./llm";
import type { Lane, ProcessActivity, ProcessEdge } from "./process-types";

// 文档 → 文本：支持纯文本/csv/bpmn/xml/json 直接读，docx 用 mammoth，pdf 用 pdfjs。
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (/\.(txt|md|csv|bpmn|xml|json)$/.test(name)) return await file.text();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    // 用 CDN worker，避免打包器 worker 配置问题
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${(pdfjs as unknown as { version: string }).version}/build/pdf.worker.min.mjs`;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((it) => (it as { str?: string }).str || "").join(" ") + "\n";
    }
    return out;
  }
  // 兜底：当作文本读
  return await file.text();
}

export interface SubflowDraft {
  lanes: Lane[];
  activities: ProcessActivity[];
  edges: ProcessEdge[];
  warnings: string[];
}

interface LlmActivity { name: string; department: string; seq?: number }
interface LlmResult { activities: LlmActivity[] }

function matchDepartment(name: string): string | undefined {
  const n = (name || "").trim();
  if (!n) return undefined;
  let d = DEPARTMENTS.find((x) => x.name === n || x.short === n);
  if (d) return d.id;
  d = DEPARTMENTS.find((x) => n.includes(x.short) || n.includes(x.name) || x.name.includes(n));
  return d?.id;
}

function stripFences(s: string): string {
  return s.replace(/```(?:json)?/gi, "").trim();
}

// 文本 → 子流程草稿（调用前端已配置的 LLM）
export async function parseTextToSubflow(text: string): Promise<SubflowDraft> {
  const settings = loadSettings();
  const provider = settings.providers[settings.defaultProvider];
  if (!provider?.apiKey) throw new Error("尚未配置大模型 API Key，请到「模型与设置」填写后再解析。");

  const deptList = DEPARTMENTS.map((d) => d.name).join("、");
  const sys =
    "你是制造业流程分析助手。从用户给的流程描述中抽取业务流程的活动序列，输出严格 JSON，" +
    "格式：{\"activities\":[{\"name\":\"活动名\",\"department\":\"部门\",\"seq\":0}]}。" +
    `department 必须从这个部门清单里选最接近的一个：${deptList}。` +
    "seq 从 0 开始按流程先后递增。只输出 JSON，不要解释、不要代码块。";

  let raw = "";
  await chatStream({
    provider,
    messages: [{ role: "system", content: sys }, { role: "user", content: text.slice(0, 12000) }],
    onChunk: (t) => { raw += t; },
  });

  let parsed: LlmResult;
  try {
    const m = stripFences(raw).match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : raw) as LlmResult;
  } catch {
    throw new Error("解析失败：模型未返回有效 JSON。可重试或改用结构化文档。");
  }

  const warnings: string[] = [];
  const laneByDept = new Map<string, Lane>();
  const activities: ProcessActivity[] = [];
  let seq = 0;
  for (const a of parsed.activities || []) {
    const depId = matchDepartment(a.department);
    if (!depId) { warnings.push(`未识别部门「${a.department}」，已跳过活动「${a.name}」`); continue; }
    let lane = laneByDept.get(depId);
    if (!lane) { lane = { id: `lane_${depId}`, departmentId: depId }; laneByDept.set(depId, lane); }
    activities.push({ id: `act_${seq}_${Math.random().toString(36).slice(2, 7)}`, name: a.name || `活动${seq}`, laneId: lane.id, seq: a.seq ?? seq });
    seq++;
  }
  // 顺序边
  const sorted = activities.slice().sort((x, y) => x.seq - y.seq);
  const edges: ProcessEdge[] = [];
  for (let i = 0; i < sorted.length - 1; i++) edges.push({ id: `e_${i}`, from: sorted[i].id, to: sorted[i + 1].id });

  if (activities.length === 0) warnings.push("未抽取到任何活动，请检查文档内容或改用更清晰的流程描述。");
  return { lanes: [...laneByDept.values()], activities, edges, warnings };
}
