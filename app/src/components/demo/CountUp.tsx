"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startTimeRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startTimeRef.current == null) startTimeRef.current = t;
      const elapsed = t - (startTimeRef.current as number);
      const k = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const fixed = display.toFixed(decimals);
  return <span className={className}>{prefix}{fixed}{suffix}</span>;
}
