"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";

import type { CardSpec } from "../../lib/diagnosis-types";
export type { CardSpec };

export function QuestionCard({
  card,
  onSubmit,
  disabled,
}: {
  card: CardSpec;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}) {
  const [single, setSingle] = useState<string | null>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState("");

  // Reset state when card changes
  useEffect(() => {
    setSingle(null);
    setMulti([]);
    setText("");
  }, [card.question]);

  if (card.type === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="text-sm font-medium text-emerald-700">{card.question}</div>
      </div>
    );
  }

  function submit(val: string) {
    if (!val.trim()) return;
    onSubmit(val);
  }

  return (
    <div className="rounded-xl border border-[color:var(--primary)]/30 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-[color:var(--primary)]" />
        <div className="text-sm font-medium text-foreground">{card.question}</div>
      </div>

      {card.type === "single" && card.options && (
        <div className="space-y-2">
          {card.options.map((opt) => (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => {
                setSingle(opt);
                submit(opt);
              }}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition disabled:opacity-50 ${
                single === opt
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5"
                  : "border-border hover:border-[color:var(--primary)]/50 hover:bg-muted/50"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  single === opt ? "border-[color:var(--primary)]" : "border-border"
                }`}
              >
                {single === opt && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />}
              </span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      )}

      {card.type === "multi" && card.options && (
        <div className="space-y-2">
          <div className="space-y-2">
            {card.options.map((opt) => {
              const checked = multi.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                    checked
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5"
                      : "border-border hover:border-[color:var(--primary)]/50 hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setMulti((m) => (e.target.checked ? [...m, opt] : m.filter((x) => x !== opt)))
                    }
                    className="h-4 w-4 rounded border-border accent-[color:var(--primary)]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">已选 {multi.length} 项</span>
            <div className="flex gap-2">
              {card.allow_skip && (
                <Button variant="ghost" size="sm" disabled={disabled} onClick={() => submit("跳过")}>
                  跳过
                </Button>
              )}
              <Button size="sm" disabled={disabled || multi.length === 0} onClick={() => submit(multi.join("、"))}>
                <Send className="h-3.5 w-3.5" /> 提交
              </Button>
            </div>
          </div>
        </div>
      )}

      {(card.type === "number" || card.type === "text") && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type={card.type === "number" ? "number" : "text"}
              value={text}
              placeholder={card.placeholder || (card.type === "number" ? "请输入数字" : "请输入...")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(text + (card.unit || ""))}
              disabled={disabled}
              className="flex-1"
            />
            {card.unit && (
              <div className="flex items-center px-2 text-sm text-muted-foreground">{card.unit}</div>
            )}
            <Button
              size="sm"
              disabled={disabled || !text.trim()}
              onClick={() => submit(text + (card.unit || ""))}
            >
              <Send className="h-3.5 w-3.5" /> 提交
            </Button>
          </div>
          {card.allow_skip && (
            <button
              disabled={disabled}
              onClick={() => submit("跳过")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              跳过此题 →
            </button>
          )}
        </div>
      )}

      {card.type === "textarea" && (
        <div className="space-y-2">
          <Textarea
            value={text}
            placeholder={card.placeholder || "请展开描述..."}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-between">
            {card.allow_skip ? (
              <button
                disabled={disabled}
                onClick={() => submit("跳过")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                跳过此题 →
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" disabled={disabled || !text.trim()} onClick={() => submit(text)}>
              <Send className="h-3.5 w-3.5" /> 提交
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
