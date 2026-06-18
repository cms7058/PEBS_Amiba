import { getAmiba, type Amiba } from "./amibas";

// 部门目录 + 部门→阿米巴映射（设计方案 §13.2）。
// 子流程泳道 = 部门；跨阿米巴的部门交接 = 正式转让价，同阿米巴内跨部门 = 轻量协作价。

export interface Department {
  id: string;
  name: string;
  short: string;
  amibaId: string;   // 归属阿米巴
}

export const DEPARTMENTS: Department[] = [
  { id: "dep_sales", name: "销售部", short: "销售", amibaId: "amb_sales" },
  { id: "dep_design", name: "设计部", short: "设计", amibaId: "amb_eng" },
  { id: "dep_process", name: "工艺部", short: "工艺", amibaId: "amb_eng" },
  { id: "dep_pmc", name: "计划部 PMC", short: "计划", amibaId: "amb_supply" },
  { id: "dep_purchase", name: "采购部", short: "采购", amibaId: "amb_supply" },
  { id: "dep_warehouse", name: "仓储部", short: "仓储", amibaId: "amb_supply" },
  { id: "dep_stamping", name: "冲压车间", short: "冲压", amibaId: "amb_mfg" },
  { id: "dep_welding", name: "焊接车间", short: "焊接", amibaId: "amb_mfg" },
  { id: "dep_coating", name: "涂装车间", short: "涂装", amibaId: "amb_mfg" },
  { id: "dep_assembly", name: "总装车间", short: "总装", amibaId: "amb_mfg" },
  { id: "dep_qc", name: "质检部", short: "质检", amibaId: "amb_quality" },
  { id: "dep_logistics", name: "物流部", short: "物流", amibaId: "amb_logistics" },
  { id: "dep_finance", name: "财务部", short: "财务", amibaId: "amb_func" },
];

export const DEPARTMENT_MAP: Record<string, Department> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

export function getDepartment(id?: string): Department | undefined {
  return id ? DEPARTMENT_MAP[id] : undefined;
}

export function amibaOfDepartment(departmentId?: string): Amiba | undefined {
  return getAmiba(getDepartment(departmentId)?.amibaId);
}

/** 两个部门交接的转让价层级：跨阿米巴=正式，同阿米巴跨部门=轻量协作，相同部门=无 */
export function handoffLevel(fromDeptId?: string, toDeptId?: string): "none" | "collab" | "transfer" {
  if (!fromDeptId || !toDeptId || fromDeptId === toDeptId) return "none";
  const a = getDepartment(fromDeptId)?.amibaId;
  const b = getDepartment(toDeptId)?.amibaId;
  if (a && b && a !== b) return "transfer";   // 跨阿米巴 → 正式转让价
  return "collab";                            // 同阿米巴内跨部门 → 轻量协作价
}
