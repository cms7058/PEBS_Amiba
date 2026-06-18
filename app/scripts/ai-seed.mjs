// 一次性脚本：用 MiniMax 为全部 OTD 节点 AI 生成多层级子流程，并叠加模拟实际值/质量指标。
// 用法：MINIMAX_KEY=sk-... node scripts/ai-seed.mjs
const BASE = process.env.BASE || "http://localhost:3000";
const KEY = process.env.MINIMAX_KEY;
const EID = process.env.EID || "ent_0ax4kg2vh84m";
if (!KEY) { console.error("缺少 MINIMAX_KEY"); process.exit(1); }

const DEEP = new Set(["on_sanewbdtuptc", "on_nqg9p43luptc", "on_rc3medmwuptc"]); // 这些节点再下钻一层
const AMC = { amb_sales:"#4a90d9", amb_eng:"#7c3aed", amb_supply:"#0891b2", amb_mfg:"#d97706", amb_quality:"#dc2626", amb_logistics:"#16a34a", amb_func:"#64748b" };

let seed = 7; const rnd = () => { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick = a => a[Math.floor(rnd()*a.length)];
const uid = p => p+"_"+Math.random().toString(36).slice(2,7)+Date.now().toString(36).slice(-3);
const stripJson = s => { const m = s.replace(/```(?:json)?/gi,"").match(/\{[\s\S]*\}/); return m?m[0]:s; };

let COOKIE = "";
async function api(path, opts={}) {
  const r = await fetch(BASE+path, { ...opts, headers: { "Content-Type":"application/json", Cookie: COOKIE, ...(opts.headers||{}) } });
  return r;
}
async function login() {
  const r = await fetch(BASE+"/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"admin123456"}) });
  const sc = r.headers.getSetCookie();
  COOKIE = sc.map(c => c.split(";")[0]).join("; ");
  if (!COOKIE) throw new Error("登录未拿到 cookie");
}
async function chat(sys, user) {
  const r = await fetch(BASE+"/api/chat", { method:"POST", headers:{"Content-Type":"application/json", Cookie: COOKIE}, body: JSON.stringify({
    baseUrl:"https://api.minimaxi.com/anthropic", model:"MiniMax-M2.7", apiKey:KEY, protocol:"anthropic",
    messages:[{role:"system",content:sys},{role:"user",content:user}] }) });
  const txt = await r.text();
  let out = "";
  for (const evt of txt.split("\n\n")) {
    const l = evt.split("\n").find(x => x.startsWith("data:"));
    if (!l) continue;
    const pl = l.slice(5).trim();
    if (pl === "[DONE]") continue;
    try { const j = JSON.parse(pl); out += (j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || ""); } catch {}
  }
  return out;
}
const sysFor = label => `你是制造业流程顾问。为业务环节「${label}」设计一个 BPMN 子流程：列出 4-7 个活动的先后顺序。每个活动给出：name(活动名)、department(负责部门)、seq(从0递增)、inputs(输入物数组)、outputs(输出物数组)、recommendedMethod(完成输出物的最优工作方式,如"ERP核算模块"/"MES订单模块")、methodOptions(候选工作方式数组,含手工/Excel电子传递/系统等)、stdLabor/stdEquipment/stdMaterial(该活动人工/设备信息系统/材料的标准参考成本,元,按行业通用水平,未知给0)、decompose(该活动是否本身多步骤需再拆子流程,true/false)。输出严格JSON：{"activities":[{"name":"","department":"","seq":0,"inputs":[],"outputs":[],"recommendedMethod":"","methodOptions":[],"stdLabor":0,"stdEquipment":0,"stdMaterial":0,"decompose":false}]}。只输出JSON。`;

async function genLevel(ownerId, label, amibaId) {
  const raw = await chat(sysFor(label), `环节：${label}`);
  let parsed; try { parsed = JSON.parse(stripJson(raw)); } catch { return { err:"bad json", head: raw.slice(0,100) }; }
  const acts = parsed.activities || [];
  const laneByDept = new Map(); const activities = []; const edges = []; const seeds = {}; const decompose = [];
  let i = 0;
  for (const a of acts) {
    const dep = a.department || "未指定";
    let lane = laneByDept.get(dep);
    if (!lane) { lane = { id:uid("lane"), departmentId:uid("dep"), name:dep, color:AMC[amibaId]||"#2d2a8e", amibaUnitId:amibaId }; laneByDept.set(dep, lane); }
    const id = uid("act");
    activities.push({ id, name:a.name||("活动"+i), laneId:lane.id, seq:a.seq??i, inputs:Array.isArray(a.inputs)?a.inputs.filter(Boolean):[], outputs:Array.isArray(a.outputs)?a.outputs.filter(Boolean):[] });
    seeds[id] = { stdLabor:a.stdLabor||0, stdEquipment:a.stdEquipment||0, stdMaterial:a.stdMaterial||0, recommendedMethod:a.recommendedMethod||"", methodOptions:Array.isArray(a.methodOptions)?a.methodOptions.filter(Boolean):[] };
    if (a.decompose) decompose.push(id);
    i++;
  }
  const sorted = activities.slice().sort((x,y)=>x.seq-y.seq);
  for (let k=0;k<sorted.length-1;k++) edges.push({ id:uid("e"), from:sorted[k].id, to:sorted[k+1].id });
  const sf = (await (await api("/api/subflow", { method:"POST", body: JSON.stringify({ enterpriseId:EID, ownerNodeId:ownerId, ownerLabel:label }) })).json()).subflow;
  await api("/api/subflow/"+sf.id, { method:"PATCH", body: JSON.stringify({ lanes:[...laneByDept.values()], activities, edges }) });
  for (const act of activities) {
    const s = seeds[act.id];
    const f = () => pick([1.25,0.8,1.0,1.4,0.9,1.0,1.15]);
    const q = () => pick([98,95,92,88,85,99,90,82,96,91]);
    const am = rnd()<0.5 ? s.recommendedMethod : pick(["手工统计","Excel+电子传递","OA审批流"]);
    await api("/api/node-cost", { method:"PUT", body: JSON.stringify({
      enterpriseId:EID, nodeId:act.id, label:act.name,
      standard:{ labor:s.stdLabor||undefined, equipment:s.stdEquipment||undefined, material:s.stdMaterial||undefined },
      actual:{ labor:s.stdLabor?Math.round(s.stdLabor*f()):0, equipment:s.stdEquipment?Math.round(s.stdEquipment*f()):0, material:s.stdMaterial?Math.round(s.stdMaterial*f()):0 },
      workMethod:{ recommended:s.recommendedMethod||undefined, actual:am||undefined, options:s.methodOptions },
      metrics:{ inputAccuracy:q(), inputTimeliness:q(), outputAccuracy:q(), outputTimeliness:q() }
    }) });
  }
  return { activities, decompose };
}

(async () => {
  await login();
  const otd = await (await api("/api/otd?enterpriseId="+EID)).json();
  const nodes = otd.templates[0].nodes;
  for (const node of nodes) {
    const r = await genLevel(node.id, node.name, node.amibaId);
    if (r.err) { console.log("✗", node.name, r.err, r.head); continue; }
    let deeper = 0;
    if (DEEP.has(node.id) && r.decompose.length) {
      const da = r.activities.find(a => a.id === r.decompose[0]);
      if (da) { const r2 = await genLevel(da.id, da.name, node.amibaId); if (!r2.err) deeper = r2.activities.length; }
    }
    console.log("✓", node.name, "→", r.activities.length, "活动", deeper?("(+下钻"+deeper+")"):"");
  }
  console.log("DONE");
})().catch(e => { console.error("ERR", e); process.exit(1); });
