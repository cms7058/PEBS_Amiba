import Link from "next/link";
import {
  ArrowRight, Eye, Hand, Wallet, Users, Cog, Boxes, GitBranch, Leaf, Gauge,
  Stethoscope, Building2, Workflow, Network, Activity, PieChart, Repeat, Check, X,
} from "lucide-react";
import { Logo } from "../components/brand/Logo";

// 公开产品介绍首页（无需登录）。强调 5M1E 方法论 + 成本"看得见·摸得着·拿得到"，
// 对比普通阿米巴实施的优势与实用性。

const pillars = [
  { icon: Eye, title: "看得见", color: "var(--accent)",
    desc: "OTD 价值流 BPMN 泳道图、杜邦成本树、神经网络分层图——组织、流程、成本一屏可视、可下钻。" },
  { icon: Hand, title: "摸得着", color: "#7c5cff",
    desc: "人机料法环每个节点可录入：人员/工时、设备折旧、材料单价……自动结算成本，缺数据自动生成待办清单。" },
  { icon: Wallet, title: "拿得到", color: "var(--success)",
    desc: "成本自底向上汇总到杜邦 ROE，改善任务挂甘特、完成即回写成本，实施前→后效果可量化、收益可兑现。" },
];

const compare = [
  { k: "成本核算", normal: "月底手工台账，滞后、粗到产品大类", ours: "节点级人机料法环，实时 rollup 到 ROE" },
  { k: "落地方式", normal: "顾问交报告，靠人执行，难追踪", ours: "向导式流水线 + 甘特，落到每个节点/子流程" },
  { k: "数据来源", normal: "靠访谈和经验，主观", ours: "现场实测 + 工具采集（工时/排产/BOM/精益）" },
  { k: "改善验证", normal: "凭感觉，说不清省了多少", ours: "改善前后对比，金额可见、归因到责任阿米巴" },
  { k: "复用沉淀", normal: "一次性项目，经验留在人脑", ours: "产品基准库，越做越准、越做越快" },
];

const factors = [
  { icon: Users, k: "人", d: "工时负荷、人效" },
  { icon: Cog, k: "机", d: "OEE、设备折旧" },
  { icon: Boxes, k: "料", d: "利用率、余料" },
  { icon: GitBranch, k: "法", d: "流程三性、流动效率" },
  { icon: Leaf, k: "环", d: "能耗、合规" },
  { icon: Gauge, k: "测", d: "采集成熟度、数据质量" },
];

const pipeline = [
  { icon: Network, t: "设计引擎", d: "OTD 流程骨架 + 阿米巴/部门" },
  { icon: Workflow, t: "规则引擎", d: "子流程泳道 + 成本要素 + 转让价" },
  { icon: Stethoscope, t: "诊断引擎", d: "成本问题 + 改进方向" },
  { icon: Building2, t: "企业画像", d: "人机料法环+成本 六维结论" },
  { icon: Activity, t: "部署引擎", d: "方案 + 周期 + 甘特落地" },
  { icon: PieChart, t: "总览驾驶舱", d: "甘特驱动实时成本归集" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-[color:var(--card)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110">
            体验 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5 text-[color:var(--primary)]" /> 人机料法环（5M1E）工作方法论 · 严格成本控制
        </div>
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          让阿米巴的成本
          <span className="mt-2 block"><span className="text-[color:var(--accent)]">看得见</span> · <span className="text-[#7c5cff]">摸得着</span> · <span className="text-[color:var(--success)]">拿得到</span></span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          普通阿米巴落地难，难在成本算不清、方案落不了地、效果说不清。本智能体用 5M1E 方法论，把成本拆到
          人/机/料/法/环每一个流程节点，可录入、可结算、可追踪——一条向导式流水线带你从设计到落地，效果可量化、收益可兑现。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110">
            体验 <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#compare" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium transition hover:bg-muted">
            和普通阿米巴有何不同
          </a>
        </div>
      </section>

      {/* 三大支柱 */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-5 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-xl border border-border bg-background p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: p.color }}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-xl font-bold">成本{p.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5M1E */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-semibold">5M1E 工作方法论：把成本拆到每个要素</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          人 · 机 · 料 · 法 · 环 · 测——每个要素挂成本科目与归因规则，从现场要素一路汇总到企业 ROE。
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {factors.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.k} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-2 text-2xl font-bold text-[color:var(--primary)]">{f.k}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{f.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 对比 */}
      <section id="compare" className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-center text-2xl font-semibold">普通阿米巴实施 vs 本智能体</h2>
          <div className="mt-10 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[120px_1fr_1fr] bg-muted/40 text-xs font-semibold">
              <div className="px-4 py-3" />
              <div className="px-4 py-3 text-muted-foreground">普通阿米巴实施</div>
              <div className="px-4 py-3 text-[color:var(--primary)]">本智能体</div>
            </div>
            {compare.map((r, i) => (
              <div key={r.k} className={`grid grid-cols-[120px_1fr_1fr] text-sm ${i % 2 ? "bg-background" : "bg-card"}`}>
                <div className="border-t border-border px-4 py-3 font-medium">{r.k}</div>
                <div className="flex items-start gap-1.5 border-t border-border px-4 py-3 text-muted-foreground">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" /> {r.normal}
                </div>
                <div className="flex items-start gap-1.5 border-t border-border px-4 py-3">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {r.ours}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 实施流水线 */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-semibold">一条向导式实施流水线，一步步落地</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          设计 → 规则 → 诊断 → 画像 → 部署 →（运行）总览驾驶舱。每步完成才解锁下一步，避免实施混乱。
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {pipeline.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={e.t} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{i < 5 ? `0${i + 1}` : "★"}</span>
                </div>
                <div className="mt-2 text-sm font-semibold">{e.t}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{e.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 数据飞轮 */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
            <Repeat className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">越做越准，越做越快</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            每做完一个产品的阿米巴项目，就沉淀一份可复用的成本/工时/利用率基准。下一个产品的报价、工艺、成本估算
            直接复用——数据越积越多，实施越来越快，收益持续滚动。配套四大工具（视频工时 · AI 排产 · 对话式 BOM · 精益方法论）作为现场数据底座。
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">把现场的每一分浪费，变成可归因、可兑现的收益</h2>
        <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110">
          体验 <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 上海零参科技 · PEBS Amoeba Copilot
      </footer>
    </main>
  );
}
