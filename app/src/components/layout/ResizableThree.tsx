"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 三栏（左/中/右）可拖动调宽布局：中间自适应，左右两栏可用拖条调节。
// 窄屏（<1280px）自动堆叠为单列。宽度记忆到 localStorage。
const MIN = 220, MAX = 560;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export function ResizableThree({
  left, center, right, storageKey, leftDefault = 300, rightDefault = 300,
}: {
  left: React.ReactNode; center: React.ReactNode; right: React.ReactNode;
  storageKey: string; leftDefault?: number; rightDefault?: number;
}) {
  const [leftW, setLeftW] = useState(leftDefault);
  const [rightW, setRightW] = useState(rightDefault);
  const [wide, setWide] = useState(false);
  const [dragging, setDragging] = useState<"L" | "R" | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches); on();
    mq.addEventListener("change", on);
    try {
      const s = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (s.leftW) setLeftW(clamp(s.leftW));
      if (s.rightW) setRightW(clamp(s.rightW));
    } catch { /* ignore */ }
    return () => mq.removeEventListener("change", on);
  }, [storageKey]);

  const onDown = useCallback((side: "L" | "R") => (e: React.PointerEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = side === "L" ? leftW : rightW;
    setDragging(side);
  }, [leftW, rightW]);

  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      const delta = e.clientX - startX.current;
      if (dragging === "L") setLeftW(clamp(startW.current + delta));
      else setRightW(clamp(startW.current - delta));
    }
    function up() {
      setDragging(null);
      try { localStorage.setItem(storageKey, JSON.stringify({ leftW, rightW })); } catch { /* ignore */ }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, leftW, rightW, storageKey]);

  if (!wide) return <div className="space-y-3">{left}{center}{right}</div>;

  return (
    <div className="flex w-full max-w-full items-stretch overflow-hidden">
      <div style={{ width: leftW }} className="shrink-0 overflow-auto">{left}</div>
      <Handle active={dragging === "L"} onDown={onDown("L")} />
      <div className="min-w-0 flex-1 overflow-hidden">{center}</div>
      <Handle active={dragging === "R"} onDown={onDown("R")} />
      <div style={{ width: rightW }} className="shrink-0 overflow-auto">{right}</div>
    </div>
  );
}

function Handle({ active, onDown }: { active: boolean; onDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="拖动调节宽度"
      onPointerDown={onDown}
      className={`mx-0.5 w-1.5 shrink-0 cursor-col-resize touch-none rounded transition-colors ${active ? "bg-[color:var(--primary)]/60" : "bg-border hover:bg-[color:var(--primary)]/40"}`}
    />
  );
}
