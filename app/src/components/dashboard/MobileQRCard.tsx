"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardBody, CardHeader } from "../ui/Card";

const MOBILE_ENTRY_URL = "http://121.4.117.45:3100/";

export function MobileQRCard() {
  const [url] = useState<string>(MOBILE_ENTRY_URL);

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
        </div>
      </CardBody>
    </Card>
  );
}
