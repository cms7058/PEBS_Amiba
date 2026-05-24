"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Logo } from "../../components/brand/Logo";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "登录失败");
      }
      router.push(from);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden flex-1 flex-col justify-between p-12 text-white brand-gradient lg:flex">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-white/15 p-2 backdrop-blur">
            <Logo size={36} withText={false} />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">Amoeba Copilot</div>
            <div className="text-xs text-white/70">上海零参科技</div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-snug">
            把麦肯锡式的<br />
            阿米巴咨询能力<br />
            封装成数字产品
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/80">
            面向汽车零部件与项目制非标设备制造业，通过 AI 动态智能体完成"诊断 → 规划 → 设计 → 部署"全链路陪跑。
          </p>
          <div className="grid max-w-lg grid-cols-2 gap-3 pt-4 text-xs text-white/80">
            {[
              { k: "诊断能力", v: "六维深度问询" },
              { k: "设计能力", v: "行业适配方案" },
              { k: "陪跑能力", v: "落地实时预警" },
              { k: "进化能力", v: "越用越聪明" },
            ].map((f) => (
              <div key={f.k} className="rounded-lg border border-white/20 bg-white/5 p-3 backdrop-blur">
                <div className="font-medium text-white">{f.k}</div>
                <div className="mt-0.5 text-white/70">{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-white/50">© {new Date().getFullYear()} 上海零参科技发展有限公司</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <div className="lg:hidden">
              <Logo />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">登录</h2>
            <p className="text-sm text-muted-foreground">使用账号和密码登录 Amoeba Copilot</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
            首次部署默认账号：<span className="font-mono text-foreground">admin</span> /{" "}
            <span className="font-mono text-foreground">admin123</span>
            （可通过环境变量 <span className="font-mono">AMIBA_ADMIN_PASSWORD</span> 修改；登录后请立即在用户管理中修改密码）
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
      <LoginInner />
    </Suspense>
  );
}
