export type DimensionKey =
  | "organization" | "finance" | "it" | "equipment" | "process" | "culture";

export const DIMENSION_KEYS: DimensionKey[] = [
  "organization", "finance", "it", "equipment", "process", "culture",
];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  organization: "组织维度",
  finance: "财务维度",
  it: "信息化维度",
  equipment: "设备维度",
  process: "流程维度",
  culture: "文化维度",
};

export type CardType = "single" | "multi" | "number" | "text" | "textarea" | "done";

export interface CardSpec {
  type: CardType;
  question: string;
  options?: string[];
  placeholder?: string;
  unit?: string;
  allow_skip?: boolean;
}

export interface ConversationTurn {
  role: "ai" | "user";
  text: string;
  card?: CardSpec;
  envelope?: AIEnvelope;
  at: string; // ISO timestamp
}

export interface AIEnvelope {
  progress: Record<DimensionKey, number>;
  current_dimension: DimensionKey;
  card: CardSpec;
  summary?: DiagnosisSummary | null;
  propose_question?: ProposedQuestion | null;
}

export interface DiagnosisSummary {
  score: number;          // 0-100
  level: "L1" | "L2" | "L3";
  cycle: string;
  advantages: string[];
  risks: string[];
  decisions: string[];
  dimension_scores?: Record<DimensionKey, number>;
}

export interface ProposedQuestion {
  dimension: DimensionKey;
  level: "L1" | "L2" | "L3";
  type: CardType;
  question: string;
  options?: string[];
  reason: string; // why agent thinks this should be added
}

export type Industry = "auto_parts" | "project_equipment" | "other";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  auto_parts: "汽车零部件制造业",
  project_equipment: "项目制非标设备制造业",
  other: "其他制造业",
};
