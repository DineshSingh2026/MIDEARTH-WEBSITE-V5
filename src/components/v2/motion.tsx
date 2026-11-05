"use client";
/**
 * Motion helpers (v2, second pass). Everything here is progress-linked or once-on-enter;
 * nothing pins, nothing hijacks the wheel.
 *
 *  - useScrub(): writes the element's scroll progress (0→1) into a CSS variable (default `--sp`)
 *    measured live from the element's rect on every (rAF-throttled) scroll frame, so it can never go stale
 *    when content above changes height (live arena data, images). CSS does the drawing; no re-renders.
 *    Reduced motion → the variable is pinned to its `still` value (a composed, finished frame).
 *  - SplitTitle: headline revealed line by line through a mask (words rise out of a clip).
 *  - useMagnetic(): primary CTAs lean toward the pointer (max ~6px), spring back on leave.
 *  - installSpotlight(): one delegated pointer listener that feeds `--mx/--my` to `.me-spot` cards.
 */
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useUI } from "@/store/ui";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* one shared scroll/resize listener drives every scrubbed element */
type Sub = () => void;
const subs = new Set<Sub>();
let raf = 0;
const flush = () => {
  raf = 0;
  subs.forEach((f) => f());
};
const kick = () => {
  if (!raf) raf = requestAnimationFrame(flush);
};
function subscribe(f: Sub) {
  if (!subs.size) {
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
  }
  subs.add(f);
  kick();
  return () => {
    subs.delete(f);
    if (!subs.size) {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
/** "top 85%" → [edge of element (0 top · .5 center · 1 bottom), viewport fraction] */
function parse(v: string): [number, number] {
  const [e, vp] = v.trim().split(/\s+/);
  const edge = e === "center" ? 0.5 : e === "bottom" ? 1 : 0;
  const view = vp === "top" ? 0 : vp === "center" ? 0.5 : vp === "bottom" ? 1 : parseFloat(vp) / 100;
  return [edge, Number.isFinite(view) ? view : 0];
}

export function useScrub<T extends HTMLElement>({ start = "top 85%", end = "bottom 60%", name = "--sp", still = 1 }: { start?: string; end?: string; name?: string; still?: number } = {}) {
  const ref = useRef<T>(null);
  const motion = useUI((s) => s.motion);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = -1;
    const set = (v: number) => {
      if (Math.abs(v - last) < 0.0005) return;
      last = v;
      el.style.setProperty(name, v.toFixed(4));
    };
    if (!motion) {
      set(still);
      return;
    }
    const [se, sv] = parse(start);
    const [ee, ev] = parse(end);
    return subscribe(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // scroll distance (px) from the start condition to the end condition, measured live
      const s0 = r.top + r.height * se - vh * sv; // >0 → not started
      const s1 = r.top + r.height * ee - vh * ev;
      const span = s0 - s1; // negative: the end marker is reached after the start marker
      const pr = Math.abs(span) > 1 ? s0 / span : s0 <= 0 ? 1 : 0;
      set(pr < 0 ? 0 : pr > 1 ? 1 : pr);
    });
  }, [motion, start, end, name, still]);
  return ref;
}

/** once-in-view flag as a data attribute (no React state → no re-render cascade) */
function useInAttr<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return void el.setAttribute("data-in", "");
    const io = new IntersectionObserver(
      ([e]) => {
        // also reveal anything already scrolled past (anchor jumps, restored scroll, late hydration)
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
          el.setAttribute("data-in", "");
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return ref;
}

/**
 * SplitTitle — words sit in clipping boxes and rise into place, one visual LINE after another
 * (lines are measured after layout, so it is truly line by line at every width).
 * Non-string children render unchanged.
 */
export function SplitTitle({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useInAttr<HTMLSpanElement>();
  useIsoLayout(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>(".sw");
    let line = -1;
    let lastTop = -1e9;
    let wi = 0;
    words.forEach((w) => {
      const top = w.offsetTop;
      if (top > lastTop + 4) {
        line++;
        lastTop = top;
        wi = 0;
      }
      w.style.setProperty("--li", String(line));
      w.style.setProperty("--wi", String(wi++));
    });
  }, [children]);
  if (typeof children !== "string") return <>{children}</>;
  const parts = children.split(/\s+/).filter(Boolean);
  return (
    <span ref={ref} className="split" style={{ "--sd": `${delay}ms` } as CSSProperties}>
      {parts.map((w, i) => (
        <span key={i}>
          <span className="sw">
            <span className="sw-i">{w}</span>
          </span>
          {i < parts.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

/** magnetic pull for primary CTAs; writes --mgx/--mgy (px) on the element */
export function useMagnetic<T extends HTMLElement>(strength = 0.22, max = 6) {
  const ref = useRef<T>(null);
  const motion = useUI((s) => s.motion);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--mgx", `${tx.toFixed(2)}px`);
      el.style.setProperty("--mgy", `${ty.toFixed(2)}px`);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      tx = Math.max(-max, Math.min(max, dx * strength));
      ty = Math.max(-max, Math.min(max, dy * strength * 1.2));
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [motion, strength, max]);
  return ref;
}

/** one delegated listener for every `.me-spot` card: the hover light follows the pointer */
let spotInstalled = false;
export function installSpotlight() {
  if (spotInstalled || typeof window === "undefined") return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  spotInstalled = true;
  let raf = 0;
  let pending: { el: HTMLElement; x: number; y: number } | null = null;
  const flush = () => {
    raf = 0;
    if (!pending) return;
    pending.el.style.setProperty("--mx", `${pending.x.toFixed(0)}px`);
    pending.el.style.setProperty("--my", `${pending.y.toFixed(0)}px`);
    pending = null;
  };
  document.addEventListener(
    "pointermove",
    (e) => {
      const t = e.target as Element | null;
      const el = t && typeof t.closest === "function" ? (t.closest(".me-spot") as HTMLElement | null) : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      pending = { el, x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) raf = requestAnimationFrame(flush);
    },
    { passive: true },
  );
}

/** <Scrub> — a div that carries its own scroll progress in `--sp` (for server components). */
export function Scrub({ children, className = "", start, end }: { children: ReactNode; className?: string; start?: string; end?: string }) {
  const ref = useScrub<HTMLDivElement>({ start, end });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
