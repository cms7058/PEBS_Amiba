import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import { emptyOrg, type OrgDesign } from "./org-types";

export { emptyOrg } from "./org-types";
export type { OrgDesign } from "./org-types";

const FILE = path.join(DATA_DIR, "org-designs.json");

export async function getOrg(enterpriseId: string): Promise<OrgDesign> {
  const all = await readJSON<OrgDesign[]>(FILE, []);
  return all.find((o) => o.enterpriseId === enterpriseId) || emptyOrg(enterpriseId);
}

export async function saveOrg(input: OrgDesign): Promise<OrgDesign> {
  const all = await readJSON<OrgDesign[]>(FILE, []);
  const i = all.findIndex((o) => o.enterpriseId === input.enterpriseId);
  const next = { ...input, updatedAt: new Date().toISOString() };
  if (i >= 0) all[i] = next; else all.push(next);
  await atomicWriteJSON(FILE, all);
  return next;
}
