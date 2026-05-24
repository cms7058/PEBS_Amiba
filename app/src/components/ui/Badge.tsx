import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-[color:var(--primary)]/10 text-[color:var(--primary)]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({ tone = "default", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
