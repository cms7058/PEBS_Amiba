// 迁移：把成本从「两阶段聚合」下沉到「每个输入物/输出物各自的人/工作方式/料」。
//  acquire(获取) 按活动输入物逐项分摊；generate(生成) 按输出物逐项分摊；累加=原阶段额。
// 用法：node scripts/migrate-itemize.mjs
const BASE = process.env.BASE || "http://localhost:3000";
const EID = process.env.EID || "ent_0ax4kg2vh84m";
let COOKIE = "";
const api = (p, o={}) => fetch(BASE+p, { ...o, headers: { "Content-Type":"application/json", Cookie: COOKIE, ...(o.headers||{}) } });
const ioName = x => typeof x === "string" ? x : (x?.name ?? "");
const FK = ["labor","equipment","material"];

async function login() {
  const r = await fetch(BASE+"/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"admin123456"}) });
  COOKIE = r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
function phasesOf(x) {
  if (!x) return { acquire:{}, generate:{} };
  if ("inputs" in x || "outputs" in x) return null;           // 已 itemized
  if ("acquire" in x || "generate" in x) return { acquire:x.acquire||{}, generate:x.generate||{} };
  return { acquire:{}, generate:x };                           // 旧扁平
}
// 把每个 factor 总额按 names 均分（余数给最后一项），对齐 names 顺序
function distribute(names, factors) {
  return names.map((nm, i) => {
    const item = { name: nm };
    for (const k of FK) {
      const total = Math.round(factors[k] || 0);
      if (!total || names.length === 0) continue;
      const each = Math.floor(total / names.length);
      const val = i === names.length - 1 ? total - each * (names.length - 1) : each;
      if (val) item[k] = val;
    }
    return item;
  });
}

(async () => {
  await login();
  const { subflows } = await (await api("/api/subflow?enterpriseId="+EID)).json();
  const io = new Map();
  for (const sf of subflows) for (const a of (sf.activities||[]))
    io.set(a.id, { inputs:(a.inputs||[]).map(ioName), outputs:(a.outputs||[]).map(ioName) });

  const { costs } = await (await api("/api/node-cost?enterpriseId="+EID)).json();
  let n = 0, skipped = 0;
  for (const c of costs) {
    const sp = phasesOf(c.standard), ap = phasesOf(c.actual);
    if (sp === null && ap === null) { skipped++; continue; }
    const names = io.get(c.nodeId) || { inputs:[], outputs:[] };
    const standard = { inputs: distribute(names.inputs, (sp||{acquire:{}}).acquire||{}), outputs: distribute(names.outputs, (sp||{generate:{}}).generate||{}) };
    const actual = { inputs: distribute(names.inputs, (ap||{acquire:{}}).acquire||{}), outputs: distribute(names.outputs, (ap||{generate:{}}).generate||{}) };
    await api("/api/node-cost", { method:"PUT", body: JSON.stringify({ ...c, standard, actual }) });
    n++;
  }
  console.log("itemized costs:", n, "skipped(already):", skipped);
})().catch(e => { console.error("ERR", e); process.exit(1); });
