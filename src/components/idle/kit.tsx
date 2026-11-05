"use client";
/**
 * Small shared kit for /idle-for-agents, /live, /vision, /partners, /labs.
 * Hooks + layout atoms only. No copy lives here.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUI } from "@/store/ui";
import { FACTS } from "@/content/facts";
import { SectionIndex } from "@/components/ui/primitives";

/** Unit for arena credit: vIDLE during alpha, IDLE from beta. */
export const CREDIT = FACTS.stage === "alpha" ? "vIDLE" : "IDLE";

/** true when animations may run (OS + in-site toggle). */
export function useMotionOK() {
  return useUI((s) => s.motion);
}

/** Whether an element is on screen (keeps canvases idle off-screen). */
export function useInView<T extends Element>(rootMargin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/** Fires once when the element first enters view. */
export function useSeen<T extends Element>(rootMargin = "0px 0px -15% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, seen] as const;
}

/** Read a CSS custom property off <html>, re-read when the Field/Stands mode flips. */
export function useTokens<K extends string>(names: readonly K[]) {
  const mode = useUI((s) => s.mode);
  const [vals, setVals] = useState<Record<K, string>>(() => Object.fromEntries(names.map((n) => [n, "#888"])) as Record<K, string>);
  const key = names.join(",");
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setVals(Object.fromEntries(key.split(",").map((n) => [n, cs.getPropertyValue(`--${n}`).trim() || "#888"])) as Record<K, string>);
    };
    read();
    // mode commits after the glass sweep; re-read shortly after too
    const t = setTimeout(read, 700);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [key, mode]);
  return vals;
}

/** Canvas sized to its box at capped DPR. Returns ctx-ready draw loop. */
export function useCanvas2D(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void,
  { running, dprCap = 1.75 }: { running: boolean; dprCap?: number },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      size.current = { w: r.width, h: r.height, dpr };
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      if (!running) paint(performance.now(), 0);
    });
    ro.observe(c);
    const ctx = c.getContext("2d");
    const paint = (now: number, dt: number) => {
      if (!ctx) return;
      const { w, h, dpr } = size.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, now / 1000, dt);
    };
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(now, dt);
      raf = requestAnimationFrame(loop);
    };
    if (running) raf = requestAnimationFrame(loop);
    else paint(performance.now(), 0);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [running, dprCap]);
  return ref;
}

/** Section header: mono index rule + giant Archivo title. */
export function SectionHead({ index, title, children, className = "" }: { index: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-6 md:grid-cols-12 ${className}`}>
      <div className="md:col-span-12">
        <SectionIndex>{index}</SectionIndex>
      </div>
      <h2
        className="display display-l wdth-sweep md:col-span-8"
        style={{ fontVariationSettings: '"wdth" 88, "wght" 700' }}
      >
        {title}
      </h2>
      {children && <div className="text-[var(--paper-dim)] md:col-span-6 md:col-start-7 md:mt-2">{children}</div>}
    </div>
  );
}

/** Copy-to-clipboard mini button. */
export function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        })
      }
      className="mono shrink-0 border border-[var(--rule-strong)] px-2.5 py-1.5 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] transition-colors hover:border-[var(--paper-dim)] hover:text-[var(--paper)]"
    >
      <span aria-live="polite">{done ? "copied" : "copy"}</span>
    </button>
  );
}

/** Index string helper: `03 / 07 — TITLE`. */
export const idx = (n: number, of: number, label: string) => `${String(n).padStart(2, "0")} / ${String(of).padStart(2, "0")} — ${label}`;

/** Seeded RNG for illustrative visuals (deterministic, so SSR/CSR and reloads match). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** hex → rgba string */
export function rgba(hex: string, a: number) {
  const h = hex.replace("#", "").trim();
  if (h.length < 6) return `rgba(128,128,128,${a})`;
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
