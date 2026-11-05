"use client";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Odometer } from "@/components/ui/primitives";
import { useUI } from "@/store/ui";
import { HOW } from "@/content/copy/howItWorks";
import { WRITES_AGENT, WRITES_OWNER } from "./script";

/** Counter visual: five write actions light on the Field side, then one (that only stops things) on the Stands side. */
export function AsymmetryAgent({ lit }: { lit: number }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <p className="eyebrow">Agent · write actions</p>
        <Odometer value={lit} pad={2} className="display text-[clamp(3.4rem,7vw,6.5rem)] text-[var(--signal)]" />
      </div>
      <ol className="mt-6 grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={`${HOW.closer.left} write actions`}>
        {WRITES_AGENT.map((w, i) => {
          const on = i < lit;
          return (
            <li key={w} className="flex flex-col gap-3">
              <span
                aria-hidden
                className="block h-24 border transition-[background-color,border-color] duration-700 sm:h-32"
                style={{
                  borderColor: on ? "var(--signal)" : "var(--rule-strong)",
                  background: on ? "color-mix(in oklab, var(--signal) 22%, transparent)" : "transparent",
                  transitionTimingFunction: "var(--ease-expo)",
                }}
              />
              <span className="mono break-all text-[0.6rem] uppercase leading-tight tracking-[0.08em] sm:text-[0.66rem]" style={{ color: on ? "var(--paper)" : "var(--paper-dim)" }}>
                {w}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function AsymmetryOwner({ lit }: { lit: number }) {
  const on = lit > 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <p className="eyebrow">Owner · write actions</p>
        <Odometer value={lit} pad={2} className="display text-[clamp(3.4rem,7vw,6.5rem)] text-[var(--frost)]" />
      </div>
      <ol className="mt-6 grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={`${HOW.closer.right} write action`}>
        {WRITES_OWNER.map((w) => (
          <li key={w} className="flex flex-col gap-3">
            <span
              aria-hidden
              className="grid h-24 place-items-center border transition-[background-color,border-color] duration-700 sm:h-32"
              style={{
                borderColor: on ? "var(--frost)" : "var(--rule-strong)",
                background: on ? "color-mix(in oklab, var(--frost) 14%, transparent)" : "transparent",
              }}
            >
              <span className="block h-3 w-3" style={{ background: on ? "var(--frost)" : "var(--rule-strong)" }} />
            </span>
            <span className="mono text-[0.6rem] uppercase leading-tight tracking-[0.08em] sm:text-[0.66rem]" style={{ color: on ? "var(--paper)" : "var(--paper-dim)" }}>
              {w}
            </span>
          </li>
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} aria-hidden className="flex flex-col gap-3">
            <span className="block h-24 border border-dashed border-[var(--rule)] sm:h-32" />
            <span className="mono text-[0.6rem] uppercase tracking-[0.08em] text-[var(--paper-dim)] opacity-60 sm:text-[0.66rem]">—</span>
          </li>
        ))}
      </ol>
      <p className="mono mt-5 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">stops things · never starts them</p>
    </div>
  );
}

/** Drives the lighting sequence once the closer scrolls into view. */
export function useAsymmetry() {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useUI((s) => s.motion);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  useEffect(() => {
    if (!motion) {
      setLeft(HOW.closer.left);
      setRight(HOW.closer.right);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 70%",
      once: true,
      onEnter: () => {
        for (let i = 1; i <= HOW.closer.left; i++) timers.push(setTimeout(() => setLeft(i), 260 * i));
        timers.push(setTimeout(() => setRight(HOW.closer.right), 260 * HOW.closer.left + 900));
      },
    });
    return () => {
      st.kill();
      timers.forEach(clearTimeout);
    };
  }, [motion]);
  return { ref, left, right };
}
