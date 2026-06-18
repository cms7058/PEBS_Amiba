// 阿米巴单元目录（汽车零部件量产典型切割）。OTD 节点通过 amibaId 归属到某个阿米巴，
// 实现「横轴 OTD 价值流 × 纵轴阿米巴核算单元」的结合：节点按阿米巴着色，
// 相邻节点跨阿米巴处即「交接点」，需定内部转让价 + 责任归属（设计方案 §11.1）。
// 后续可由设计引擎的阿米巴切割结果替换本目录。

export interface Amiba {
  id: string;
  name: string;
  short: string;
  type: "营销" | "制造" | "支持" | "职能";
  color: string;
}

export const AMIBAS: Amiba[] = [
  { id: "amb_sales", name: "营销阿米巴", short: "营销", type: "营销", color: "#4a90d9" },
  { id: "amb_eng", name: "工程/模具阿米巴", short: "工程", type: "支持", color: "#7c5cff" },
  { id: "amb_supply", name: "供应链阿米巴", short: "供应链", type: "支持", color: "#0ea5e9" },
  { id: "amb_mfg", name: "制造阿米巴", short: "制造", type: "制造", color: "#f59e0b" },
  { id: "amb_quality", name: "品质阿米巴", short: "品质", type: "支持", color: "#16a34a" },
  { id: "amb_logistics", name: "物流阿米巴", short: "物流", type: "支持", color: "#14b8a6" },
  { id: "amb_func", name: "职能阿米巴", short: "职能", type: "职能", color: "#64748b" },
];

export const AMIBA_MAP: Record<string, Amiba> = Object.fromEntries(AMIBAS.map((a) => [a.id, a]));

export function getAmiba(id?: string): Amiba | undefined {
  return id ? AMIBA_MAP[id] : undefined;
}

// OTD 13 节点的默认阿米巴归属（按 seq）
export const AMIBA_BY_SEQ: Record<number, string> = {
  0: "amb_sales", 1: "amb_eng", 2: "amb_sales", 3: "amb_eng", 4: "amb_supply",
  5: "amb_supply", 6: "amb_supply", 7: "amb_mfg", 8: "amb_quality",
  9: "amb_logistics", 10: "amb_logistics", 11: "amb_func", 12: "amb_func",
};
