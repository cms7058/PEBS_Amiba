"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Logo } from "../../../components/brand/Logo";
import { Button } from "../../../components/ui/Button";
import { Input, Label } from "../../../components/ui/Input";

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/m";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登录失败");
      router.push(from); router.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="brand-gradient px-6 pt-12 pb-8 text-white">
        <Logo withText size={40} />
        <h1 className="mt-6 text-xl font-semibold leading-snug">移动端登录</h1>
        <p className="mt-1 text-xs text-white/80">查看诊断会话与画像评分</p>
      </div>

      <form onSubmit={handle} className="flex-1 space-y-4 p-6">
        <div>
          <Label htmlFor="u">用户名</Label>
          <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <Label htmlFor="p">密码</Label>
          <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "登录中..." : "登录"}
        </Button>
        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          请使用 PC 端发放的账号登录
        </p>
      </form>
    </div>
  );
}

export default function MobileLoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}><Inner /></Suspense>;
}
