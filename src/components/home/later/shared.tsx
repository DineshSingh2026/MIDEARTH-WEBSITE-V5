"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useUI } from "@/store/ui";
import { Reveal, SectionIndex } from "@/components/ui/primitives";

/* ───────── Visibility (continuous, not once) ───────── */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px") {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return v;
}

export const useMotionOK = () => useUI((s) => s.motion);

/* ───────── Colour tokens for canvas drawing (re-read on mode change) ───────── */
export type Tokens = Record<"void" | "deck" | "paper" | "paperDim" | "signal" | "agent" | "value" | "hot" | "frost" | "rule", string>;
const TOKEN_VARS: Record<keyof Tokens, string> = {
  void: "--void",
  deck: "--deck",
  paper: "--paper",
  paperDim: "--paper-dim",
  signal: "--signal",
  agent: "--agent",
  value: "--value",
  hot: "--hot",
  frost: "--frost",
  rule: "--rule-strong",
};
const FALLBACK: Tokens = {
  void: "#000205",
  deck: "#060b10",
  paper: "#dfe9ec",
  paperDim: "#8da0a9",
  signal: "#00ffa3",
  agent: "#22c8e8",
  value: "#e3b341",
  hot: "#ff8038",
  frost: "#bfe9ff",
  rule: "#1d282e",
};
export function useTokens() {
  const mode = useUI((s) => s.mode);
  const ref = useRef<Tokens>(FALLBACK);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next = { ...FALLBACK };
    (Object.keys(TOKEN_VARS) as (keyof Tokens)[]).forEach((k) => {
      const v = cs.getPropertyValue(TOKEN_VARS[k]).trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) next[k] = v;
    });
    ref.current = next;
  }, [mode]);
  return { ref, mode };
}

/** "#rrggbb" + alpha → rgba() */
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

/* ───────── Canvas helper: DPR-capped sizing + rAF loop only while running ───────── */
export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void;
export function useCanvas(ref: RefObject<HTMLCanvasElement | null>, draw: DrawFn, running: boolean, redrawKey: unknown = 0) {
  const drawRef = useRef(draw);
  const size = useRef({ w: 0, h: 0 });
  const tRef = useRef(0);
  const [sizeTick, setSizeTick] = useState(0);
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      size.current = { w: r.width, h: r.height };
      const ctx = c.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSizeTick((n) => n + 1);
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [ref]);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !size.current.w) return;
    const paint = (dt: number) => {
      const { w, h } = size.current;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, tRef.current, dt);
    };
    if (!running) {
      paint(0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tRef.current += dt;
      paint(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ref, running, redrawKey, sizeTick]);
  return tRef;
}

/* ───────── Section shell: ids for the camera timeline + soft void scrim ───────── */
export function Section({ n, children, className = "", labelledBy }: { n: 5 | 6 | 7 | 8 | 9; children: ReactNode; className?: string; labelledBy: string }) {
  return (
    <section id={`s${n}`} data-home-section={String(n)} aria-labelledby={labelledBy} className={`relative isolate ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--void) 74%, transparent) 16%, color-mix(in oklab, var(--void) 82%, transparent) 50%, color-mix(in oklab, var(--void) 74%, transparent) 84%, transparent 100%)",
        }}
      />
      {children}
    </section>
  );
}

/** Registration crosshair, technical-drawing style. */
export function RegMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 22 22" width="22" height="22" className={`pointer-events-none absolute text-[var(--paper-dim)] opacity-50 ${className}`}>
      <path d="M11 0v22M0 11h22" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="11" cy="11" r="4.5" fill="none" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

export function SectionHead({ index, title, body, id, className = "" }: { index: string; title: string; body?: string; id: string; className?: string }) {
  return (
    <header className={className}>
      <SectionIndex>{index}</SectionIndex>
      <Reveal as="h2" width className="display display-xl mt-6 max-w-[16ch]">
        <span id={id}>{title}</span>
      </Reveal>
      {body && (
        <Reveal as="p" delay={120} className="mt-7 max-w-[56ch] text-[1.02rem] text-[var(--paper-dim)] md:text-[1.12rem]">
          {body}
        </Reveal>
      )}
    </header>
  );
}

/** Hairline rule with mono end labels. */
export function Rule({ left, right, className = "" }: { left?: string; right?: string; className?: string }) {
  return (
    <div className={`mono flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)] ${className}`}>
      {left && <span>{left}</span>}
      <span aria-hidden className="h-px flex-1 bg-[var(--rule-strong)]" />
      {right && <span>{right}</span>}
    </div>
  );
}
