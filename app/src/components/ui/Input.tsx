import { cn } from "../../lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-primary disabled:opacity-50";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-9", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-[80px] resize-y", className)} {...rest} />;
}

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
      <span>{children}</span>
      {hint && <span className="text-muted-foreground">{hint}</span>}
    </label>
  );
}
