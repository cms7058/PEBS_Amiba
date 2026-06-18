// 去掉每个输入/输出物的「工作方式金额」(equipment)，保留 method 模式与 人/料 金额。
const BASE = process.env.BASE || "http://localhost:3000";
const EID = process.env.EID || "ent_0ax4kg2vh84m";
let COOKIE = "";
const api = (p, o={}) => fetch(BASE+p, { ...o, headers: { "Content-Type":"application/json", Cookie: COOKIE, ...(o.headers||{}) } });
async function login() {
  const r = await fetch(BASE+"/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"admin123456"}) });
  COOKIE = r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
const strip = arr => (arr || []).forEach(it => { delete it.equipment; });

(async () => {
  await login();
  const { costs } = await (await api("/api/node-cost?enterpriseId="+EID)).json();
  let n = 0;
  for (const c of costs) {
    if (!c.standard || !("inputs" in c.standard || "outputs" in c.standard)) continue;
    strip(c.standard.inputs); strip(c.standard.outputs);
    strip(c.actual?.inputs); strip(c.actual?.outputs);
    await api("/api/node-cost", { method:"PUT", body: JSON.stringify(c) });
    n++;
  }
  console.log("dropped equipment amount on costs:", n);
})().catch(e => { console.error("ERR", e); process.exit(1); });
