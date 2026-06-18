// 迁移既有模拟数据到新模型：
//  1) 活动输入物 string[] → IOItem[]，标识 继承(上节点输出)/新增
//  2) 成本 standard/actual 扁平 → {acquire:输入物获取, generate:输出物生成}（叠加=原总额，保持诊断数值不变）
// 用法：node scripts/migrate-io-cost.mjs
const BASE = process.env.BASE || "http://localhost:3000";
const EID = process.env.EID || "ent_0ax4kg2vh84m";
let seed = 11; const rnd = () => { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
let COOKIE = "";
const api = (p, o={}) => fetch(BASE+p, { ...o, headers: { "Content-Type":"application/json", Cookie: COOKIE, ...(o.headers||{}) } });

async function login() {
  const r = await fetch(BASE+"/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"admin123456"}) });
  COOKIE = r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
const ioName = x => typeof x === "string" ? x : (x?.name ?? "");
const splitPhase = (flat, acqRatio) => {
  if (!flat) return undefined;
  const acquire = {}, generate = {};
  for (const k of ["labor","equipment","material"]) {
    const v = typeof flat[k] === "number" ? flat[k] : 0;
    const a = Math.round(v * acqRatio);
    if (a) acquire[k] = a;
    const g = Math.round(v) - a;
    if (g) generate[k] = g;
  }
  return { acquire, generate };
};
const isPhase = x => x && (("acquire" in x) || ("generate" in x));

(async () => {
  await login();
  const { subflows } = await (await api("/api/subflow?enterpriseId="+EID)).json();
  let sfn = 0;
  for (const sf of subflows) {
    const acts = (sf.activities || []).slice().sort((a,b)=>a.seq-b.seq);
    const prevOutputs = new Set();
    const newActs = acts.map((a, i) => {
      const outs = (a.outputs || []).map(ioName).filter(Boolean);
      const inputs = (a.inputs || []).map((x, idx) => {
        const name = ioName(x);
        // 继承：名称命中此前活动的任一输出；或非首活动的第一个输入（表示上游交接）
        const inherited = prevOutputs.has(name) || (i > 0 && idx === 0);
        return { name, inherited };
      });
      outs.forEach(o => prevOutputs.add(o));
      return { ...a, inputs, outputs: outs };
    });
    await api("/api/subflow/"+sf.id, { method:"PATCH", body: JSON.stringify({ activities: newActs }) });
    sfn++;
  }

  const { costs } = await (await api("/api/node-cost?enterpriseId="+EID)).json();
  let cn = 0;
  for (const c of costs) {
    if (isPhase(c.standard) && isPhase(c.actual)) continue; // 已是新结构
    const stdRatio = 0.3, actRatio = 0.25 + rnd()*0.2; // 实际侧获取占比略浮动，使两阶段差值各异
    const standard = isPhase(c.standard) ? c.standard : splitPhase(c.standard, stdRatio);
    const actual = isPhase(c.actual) ? c.actual : splitPhase(c.actual, actRatio);
    await api("/api/node-cost", { method:"PUT", body: JSON.stringify({ ...c, standard, actual }) });
    cn++;
  }
  console.log("migrated subflows:", sfn, "costs:", cn);
})().catch(e => { console.error("ERR", e); process.exit(1); });
