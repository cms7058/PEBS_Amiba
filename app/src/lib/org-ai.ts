"use client";

import { chatStream, loadSettings } from "./llm";
import { AMIBA_TYPE_COLORS, type AmibaUnit, type DesignDepartment } from "./org-types";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

function stripJson(s: string): string {
  const m = s.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  return m ? m[0] : s;
}

async function ask(system: string, user: string): Promise<string> {
  // 严格使用「模型与设置」里选为默认的那个模型（与诊断助手一致），避免误用其它 provider
  const s = loadSettings();
  const provider = s.providers[s.defaultProvider];
  if (!provider?.apiKey) throw new Error(`默认模型「${provider?.name || s.defaultProvider}」未配置 API Key。请到「模型与设置」为它配置，或把测试通过的模型设为默认。`);
  let raw = "";
  try {
    await chatStream({ provider, messages: [{ role: "system", content: system }, { role: "user", content: user }], onChunk: (t) => { raw += t; } });
  } catch (e) {
    throw new Error(`默认模型「${provider.name} / ${provider.model}」调用失败：${(e as Error).message}。若该模型未测试通过，请在「模型与设置」切换默认模型。`);
  }
  return raw;
}

// 文档/文本 → 部门 + 人员
export async function parseOrgFromText(text: string): Promise<{ departments: DesignDepartment[]; warnings: string[] }> {
  const sys =
    "你是组织架构分析助手。从用户给的组织架构描述中抽取部门与人员，输出严格 JSON：" +
    "{\"departments\":[{\"name\":\"部门名\",\"personnel\":[{\"name\":\"姓名\",\"role\":\"岗位\",\"monthlyIncome\":月收入数字或null}]}]}。" +
    "monthlyIncome 未知填 null。只输出 JSON，不要解释、不要代码块。";
  const raw = await ask(sys, text.slice(0, 12000));
  let parsed: { departments?: { name: string; personnel?: { name: string; role?: string; monthlyIncome?: number | null }[] }[] };
  try { parsed = JSON.parse(stripJson(raw)); } catch { throw new Error("解析失败：模型未返回有效 JSON，可重试或改用更清晰的描述。"); }
  const warnings: string[] = [];
  const departments: DesignDepartment[] = (parsed.departments || []).map((d) => ({
    id: uid("dep"),
    name: d.name || "未命名部门",
    personnel: (d.personnel || []).map((p) => ({ id: uid("emp"), name: p.name || "未命名", role: p.role, monthlyIncome: p.monthlyIncome ?? undefined })),
  }));
  if (departments.length === 0) warnings.push("未抽取到部门，请检查描述或手工添加。");
  return { departments, warnings };
}

// 部门 → AI 自主规划阿米巴单元（分组 + 转让价/核算规则建议）
export async function planAmiba(departments: DesignDepartment[]): Promise<{ amibaUnits: AmibaUnit[]; departments: DesignDepartment[]; note: string }> {
  const deptList = departments.map((d) => d.name).join("、");
  const sys =
    "你是阿米巴经营顾问。基于部门清单，把部门划分到若干阿米巴单元（营销/制造/支持/职能四类之一），" +
    "并给出每个单元的内部转让价思路与成本核算规则建议（简短）。输出严格 JSON：" +
    "{\"amibaUnits\":[{\"name\":\"单元名\",\"type\":\"营销|制造|支持|职能\",\"departments\":[\"部门名\"],\"transferPrice\":\"转让价思路\",\"costRule\":\"核算规则\"}],\"note\":\"一句话总体说明\"}。" +
    "这是建议方案，仅供参考。只输出 JSON。";
  const raw = await ask(sys, `部门清单：${deptList}`);
  let parsed: { amibaUnits?: { name: string; type?: string; departments?: string[]; transferPrice?: string; costRule?: string }[]; note?: string };
  try { parsed = JSON.parse(stripJson(raw)); } catch { throw new Error("规划失败：模型未返回有效 JSON，可重试。"); }

  const depByName = new Map(departments.map((d) => [d.name, d]));
  const cloned: DesignDepartment[] = departments.map((d) => ({ ...d, amibaId: undefined }));
  const clonedByName = new Map(cloned.map((d) => [d.name, d]));
  const types: AmibaUnit["type"][] = ["营销", "制造", "支持", "职能"];
  const amibaUnits: AmibaUnit[] = (parsed.amibaUnits || []).map((u) => {
    const type = (types.includes(u.type as AmibaUnit["type"]) ? u.type : "支持") as AmibaUnit["type"];
    const id = uid("amb");
    const deptIds: string[] = [];
    (u.departments || []).forEach((dn) => {
      const d = clonedByName.get(dn) || (depByName.has(dn) ? clonedByName.get(depByName.get(dn)!.name) : undefined);
      if (d) { d.amibaId = id; deptIds.push(d.id); }
    });
    return { id, name: u.name || "阿米巴单元", type, departmentIds: deptIds, transferPrice: u.transferPrice, costRule: u.costRule, color: AMIBA_TYPE_COLORS[type] };
  });
  return { amibaUnits, departments: cloned, note: parsed.note || "AI 建议方案，请审阅修改。" };
}
