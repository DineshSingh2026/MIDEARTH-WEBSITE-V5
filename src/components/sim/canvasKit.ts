"use client";
import { useEffect, useRef, type RefObject } from "react";
import { useUI } from "@/store/ui";

/* ───────── Theme: read live CSS vars (Field / Stands, or a local data-mode subtree) ───────── */
export type SimTheme = {
  void: string;
  deck: string;
  rule: string;
  ruleStrong: string;
  paper: string;
  paperDim: string;
  signal: string;
  agent: string;
  value: string;
  hot: string;
  frost: string;
  light: boolean;
};

export function readTheme(el: Element): SimTheme {
  const cs = getComputedStyle(el);
  const v = (k: string, f: string) => cs.getPropertyValue(k).trim() || f;
  const voidC = v("--void", "#000205");
  const [r, g, b] = hexToRgb(voidC);
  return {
    void: voidC,
    deck: v("--deck", "#060b10"),
    rule: v("--rule", "#12191d"),
    ruleStrong: v("--rule-strong", "#1d282e"),
    paper: v("--paper", "#dfe9ec"),
    paperDim: v("--paper-dim", "#8da0a9"),
    signal: v("--signal", "#00ffa3"),
    agent: v("--agent", "#22c8e8"),
    value: v("--value", "#e3b341"),
    hot: v("--hot", "#ff8038"),
    frost: v("--frost", "#bfe9ff"),
    light: (r * 299 + g * 587 + b * 114) / 1000 > 128,
  };
}

const rgbCache = new Map<string, [number, number, number]>();
export function hexToRgb(c: string): [number, number, number] {
  const hit = rgbCache.get(c);
  if (hit) return hit;
  let out: [number, number, number] = [200, 220, 230];
  const s = c.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(s)) out = [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  else if (/^[0-9a-f]{6}/i.test(s)) out = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  else {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[ ,]+/).map(Number);
      out = [p[0] | 0, p[1] | 0, p[2] | 0];
    }
  }
  rgbCache.set(c, out);
  return out;
}
export const rgba = (c: string, a: number) => {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ───────── Glow sprites: pre-rendered radial falloff, drawn with drawImage (fast bloom) ───────── */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string, light: boolean): HTMLCanvasElement {
  const key = color + (light ? "L" : "D");
  const hit = glowCache.get(key);
  if (hit) return hit;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const [r, gg, b] = hexToRgb(color);
  if (light) {
    grd.addColorStop(0, `rgba(${r},${gg},${b},0.55)`);
    grd.addColorStop(0.25, `rgba(${r},${gg},${b},0.22)`);
    grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  } else {
    grd.addColorStop(0, `rgba(255,255,255,0.95)`);
    grd.addColorStop(0.08, `rgba(${r},${gg},${b},0.9)`);
    grd.addColorStop(0.28, `rgba(${r},${gg},${b},0.28)`);
    grd.addColorStop(0.6, `rgba(${r},${gg},${b},0.06)`);
    grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  glowCache.set(key, c);
  return c;
}

export const supportsCanvasFilter = (() => {
  if (typeof document === "undefined") return false;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx || !("filter" in ctx)) return false;
    ctx.filter = "blur(2px)";
    return ctx.filter === "blur(2px)";
  } catch {
    return false;
  }
})();

/* ───────── Loop hook: ResizeObserver + DPR(cap 2) + IntersectionObserver + motion flag ───────── */
export type FrameInfo = {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size */
  W: number;
  H: number;
  dpr: number;
  /** real seconds since previous frame (0 on a static compose) */
  dt: number;
  /** performance.now() / 1000 */
  now: number;
  theme: SimTheme;
  /** false = static compose (reduced motion, paused, offscreen redraw) */
  live: boolean;
};

export function useSimCanvas(opts: {
  wrap: RefObject<HTMLElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  /** loop runs only when true (and visible). When false a single static frame is composed. */
  running: boolean;
  frame: (f: FrameInfo) => void;
  /** called once before the first static compose (e.g. pre-warm the sim) */
  onStatic?: () => void;
}) {
  const frameRef = useRef(opts.frame);
  frameRef.current = opts.frame;
  const staticRef = useRef(opts.onStatic);
  staticRef.current = opts.onStatic;
  const mode = useUI((s) => s.mode);
  const st = useRef({ W: 0, H: 0, dpr: 1, visible: false, theme: null as SimTheme | null, raf: 0, last: 0, staticDone: false });

  // resize + visibility
  useEffect(() => {
    const wrap = opts.wrap.current;
    const cv = opts.canvas.current;
    if (!wrap || !cv) return;
    const s = st.current;
    const compose = () => drawOnce(false);
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      s.W = Math.max(1, Math.round(r.width));
      s.H = Math.max(1, Math.round(r.height));
      s.dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(s.W * s.dpr);
      cv.height = Math.round(s.H * s.dpr);
      cv.style.width = `${s.W}px`;
      cv.style.height = `${s.H}px`;
      compose();
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      kick();
    }, { rootMargin: "120px 0px" });
    io.observe(wrap);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawOnce(live: boolean, dt = 0) {
    const cv = opts.canvas.current;
    const s = st.current;
    if (!cv || !s.W) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    if (!s.theme) s.theme = readTheme(cv);
    if (!live && !s.staticDone && !runningRef.current) {
      s.staticDone = true;
      staticRef.current?.();
    }
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    frameRef.current({ ctx, W: s.W, H: s.H, dpr: s.dpr, dt, now: performance.now() / 1000, theme: s.theme, live });
  }

  const runningRef = useRef(opts.running);
  runningRef.current = opts.running;

  function loop(t: number) {
    const s = st.current;
    if (!s.visible || !runningRef.current) {
      s.raf = 0;
      return;
    }
    const dt = s.last ? Math.min(0.1, (t - s.last) / 1000) : 0;
    s.last = t;
    drawOnce(true, dt);
    s.raf = requestAnimationFrame(loop);
  }
  function kick() {
    const s = st.current;
    if (s.visible && runningRef.current && !s.raf) {
      s.last = 0;
      s.raf = requestAnimationFrame(loop);
    } else if (!runningRef.current) drawOnce(false);
  }

  useEffect(() => {
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.running]);

  // mode change → re-read CSS vars on next frame (data-mode is committed before store update)
  useEffect(() => {
    const s = st.current;
    const id = requestAnimationFrame(() => {
      const cv = opts.canvas.current;
      if (cv) s.theme = readTheme(cv);
      if (!s.raf) drawOnce(false);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // colour theme change (<html data-theme>) → re-read CSS vars
  useEffect(() => {
    const s = st.current;
    const mo = new MutationObserver(() => {
      const cv = opts.canvas.current;
      if (cv) s.theme = readTheme(cv);
      if (!s.raf) drawOnce(false);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { redraw: () => drawOnce(false) };
}

/** mm:ss */
export const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** fit a w×h world into W×H (contain), returns cell size and offsets */
export function fit(W: number, H: number, w: number, h: number, pad = 0) {
  const cell = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  return { cell, ox: (W - cell * w) / 2, oy: (H - cell * h) / 2 };
}
