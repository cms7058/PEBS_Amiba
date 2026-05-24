"use client";

import { useEffect, useState } from "react";
import { Smartphone, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";

export function MobileQRCard() {
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Prefer explicit env override (e.g. https://copilot.example.com),
    // fall back to current origin so it just works after deploy
    const base =
      process.env.NEXT_PUBLIC_PUBLIC_URL?.replace(/\/+$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    setUrl(`${base}/m`);
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[color:var(--primary)]" />
            移动端入口
          </span>
        }
        desc="手机扫码登录 · 随时查看对话与画像评分"
      />
      <CardBody className="flex items-center gap-4">
        <div className="shrink-0 rounded-lg border border-border bg-white p-2">
          {url ? (
            <QRCodeSVG value={url} size={120} level="M" includeMargin={false} />
          ) : (
            <div className="h-[120px] w-[120px] animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className="min-w-0 space-y-2 text-xs">
          <div>
            <div className="mb-0.5 text-muted-foreground">使用方式</div>
            <ol className="list-decimal space-y-0.5 pl-4 text-foreground">
              <li>手机扫描左侧二维码</li>
              <li>用 PC 端发放的账号登录</li>
              <li>查看对话历史与诊断得分</li>
            </ol>
          </div>
          <div>
            <div className="mb-0.5 text-muted-foreground">链接</div>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-[10px]" title={url}>
                {url || "..."}
              </code>
              <Button size="sm" variant="ghost" onClick={copy} disabled={!url}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
