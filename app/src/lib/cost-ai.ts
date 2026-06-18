"use client";

import { chatStream, loadSettings } from "./llm";

// AI 生成「标准参考值」：基于活动 + 行业通用水平，给出人/设备信息系统/料的标准参考成本（元/期）。
// 作为对照实际值的基准，供差值分析与后续诊断/画像/部署使用。
export async function suggestStandardCost(
  nodeLabel: string,
  actual: { labor: number; equipment: number; material: number },
): Promise<{ labor?: number; equipment?: number; material?: number }> {
  const s = loadSettings();
  const provider = s.providers[s.defaultProvider];
  if (!provider?.apiKey) throw new Error(`默认模型「${provider?.name || s.defaultProvider}」未配置 API Key。请到「模型与设置」配置或切换默认模型。`);

  const sys =
    "你是制造业阿米巴成本基准顾问。为给定活动给出【标准参考成本】(元/期)三项：人工、设备/信息系统、材料，" +
    "基于行业通用水平，作为对照实际值的基准参考（是参考值，非绝对标准）。" +
    '输出严格 JSON：{"labor":数字,"equipment":数字,"material":数字}，单位元。只输出 JSON，不要解释。';
  const user = `活动：${nodeLabel}。当前实际成本（仅供你判断量级）：人工 ${actual.labor} 元、设备/信息系统 ${actual.equipment} 元、材料 ${actual.material} 元。请给出合理的标准参考值。`;

  let raw = "";
  try {
    await chatStream({ provider, messages: [{ role: "system", content: sys }, { role: "user", content: user }], onChunk: (t) => { raw += t; } });
  } catch (e) {
    throw new Error(`默认模型「${provider.name} / ${provider.model}」调用失败：${(e as Error).message}`);
  }
  const m = raw.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  let p: { labor?: unknown; equipment?: unknown; material?: unknown };
  try { p = JSON.parse(m ? m[0] : raw); } catch { throw new Error("AI 未返回有效 JSON，可重试。"); }
  const num = (x: unknown) => (typeof x === "number" && isFinite(x) ? Math.round(x) : undefined);
  return { labor: num(p.labor), equipment: num(p.equipment), material: num(p.material) };
}

export interface NodeStandards {
  inputs: string[];
  outputs: string[];
  standard: { labor?: number; equipment?: number; material?: number };
  workMethod: { recommended?: string; options?: string[] };
}

// 点击节点即自动生成：标准输入物/输出物名称、标准参考值、最优工作方式（一次调用）。
export async function suggestNodeStandards(nodeLabel: string): Promise<NodeStandards> {
  const s = loadSettings();
  const provider = s.providers[s.defaultProvider];
  if (!provider?.apiKey) throw new Error(`默认模型「${provider?.name || s.defaultProvider}」未配置 API Key。`);
  const sys =
    "你是制造业阿米巴流程与成本顾问。对给定活动，按行业通用做法给出标准设置（参考值）：" +
    "inputs(标准输入物名称数组)、outputs(标准输出物名称数组)、recommendedMethod(完成输出物的最优工作方式，如 ERP核算模块/MES订单模块)、" +
    "methodOptions(候选工作方式数组，含 手工统计/Excel电子文件传递/系统模块 等)、" +
    "stdLabor/stdEquipment/stdMaterial(人工/设备信息系统/材料 标准参考成本，元/期，未知给0)。" +
    '输出严格 JSON：{"inputs":[],"outputs":[],"recommendedMethod":"","methodOptions":[],"stdLabor":0,"stdEquipment":0,"stdMaterial":0}。只输出 JSON。';
  let raw = "";
  try {
    await chatStream({ provider, messages: [{ role: "system", content: sys }, { role: "user", content: `活动：${nodeLabel}` }], onChunk: (t) => { raw += t; } });
  } catch (e) {
    throw new Error(`默认模型「${provider.name} / ${provider.model}」调用失败：${(e as Error).message}`);
  }
  const m = raw.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  let p: { inputs?: unknown; outputs?: unknown; recommendedMethod?: unknown; methodOptions?: unknown; stdLabor?: unknown; stdEquipment?: unknown; stdMaterial?: unknown };
  try { p = JSON.parse(m ? m[0] : raw); } catch { throw new Error("AI 未返回有效 JSON，可重试。"); }
  const num = (x: unknown) => (typeof x === "number" && isFinite(x) && x > 0 ? Math.round(x) : undefined);
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string" && !!v) : []);
  return {
    inputs: arr(p.inputs), outputs: arr(p.outputs),
    standard: { labor: num(p.stdLabor), equipment: num(p.stdEquipment), material: num(p.stdMaterial) },
    workMethod: { recommended: typeof p.recommendedMethod === "string" ? p.recommendedMethod : undefined, options: arr(p.methodOptions) },
  };
}
