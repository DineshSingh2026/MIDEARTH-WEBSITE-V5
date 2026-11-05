"use client";
/**
 * Shared primitives for the ConceptDiagrams.
 * Every diagram is a pure function of time `t` (seconds) → one SVG frame (viewBox 400×300).
 * The loop runs only while on screen; with reduced motion we render a fixed, fully-built frame.
 */
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useUI } from "@/store/ui";

export type Pt = [number, number];

export const C = {
  paper: "var(--paper)",
  dim: "var(--paper-dim)",
  rule: "var(--rule)",
  ruleS: "var(--rule-strong)",
  void: "var(--void)",
  deck: "var(--deck)",
  raise: "var(--deck-raise)",
  signal: "var(--signal)",
  agent: "var(--agent)",
  value: "var(--value)",
  hot: "var(--hot)",
  frost: "var(--frost)",
  blue: "var(--brand-blue)",
  lime: "var(--brand-lime)",
} as const;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** deterministic LCG so SSR and client agree */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** integer hash → [0,1) */
export const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** point at fraction t along a polyline */
export function along(pts: Pt[], t: number): Pt {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = clamp(t) * L[L.length - 1];
  for (let i = 1; i < pts.length; i++) {
    if (d <= L[i] || i === pts.length - 1) {
      const k = L[i] === L[i - 1] ? 0 : (d - L[i - 1]) / (L[i] - L[i - 1]);
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    }
  }
  return pts[pts.length - 1];
}
/** sample a quadratic bezier into a polyline */
export function quad(a: Pt, c: Pt, b: Pt, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}
export const pts2d = (p: Pt[]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");

/**
 * Animation clock. Runs ~30fps only while the diagram is in view and motion is allowed.
 * `staticP` is the phase shown for reduced motion / before start (a fully-built frame).
 */
export function useLoop(period: number, staticP: number) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useUI((s) => s.motion);
  const [t, setT] = useState(0);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!motion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    let last = 0;
    let lastPaint = 0;
    let acc = 0;
    let visible = false;
    const tick = (ts: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      acc += dt;
      if (ts - lastPaint > 32) {
        lastPaint = ts;
        setT(acc);
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) {
          last = 0;
          setLive(true);
          raf = requestAnimationFrame(tick);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [motion]);
  const on = motion && live;
  const tt = on ? t : staticP * period;
  return { ref, p: (tt % period) / period, t: tt, cycle: Math.floor(tt / period) };
}

/** Dome agent glyph (the EXEC mascot silhouette), centred on x,y. */
const DOME = "M8,64 C8,30 30,6 60,6 C90,6 112,30 112,64 C112,76 104,84 92,84 C84,84 78,80 68,82 C60,84 54,90 44,88 C34,86 30,80 22,82 C12,84 8,76 8,64 Z";
export function Dome({ x, y, size = 18, color = C.agent, opacity = 1, flip = false }: { x: number; y: number; size?: number; color?: string; opacity?: number; flip?: boolean }) {
  const s = size / 120;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s}) translate(-60,-48)`} opacity={opacity}>
      <path d={DOME} fill={color} stroke="color-mix(in oklab, var(--void) 55%, transparent)" strokeWidth={5} />
      <ellipse cx="70" cy="48" rx="8" ry="11" fill="#fff" />
      <ellipse cx="87.5" cy="39" rx="9" ry="12" fill="#fff" />
    </g>
  );
}

/** mono label */
export function T({ x, y, children, size = 9, fill = C.dim, anchor = "start", weight, ls = "0.06em", opacity }: { x: number; y: number; children: ReactNode; size?: number; fill?: string; anchor?: "start" | "middle" | "end"; weight?: number; ls?: string; opacity?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight} letterSpacing={ls} opacity={opacity}>
      {children}
    </text>
  );
}

/** Card frame: role=img wrapper, dotted field, title row, optional footer caption. */
export function Frame({
  label,
  loopRef,
  title,
  meta,
  footer,
  footerColor,
  className = "",
  children,
}: {
  label: string;
  loopRef: RefObject<HTMLDivElement | null>;
  title: string;
  meta?: ReactNode;
  footer?: string;
  footerColor?: string;
  className?: string;
  children: (uid: string) => ReactNode;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Diagram geometry uses trig/hypot whose last bits can differ between server and browser:
  // draw the animated body client-side only (title row is SSR-ed so the card never jumps).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // the card draws open (left → right) the first time it enters view
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = loopRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loopRef]);
  return (
    <div
      ref={loopRef}
      role="img"
      aria-label={label}
      data-in={seen ? "" : undefined}
      className={`dg-in relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--rule-strong)] bg-[var(--deck)] ${className}`}
    >
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden="true" style={{ fontFamily: "var(--font-mono)" }}>
        <defs>
          <pattern id={`dots-${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--paper)" opacity="0.07" />
          </pattern>
          <radialGradient id={`vig-${uid}`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="var(--agent)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--deck)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#dots-${uid})`} />
        <rect width="400" height="300" fill={`url(#vig-${uid})`} />
        <T x={16} y={22} size={9} fill={C.paper} ls="0.14em" opacity={0.85}>
          {title}
        </T>
        {meta}
        <line x1={16} x2={384} y1={30.5} y2={30.5} stroke={C.ruleS} strokeWidth={0.75} />
        {mounted && children(uid)}
        {footer && (
          <T x={200} y={291} anchor="middle" size={8.5} fill={footerColor ?? C.dim} ls="0.04em">
            {footer}
          </T>
        )}
      </svg>
    </div>
  );
}

/** right-aligned meta in the title row */
export function Meta({ children, color = C.dim, dot }: { children: ReactNode; color?: string; dot?: string }) {
  return (
    <g>
      {dot && <circle cx={384 - 4} cy={19} r={2.6} fill={dot} />}
      <T x={dot ? 374 : 384} y={22} anchor="end" size={8.5} fill={color} ls="0.1em">
        {children}
      </T>
    </g>
  );
}

export const fmt2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
