"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";

export function Logo({ size = 36, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withText && (
        <div className="min-w-0 leading-tight whitespace-nowrap">
          <div className="text-[14px] font-semibold tracking-tight text-foreground">
            Amoeba <span className="text-[color:var(--primary)]">Copilot</span>
          </div>
          <div className="text-[11px] text-muted-foreground">上海零参科技</div>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="logo-orb absolute inset-0 rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wider text-white">
          PEBS
        </span>
      </div>
    );
  }

  // Wide logo: cap width tightly so it never crowds out the wordmark next to it.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="PEBS"
      style={{ height: size, width: "auto", maxWidth: size * 1.8 }}
      className="shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}
