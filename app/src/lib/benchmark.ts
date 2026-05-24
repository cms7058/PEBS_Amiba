import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import { DIMENSION_KEYS, type DimensionKey, type Industry } from "./diagnosis-types";

/**
 * Anonymized data point added each time a diagnosis is finalized.
 * NO enterprise name / contact / memory ever stored here.
 */
export interface BenchmarkSample {
  industry: Industry;
  score: number;                                   // overall readiness 0-100
  level: "L1" | "L2" | "L3";
  dimensions: Record<DimensionKey, number>;        // 0-100 each
  scale?: string;                                  // e.g. "300 人"
  at: string;
}

export interface IndustryStats {
  industry: Industry;
  count: number;
  scoreAvg: number;
  scoreP25: number;
  scoreP50: number;
  scoreP75: number;
  dimensionAvg: Record<DimensionKey, number>;
  levelDist: Record<"L1" | "L2" | "L3", number>;
}

const FILE = path.join(DATA_DIR, "benchmark.json");

// Seeded baseline so first user already sees comparable numbers.
// These are illustrative figures, refreshed as real samples come in.
const SEED: BenchmarkSample[] = [
  { industry: "auto_parts", score: 64, level: "L2", scale: "200-500 人", at: "2026-01-15T00:00:00Z",
    dimensions: { organization: 68, finance: 72, it: 52, equipment: 60, process: 66, culture: 56 } },
  { industry: "auto_parts", score: 71, level: "L2", scale: "500-1000 人", at: "2026-02-04T00:00:00Z",
    dimensions: { organization: 75, finance: 80, it: 65, equipment: 70, process: 72, culture: 62 } },
  { industry: "auto_parts", score: 58, level: "L1", scale: "100-200 人", at: "2026-02-20T00:00:00Z",
    dimensions: { organization: 60, finance: 64, it: 45, equipment: 55, process: 60, culture: 50 } },
  { industry: "auto_parts", score: 82, level: "L3", scale: "1000+ 人", at: "2026-03-12T00:00:00Z",
    dimensions: { organization: 85, finance: 88, it: 80, equipment: 78, process: 82, culture: 75 } },
  { industry: "auto_parts", score: 55, level: "L1", scale: "100-200 人", at: "2026-04-05T00:00:00Z",
    dimensions: { organization: 58, finance: 60, it: 40, equipment: 55, process: 58, culture: 48 } },
  { industry: "auto_parts", score: 67, level: "L2", scale: "200-500 人", at: "2026-04-22T00:00:00Z",
    dimensions: { organization: 70, finance: 74, it: 55, equipment: 65, process: 68, culture: 58 } },

  { industry: "project_equipment", score: 52, level: "L1", scale: "100-200 人", at: "2026-01-22T00:00:00Z",
    dimensions: { organization: 55, finance: 58, it: 42, equipment: 48, process: 56, culture: 50 } },
  { industry: "project_equipment", score: 68, level: "L2", scale: "200-500 人", at: "2026-02-18T00:00:00Z",
    dimensions: { organization: 70, finance: 72, it: 60, equipment: 65, process: 70, culture: 65 } },
  { industry: "project_equipment", score: 61, level: "L2", scale: "200-500 人", at: "2026-03-08T00:00:00Z",
    dimensions: { organization: 65, finance: 65, it: 52, equipment: 58, process: 63, culture: 58 } },
  { industry: "project_equipment", score: 76, level: "L3", scale: "500-1000 人", at: "2026-04-15T00:00:00Z",
    dimensions: { organization: 78, finance: 80, it: 72, equipment: 70, process: 75, culture: 70 } },

  { industry: "other", score: 60, level: "L2", at: "2026-02-10T00:00:00Z",
    dimensions: { organization: 62, finance: 64, it: 55, equipment: 58, process: 60, culture: 56 } },
  { industry: "other", score: 70, level: "L2", at: "2026-03-25T00:00:00Z",
    dimensions: { organization: 72, finance: 74, it: 65, equipment: 68, process: 70, culture: 65 } },
];

async function ensureSeeded() {
  const all = await readJSON<BenchmarkSample[]>(FILE, []);
  if (all.length === 0) await atomicWriteJSON(FILE, SEED);
}

export async function appendSample(sample: BenchmarkSample) {
  await ensureSeeded();
  const all = await readJSON<BenchmarkSample[]>(FILE, []);
  all.push(sample);
  // cap to last 1000 to prevent unbounded growth
  await atomicWriteJSON(FILE, all.length > 1000 ? all.slice(-1000) : all);
}

export async function listSamples(): Promise<BenchmarkSample[]> {
  await ensureSeeded();
  return readJSON<BenchmarkSample[]>(FILE, []);
}

export async function getIndustryStats(industry: Industry): Promise<IndustryStats | null> {
  const all = await listSamples();
  const subset = all.filter((s) => s.industry === industry);
  if (subset.length === 0) return null;

  const scores = subset.map((s) => s.score).sort((a, b) => a - b);
  const p = (q: number) => scores[Math.min(scores.length - 1, Math.floor(scores.length * q))];

  const dimensionAvg = Object.fromEntries(
    DIMENSION_KEYS.map((k) => [
      k,
      Math.round(subset.reduce((sum, s) => sum + (s.dimensions[k] || 0), 0) / subset.length),
    ])
  ) as Record<DimensionKey, number>;

  const levelDist = { L1: 0, L2: 0, L3: 0 } as Record<"L1" | "L2" | "L3", number>;
  subset.forEach((s) => (levelDist[s.level] = (levelDist[s.level] || 0) + 1));

  return {
    industry,
    count: subset.length,
    scoreAvg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    scoreP25: p(0.25),
    scoreP50: p(0.5),
    scoreP75: p(0.75),
    dimensionAvg,
    levelDist,
  };
}

/**
 * Where does this enterprise sit in the industry distribution?
 * Returns percentile (0-100), e.g. 73 = "outperforms 73% of industry peers".
 */
export async function percentileForIndustry(industry: Industry, score: number): Promise<number | null> {
  const all = await listSamples();
  const subset = all.filter((s) => s.industry === industry);
  if (subset.length === 0) return null;
  const below = subset.filter((s) => s.score < score).length;
  return Math.round((below / subset.length) * 100);
}
