"use client";

import Link from "next/link";
import {
  MessageSquare,
  Map,
  Network,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { MobileQRCard } from "../../components/dashboard/MobileQRCard";

const engines = [
  { href: "/diagnosis", icon: MessageSquare, title: "诊断引擎", desc: "六维深度问询，自动生成企业阿米巴落地画像", step: "第一层" },
  { href: "/planning", icon: Map, title: "规划引擎", desc: "根据约束条件求解最优实施路径（A/B/C 三型）", step: "第二层" },
  { href: "/design", icon: Network, title: "设计引擎", desc: "行业适配的阿米巴切割结构、核算指标与内部定价", step: "第三层" },
  { href: "/deployment", icon: Activity, title: "部署引擎", desc: "任务分解、动态预警、运行陪跑", step: "第四层" },
];

const stats = [
  { label: "服务企业", value: "12", trend: "+3 本月" },
  { label: "完成诊断", value: "27", trend: "+8 本月" },
  { label: "运行中阿米巴", value: "143", trend: "覆盖 6 行业" },
  { label: "平均就绪度", value: "64", trend: "/ 100" },
];

const recents = [
  { slug: "ningbo-hengzhan", name: "宁波恒展精密冲压有限公司", industry: "汽车零部件", stage: "诊断完成", score: 67, tone: "primary" as const },
  { slug: "suzhou-zhiwei",   name: "苏州智微非标设备",         industry: "项目制非标设备", stage: "设计中", score: 58, tone: "warning" as const },
  { slug: "hangzhou-jinding", name: "杭州金鼎模具",            industry: "汽车零部件", stage: "部署中", score: 73, tone: "success" as const },
  { slug: "shanghai-changyuan", name: "上海昌远自动化",        industry: "项目制非标设备", stage: "待诊断", score: 0, tone: "muted" as const },
];

const alerts = [
  { slug: "suzhou-zhiwei-milestone",      tone: "danger" as const,  title: "苏州智微：里程碑延误",     desc: "信息化改造延期 5 周，已超红色阈值" },
  { slug: "hangzhou-jinding-data-quality", tone: "warning" as const, title: "杭州金鼎：数据质量预警",   desc: "辅料消耗台账上月缺录 12%" },
  { slug: "ningbo-hengzhan-outperform",   tone: "success" as const, title: "宁波恒展：超预期表现",     desc: "冲压阿米巴单位工时产值高于预期 18%" },
  { slug: "benchmark-updated",            tone: "primary" as const, title: "行业 Benchmark 已更新",    desc: "汽车零部件 Q2 数据新增 7 家样本" },
];

export default function HomePage() {
  return (
    <PageShell title="总览" subtitle="阿米巴动态智能体系统 · 服务台账与四层引擎入口">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardBody>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-2xl font-semibold text-foreground">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground">{s.trend}</div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {engines.map((e) => {
            const Icon = e.icon;
            return (
              <Link key={e.href} href={e.href} className="group">
                <Card className="h-full transition group-hover:border-[color:var(--primary)]/40 group-hover:shadow-md">
                  <CardBody>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge tone="muted">{e.step}</Badge>
                    </div>
                    <div className="text-[15px] font-semibold text-foreground">{e.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.desc}</div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-[color:var(--primary)]">
                      进入 <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>

        <MobileQRCard />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="最近服务企业" desc="按最新更新时间排序" />
            <CardBody className="px-0 py-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">企业名称</th>
                    <th className="px-5 py-2.5 text-left font-medium">所属行业</th>
                    <th className="px-5 py-2.5 text-left font-medium">阶段</th>
                    <th className="px-5 py-2.5 text-right font-medium">就绪度</th>
                  </tr>
                </thead>
                <tbody>
                  {recents.map((r) => (
                    <tr
                      key={r.name}
                      className="group cursor-pointer border-b border-border last:border-0 transition hover:bg-[color:var(--primary)]/5"
                      onClick={() => { window.location.href = `/demo/enterprises/${r.slug}`; }}
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link href={`/demo/enterprises/${r.slug}`} className="hover:text-[color:var(--primary)]">
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.industry}</td>
                      <td className="px-5 py-3"><Badge tone={r.tone}>{r.stage}</Badge></td>
                      <td className="px-5 py-3 text-right font-mono">{r.score || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="系统预警" desc="本周需关注事项" />
            <CardBody className="space-y-2">
              {alerts.map((a) => (
                <Link
                  key={a.slug}
                  href={`/demo/alerts/${a.slug}`}
                  className="block rounded-lg p-1.5 transition hover:bg-muted"
                >
                  <AlertRow
                    tone={a.tone}
                    icon={a.tone === "success" ? CheckCircle2 : a.tone === "primary" ? TrendingUp : AlertTriangle}
                    title={a.title}
                  >
                    {a.desc}
                  </AlertRow>
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function AlertRow({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "danger" | "warning" | "success" | "primary";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  const colors = {
    danger: "text-red-600 bg-red-50",
    warning: "text-amber-600 bg-amber-50",
    success: "text-emerald-600 bg-emerald-50",
    primary: "text-[color:var(--primary)] bg-[color:var(--primary)]/10",
  } as const;
  return (
    <div className="flex gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
