"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, Mail, KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";

const INVITE_APPLY_URL = "https://lingcan.pebs.online/#/pages/copilot/index";

type Mode = "invite" | "password";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [mode, setMode] = useState<Mode>("invite");

  // Invite (primary)
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Password (fallback admin)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowApply(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/invite-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, invite_code: inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.action === "apply_invite") setShowApply(true);
        else setError(data.error || "登录失败");
        return;
      }
      router.push(from);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
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
      if (!res.ok) throw new Error(data.error || "登录失败");
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
      {/* Left brand panel — solid PEBS indigo, no logo */}
      <div
        className="hidden flex-1 flex-col justify-between p-12 text-white lg:flex"
        style={{ background: "var(--primary)" }}
      >
        <div className="leading-tight">
          <div className="text-base font-semibold">Amoeba Copilot</div>
          <div className="text-xs text-white/70">上海零参科技</div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/95 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            PEBS 内测版开放 · 邀请码准入
          </div>
          <h1 className="text-3xl font-semibold leading-snug">
            把麦肯锡式的<br />
            阿米巴咨询能力<br />
            封装成数字产品
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/80">
            面向汽车零部件与项目制非标设备制造业，通过 AI 动态智能体完成"诊断 → 规划 → 设计 → 部署"全链路陪跑。
          </p>
          <div className="grid max-w-lg grid-cols-2 gap-3 pt-4 text-xs text-white/85">
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
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-1">
            <div className="lg:hidden">
              <div className="text-base font-semibold text-foreground">Amoeba Copilot</div>
              <div className="text-xs text-muted-foreground">上海零参科技</div>
            </div>
            <h2 className="pt-2 text-2xl font-semibold text-foreground">
              {mode === "invite" ? "邮箱与邀请码登录" : "管理员账号登录"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "invite"
                ? "凭 PEBS 内测邀请码进入 Amoeba Copilot"
                : "本地管理员账号登录（仅用于运维和初始化）"}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-border bg-card p-1 text-xs">
            <button
              type="button"
              onClick={() => { setMode("invite"); setError(null); setShowApply(false); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
                mode === "invite" ? "bg-[color:var(--primary)] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" /> 邮箱 + 邀请码
            </button>
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); setShowApply(false); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
                mode === "password" ? "bg-[color:var(--primary)] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" /> 管理员密码
            </button>
          </div>

          {/* Invite form */}
          {mode === "invite" && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" autoFocus required
                  placeholder="请输入内测登记邮箱"
                />
              </div>
              <div>
                <Label htmlFor="invite">邀请码</Label>
                <Input
                  id="invite" value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="请输入 PEBS 内测邀请码"
                  className="font-mono tracking-wider"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <Quota label="默认权限" value="企业版" />
                <Quota label="有效时间" value="14 天" />
                <Quota label="完整能力" value="解锁" />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}

              {showApply && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="flex-1">该邮箱未注册内测，请先申请邀请码：</span>
                  <a
                    href={INVITE_APPLY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-amber-900 px-3 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                  >
                    申请邀请码 <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!showApply && (
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {loading ? "验证中..." : "验证并进入"}
                </Button>
              )}
            </form>
          )}

          {/* Password form (admin fallback) */}
          {mode === "password" && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username" autoFocus required
                  placeholder="admin"
                />
              </div>
              <div>
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" required
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? "登录中..." : "登录"}
              </Button>

              <div className="rounded-md border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
                首次部署默认账号：<span className="font-mono text-foreground">admin</span> /{" "}
                <span className="font-mono text-foreground">admin123</span>
                （建议登录后立即修改密码）
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Quota({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/[0.04] px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-[color:var(--primary)]">{value}</div>
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
