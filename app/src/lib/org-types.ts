// 设计引擎：组织架构 + 阿米巴单元设计（客户端/服务端共用，无 fs）。
// 用户导入组织架构 → 解析为部门+人员 → AI 自主规划阿米巴单元 → 杜邦式架构图。

export interface Personnel { id: string; name: string; role?: string; monthlyIncome?: number }

export interface DesignDepartment {
  id: string;
  name: string;
  personnel: Personnel[];
  amibaId?: string;            // 归属的阿米巴单元
}

export interface AmibaUnit {
  id: string;
  name: string;
  type: "营销" | "制造" | "支持" | "职能";
  departmentIds: string[];
  transferPrice?: string;      // 部门/单元转让价规则（文本）
  costRule?: string;           // 内部成本核算规则（文本）
  color?: string;
}

export interface OrgDesign {
  enterpriseId: string;
  departments: DesignDepartment[];
  amibaUnits: AmibaUnit[];
  updatedAt?: string;
}

export const AMIBA_TYPE_COLORS: Record<AmibaUnit["type"], string> = {
  营销: "#4a90d9", 制造: "#f59e0b", 支持: "#0ea5e9", 职能: "#64748b",
};

export function emptyOrg(enterpriseId: string): OrgDesign {
  return { enterpriseId, departments: [], amibaUnits: [] };
}
