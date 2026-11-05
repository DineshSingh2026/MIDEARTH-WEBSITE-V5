"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { CallChip, SectionIndex } from "@/components/ui/primitives";
import { fmtClock, useArenaDerived } from "@/lib/arena/client";
import { frameState } from "@/three/registry";
import { useUI } from "@/store/ui";
import { useJourney, clamp01 } from "./useJourney";
import { STRATA_BEATS } from "./strataLabels";

const STEPS = HOME.loop.steps;

/**
 * S3 — the five strata. The camera hovers over one slab per call; this panel names the step,
 * and a beat sequence captions what the 3D vignette is doing at that exact moment.
 */
export default function StrataSection() {
  const motion = useUI((s) => s.motion);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLLIElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const d = useArenaDerived();

  // live pool → stratum 04 ring
  useEffect(() => {
    frameState.signals.poolFilled = d.featured?.filled_slots ?? 0;
    frameState.signals.poolMax = d.featured?.max_slots ?? FACTS.poolCapacity;
  }, [d.featured]);

  useJourney((j) => {
    if (!useUI.getState().motion) return;
    const s = (j - 2) * 5;
    const k = Math.max(0, Math.min(4, Math.floor(s)));
    setActive((a) => (a === k ? a : k));
    const p = s - k;
    if (rail.current) rail.current.style.transform = `scaleY(${clamp01((j - 2) * 1.0)})`;
    beats.current.forEach((el, i) => {
      if (!el) return;
      const b = STRATA_BEATS[k][i];
      const on = b ? p >= b.at : false;
      el.dataset.on = on ? "1" : "0";
    });
    if (panel.current) {
      const inOut = clamp01((j - 1.9) / 0.12) * (1 - clamp01((j - 2.97) / 0.06));
      panel.current.style.opacity = String(inOut);
    }
  });

  const step = STEPS[active];
  const pool = d.featured;

  if (!motion) {
    // reduced motion: all five steps as a static, readable list
    return (
      <section data-home-section="3" aria-labelledby="loop-title" className="relative py-32">
        <div className="shell">
          <SectionIndex>{HOME.loop.index}</SectionIndex>
          <h2 id="loop-title" className="display display-xl mt-6 max-w-[16ch]">
            {HOME.loop.title}
          </h2>
          <ol className="mt-16 grid gap-px border border-[var(--rule)] bg-[var(--rule)] md:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.n} className="flex flex-col gap-4 bg-[var(--void)] p-6">
                <span className="mono text-[var(--agent)]">{s.n}</span>
                <h3 className="display display-m">{s.title}</h3>
                <p className="text-[0.95rem] text-[var(--paper-dim)]">{s.body}</p>
                <ul className="mono mt-auto space-y-1 text-[0.68rem] uppercase tracking-[0.12em] text-[var(--paper-dim)]">
                  {STRATA_BEATS[i].map((b) => (
                    <li key={b.label}>{b.label}</li>
                  ))}
                </ul>
                <CallChip method={s.method} path={s.path} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section data-home-section="3" aria-labelledby="loop-title" className="relative" style={{ height: "620svh" }}>
      <div className="sticky top-0 flex h-[100svh] items-end overflow-hidden pb-8 md:items-center md:pb-0">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--void) 88%, transparent) 0%, color-mix(in oklab, var(--void) 55%, transparent) 38%, transparent 62%)" }} />
        <div ref={panel} className="shell relative grid w-full grid-cols-[28px_1fr] gap-5 md:grid-cols-[56px_minmax(0,560px)] md:gap-10" style={{ opacity: 0 }}>
          {/* progress rail 01 → 05 */}
          <div className="relative flex flex-col justify-between py-1" aria-hidden>
            <div className="absolute bottom-0 left-[3px] top-0 w-px bg-[var(--rule-strong)]" />
            <div ref={rail} className="absolute bottom-0 left-[3px] top-0 w-px origin-top bg-[var(--agent)]" style={{ transform: "scaleY(0)" }} />
            {STEPS.map((s, i) => (
              <span key={s.n} className="mono relative flex items-center gap-2 text-[0.64rem]" style={{ color: i <= active ? "var(--agent)" : "var(--paper-dim)" }}>
                <i className="inline-block h-[7px] w-[7px] border" style={{ borderColor: "currentColor", background: i === active ? "currentColor" : "var(--void)" }} />
                <span className="hidden md:inline">{s.n}</span>
              </span>
            ))}
          </div>

          <div>
            <SectionIndex>
              {HOME.loop.index} · {step.n} / 0{STEPS.length}
            </SectionIndex>
            <h2 id="loop-title" className="sr-only">
              {HOME.loop.title}
            </h2>
            <div key={active} className="strata-in">
              <p className="mono mt-8 text-[clamp(3.4rem,7vw,6.5rem)] leading-none text-[var(--agent)] opacity-90">{step.n}</p>
              <h3 className="display display-l mt-3">{step.title}</h3>
              <p className="mt-5 max-w-[50ch] text-[0.98rem] leading-[1.6] text-[var(--paper-dim)] md:text-[1.05rem]">{step.body}</p>
              <ol className="mono mt-7 space-y-2 text-[0.7rem] uppercase tracking-[0.14em]" aria-label="What the visual shows">
                {STRATA_BEATS[active].map((b, i) => (
                  <li
                    key={b.label}
                    ref={(el) => {
                      beats.current[i] = el;
                    }}
                    data-on="0"
                    className="beat flex items-center gap-3"
                    style={{ ["--tone" as string]: `var(--${b.tone ?? "paper"})` }}
                  >
                    <span className="inline-block h-px w-5 bg-current" aria-hidden />
                    {b.label}
                  </li>
                ))}
                {active === 3 && (
                  <li className="flex items-center gap-3 pt-1 text-[var(--signal)]">
                    <span className="inline-block h-px w-5 bg-current" aria-hidden />
                    {pool ? `${pool.filled_slots}/${pool.max_slots} seats · locks ${pool.seconds_remaining ? `in ${fmtClock(d.nextLockSec)}` : "when full"}` : HOME.liveStrip.empty.nextLock}
                  </li>
                )}
              </ol>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CallChip method={step.method} path={step.path} />
                {active === 4 && (
                  <Link href={HOME.loop.link.href} className="mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--paper-dim)] underline-offset-4 hover:text-[var(--paper)] hover:underline">
                    {HOME.loop.link.label} →
                  </Link>
                )}
              </div>
              {active === 0 && <p className="mt-6 max-w-[46ch] text-[0.85rem] text-[var(--value)]">{HOME.loop.bonus}</p>}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .strata-in { animation: strataIn 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes strataIn { from { opacity: 0; transform: translate3d(0, 18px, 0); } to { opacity: 1; transform: none; } }
        .beat { color: var(--paper-dim); opacity: 0.32; transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1), color 0.5s, transform 0.6s cubic-bezier(0.16,1,0.3,1); transform: translateX(-6px); }
        .beat[data-on="1"] { opacity: 1; color: var(--tone); transform: none; }
      `}</style>
    </section>
  );
}
