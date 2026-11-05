"use client";
/** Small motion helpers for the home page diagrams: visibility-gated loops that honour reduced motion. */
import { useEffect, useRef, useState } from "react";
import { useUI } from "@/store/ui";

/** Continuous visibility (unlike kit useInView which fires once) — loops pause off-screen. */
export function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/**
 * A looping clock in [0,1) with the given period. Runs only while `active` and motion is on.
 * Returns `null` when motion is off, so diagrams render their static final frame.
 */
export function useLoop(periodMs: number, active: boolean): number | null {
  const motion = useUI((s) => s.motion);
  const [t, setT] = useState(0);
  const base = useRef<number | null>(null);
  const acc = useRef(0);
  useEffect(() => {
    if (!motion || !active) return;
    let raf = 0;
    let last = 0;
    base.current = null;
    const tick = (now: number) => {
      if (base.current === null) base.current = now - acc.current * periodMs;
      // ~40fps is plenty for calm motion
      if (now - last > 24) {
        last = now;
        const v = ((now - base.current) / periodMs) % 1;
        acc.current = v;
        setT(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motion, active, periodMs]);
  return motion ? t : null;
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Point on a cubic bezier. */
export function cubic(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export const fmtCompact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const fmtInt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
