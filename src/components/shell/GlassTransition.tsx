"use client";
import { useEffect, useRef } from "react";
import { useUI, type Mode } from "@/store/ui";
import type { GlassSweep } from "@/three/glass/GlassSweep";
import { easeInOut, smooth } from "@/three/glass/geometry";
import { chime, whoosh } from "@/components/intro/sound";

/**
 * FIELD ⇄ STANDS glass pane. When `glassTarget` is set, a refractive pane sweeps
 * diagonally across the viewport (direction encodes the switch: → Stands, ← Field).
 * Behind the pane the world takes the new mode's light; ahead of it the old world
 * dims into its own ground. commitMode(target) fires at the midpoint, when both sides
 * are pure ground colour, so the DOM flip is invisible.
 */
const DUR = 760;
const VOID: Record<Mode, [number, number, number]> = { field: [0, 2, 5], stands: [251, 253, 252] };
const rgba = (m: Mode, a: number) => `rgba(${VOID[m].join(",")},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const tone = (m: Mode) => (m === "stands" ? 1 : 0);

export default function GlassTransition() {
  const target = useUI((s) => s.glassTarget);
  const hostRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<GlassSweep | null>(null);
  const failed = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // commitMode() nulls the target mid-flight; the running sweep keeps going (no cleanup here).
    if (!target) return;
    const host = hostRef.current;
    const veil = veilRef.current;
    if (!host || !veil) return;
    stopRef.current?.();
    const { mode: from, motion, sound, commitMode } = useUI.getState();
    const to = target;
    let raf = 0;
    let committed = false;
    let cancelled = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      commitMode(to);
    };
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      veil.style.background = "none";
      veil.style.opacity = "1";
      sweepRef.current?.hide();
      host.style.visibility = "hidden";
      commit();
      if (stopRef.current === stop) stopRef.current = null;
    };
    stopRef.current = stop;
    host.style.visibility = "visible";

    // reduced motion / no WebGL → 250ms crossfade
    const crossfade = () => {
      const t0 = performance.now();
      veil.style.background = rgba(to, 1);
      veil.style.opacity = "0";
      const loop = (now: number) => {
        if (cancelled) return;
        const p = (now - t0) / 250;
        veil.style.opacity = String(Math.max(0, p < 0.5 ? p * 2 : 2 - p * 2));
        if (p >= 0.5) commit();
        if (p < 1) raf = requestAnimationFrame(loop);
        else stop();
      };
      raf = requestAnimationFrame(loop);
    };

    if (!motion || failed.current) {
      crossfade();
      return;
    }

    const run = (sweep: GlassSweep) => {
      sweep.setReverse(to === "field");
      if (sound) {
        whoosh(DUR / 1000);
        window.setTimeout(() => chime(to === "stands" ? 1320 : 990, 0.06), DUR * 0.45);
      }
      const t0 = performance.now();
      const loop = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / DUR);
        const pre = p < 0.5;
        if (!pre) commit();
        const sw = sweep.sweep;
        // eased edge crosses mid-screen exactly at p = .5
        const s = sweep.frame(easeInOut(p), now / 1000, tone(to), tone(from));
        // veil = gradient along the sweep axis: behind = new light, ahead = old ground
        const ang = (Math.atan2(sw.dir.y, sw.dir.x) * 180) / Math.PI + 90;
        const x = s - sw.min;
        const span = sw.max - sw.min;
        let g: string;
        if (pre) {
          const k = smooth(0, 0.5, p);
          const a = 0.8 + 0.2 * k;
          const b = 0.2 + 0.8 * k;
          const m = k * k * k;
          const F = span * (0.25 + 0.5 * k);
          g = `linear-gradient(${ang}deg, ${rgba(to, a)} 0px, ${rgba(to, a)} ${x}px, ${rgba(from, b)} ${x}px, ${rgba(from, b * m)} ${x + F}px, ${rgba(from, b * m)} ${Math.max(span, x + F)}px)`;
        } else {
          const j = smooth(0.5, 0.94, p);
          const a = Math.pow(1 - j, 1.5);
          const F = span * 0.35;
          g = `linear-gradient(${ang}deg, ${rgba(to, a * 0.15)} 0px, ${rgba(to, a * 0.15)} ${Math.max(0, x - F)}px, ${rgba(to, a)} ${x}px, ${rgba(from, 1)} ${x}px, ${rgba(from, 1)} ${Math.max(span, x)}px)`;
        }
        veil.style.background = g;
        if (p < 1) raf = requestAnimationFrame(loop);
        else stop();
      };
      raf = requestAnimationFrame(loop);
    };

    if (sweepRef.current) run(sweepRef.current);
    else {
      void import("@/three/glass/GlassSweep")
        .then(({ GlassSweep: G }) => {
          if (cancelled) return;
          try {
            sweepRef.current = new G(host);
            run(sweepRef.current);
          } catch {
            failed.current = true;
            crossfade();
          }
        })
        .catch(() => {
          failed.current = true;
          if (!cancelled) crossfade();
        });
    }
  }, [target]);

  useEffect(() => {
    const onResize = () => sweepRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      stopRef.current?.();
      sweepRef.current?.dispose();
      sweepRef.current = null;
    };
  }, []);

  return (
    <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 z-[140]" style={{ visibility: "hidden" }}>
      <div ref={veilRef} className="absolute inset-0" />
    </div>
  );
}
