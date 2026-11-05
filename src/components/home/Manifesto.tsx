"use client";
import { useRef, type CSSProperties } from "react";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { useUI } from "@/store/ui";
import { useJourney, clamp01, ease } from "./useJourney";

/**
 * S2 — three lines, pinned. Each line rises out of a mask and its Archivo width axis opens 62 → 125
 * as you scroll; on the last line the planet's crust cracks along the 40×40 grid and the descent starts.
 */
export default function Manifesto() {
  const motion = useUI((s) => s.motion);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cap = useRef<HTMLParagraphElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useJourney((j) => {
    const mobile = window.innerWidth < 768;
    const maxW = mobile ? 100 : 125;
    lineRefs.current.forEach((el, k) => {
      if (!el) return;
      if (!useUI.getState().motion) {
        el.style.transform = "none";
        el.style.fontVariationSettings = `"wdth" 100, "wght" 720`;
        return;
      }
      const p = ease((j - 1.0 - k * 0.2) / 0.26);
      el.style.transform = `translate3d(0, ${(1 - p) * 105}%, 0)`;
      el.style.fontVariationSettings = `"wdth" ${62 + (maxW - 62) * p}, "wght" ${480 + 260 * p}`;
      el.style.color = k === 2 ? "var(--signal)" : "";
    });
    if (cap.current) cap.current.style.opacity = String(clamp01((j - 1.55) / 0.15));
    if (wrap.current && useUI.getState().motion) wrap.current.style.opacity = String(1 - clamp01((j - 1.82) / 0.16));
  });

  return (
    <section data-home-section="2" aria-label={HOME.manifesto.join(" ")} className="relative" style={{ height: motion ? "280svh" : undefined }}>
      <div ref={wrap} className={`${motion ? "sticky top-0 h-[100svh]" : "py-32"} flex items-center overflow-hidden`}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 30% 50%, color-mix(in oklab, var(--void) 70%, transparent), transparent 75%)" }} />
        <div className="shell relative w-full">
          <ol className="flex flex-col gap-[0.06em]">
            {HOME.manifesto.map((l, k) => (
              <li key={k} className="overflow-hidden">
                <span
                  ref={(el) => {
                    lineRefs.current[k] = el;
                  }}
                  className="display block whitespace-normal text-[2.1rem] leading-[0.98] will-change-transform md:whitespace-nowrap md:[font-size:var(--fs)]"
                  style={
                    {
                      transform: motion ? "translate3d(0,105%,0)" : undefined,
                      fontVariationSettings: '"wdth" 62, "wght" 480',
                      // size each line so it still fits at full width (wdth 125)
                      "--fs": `min(8.6vw, ${(88 / (l.length * 0.8)).toFixed(2)}vw, 10rem)`,
                    } as CSSProperties
                  }
                >
                  {l}
                </span>
              </li>
            ))}
          </ol>
          <p ref={cap} className="mono mt-10 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--signal)]" style={{ opacity: motion ? 0 : 1 }}>
            <span className="inline-block h-px w-10 bg-[var(--signal)]" aria-hidden />
            {FACTS.grid.w} × {FACTS.grid.h} · descent
          </p>
        </div>
      </div>
    </section>
  );
}
