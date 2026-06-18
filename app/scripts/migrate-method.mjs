// 给已 itemized 的成本，每个输入/输出物补「工作方式模式」：standard.method=推荐、actual.method=实际。
// 标准取该成本旧的 workMethod.recommended；实际按一定比例选推荐或降级为半自动/手工，制造信息化差距样本。
const BASE = process.env.BASE || "http://localhost:3000";
const EID = process.env.EID || "ent_0ax4kg2vh84m";
let seed = 23; const rnd = () => { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick = a => a[Math.floor(rnd()*a.length)];
let COOKIE = "";
const api = (p, o={}) => fetch(BASE+p, { ...o, headers: { "Content-Type":"application/json", Cookie: COOKIE, ...(o.headers||{}) } });
async function login() {
  const r = await fetch(BASE+"/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"admin123456"}) });
  COOKIE = r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
const DOWN = ["半自动化采集统计", "手工采集统计", "Excel+电子传递"];

(async () => {
  await login();
  const { costs } = await (await api("/api/node-cost?enterpriseId="+EID)).json();
  let n = 0;
  for (const c of costs) {
    if (!c.standard || !("inputs" in c.standard || "outputs" in c.standard)) continue; // 仅处理 itemized
    const rec = c.workMethod?.recommended || pick(["ERP系统模块","MES系统模块","PLM/PDM系统模块"]);
    const stamp = (stdArr, actArr) => {
      (stdArr || []).forEach((it, i) => {
        it.method = rec;
        const a = actArr?.[i]; if (a) a.method = rnd() < 0.55 ? rec : pick(DOWN);
      });
    };
    stamp(c.standard.inputs, c.actual?.inputs);
    stamp(c.standard.outputs, c.actual?.outputs);
    await api("/api/node-cost", { method:"PUT", body: JSON.stringify(c) });
    n++;
  }
  console.log("stamped method on costs:", n);
})().catch(e => { console.error("ERR", e); process.exit(1); });
