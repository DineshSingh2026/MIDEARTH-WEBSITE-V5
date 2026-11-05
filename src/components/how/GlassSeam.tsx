"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useUI } from "@/store/ui";
import s from "./how.module.css";

gsap.registerPlugin(ScrollTrigger);

const N = 16;

/**
 * The centre seam: a vertical pane of glass between Field and Stands.
 * Sliced into N strips so it can bow with scroll velocity; each strip carries its own
 * backdrop refraction, chromatic edge, moving specular and caustic shimmer (offset so they read as one pane).
 */
export function GlassSeam() {
  const track = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const motion = useUI((st) => st.motion);

  useEffect(() => {
    const el = pane.current;
    const tr = track.current;
    if (!el || !tr) return;
    const slices = Array.from(el.querySelectorAll<HTMLElement>("[data-slice]"));
    if (!motion) {
      slices.forEach((sl) => (sl.style.transform = ""));
      el.style.setProperty("--spec", "38vh");
      el.style.setProperty("--caus", "0px");
      el.style.setProperty("--ca", "1px");
      return;
    }
    let target = 0;
    let cur = 0;
    let t = 0;
    const st = ScrollTrigger.create({
      trigger: tr,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        target = self.getVelocity();
      },
    });
    const tick = (_time: number, dt: number) => {
      const d = Math.min(dt, 50) / 1000;
      t += d;
      target *= Math.pow(0.02, d); // decay when scroll stops
      cur += (target - cur) * Math.min(1, d * 7);
      const H = el.clientHeight || window.innerHeight;
      const A = gsap.utils.clamp(-44, 44, cur * 0.014);
      const h = H / N;
      for (let i = 0; i < N; i++) {
        const y = (i + 0.5) * h;
        const x = A * Math.sin((Math.PI * y) / H);
        const slope = ((A * Math.PI) / H) * Math.cos((Math.PI * y) / H);
        slices[i].style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${((Math.atan(slope) * 180) / Math.PI).toFixed(3)}deg)`;
      }
      const sy = window.scrollY;
      const period = H * 1.5;
      const spec = (((t * 70 + sy * 0.45) % period) + period) % period - H * 0.25;
      el.style.setProperty("--spec", `${spec.toFixed(1)}px`);
      el.style.setProperty("--caus", `${(-(t * 22) - sy * 0.25).toFixed(1)}px`);
      el.style.setProperty("--ca", `${(1 + Math.abs(A) * 0.12).toFixed(2)}px`);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      st.kill();
    };
  }, [motion]);

  return (
    <div ref={track} className={`${s.seamTrack} hidden md:block`} aria-hidden>
      <div ref={pane} className={s.seamSticky} style={{ "--n": N } as CSSProperties}>
        {Array.from({ length: N }, (_, i) => (
          <div key={i} data-slice className={s.slice} style={{ "--i": i } as CSSProperties}>
            <div className={s.caustic} />
            <div className={s.spec} />
            <div className={s.core} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mobile: the same glass, laid horizontally between the agent and owner halves of a row. */
export function GlassRule() {
  return (
    <div className={`${s.rule} md:hidden`} aria-hidden>
      <div className={s.ruleSpec} />
    </div>
  );
}
