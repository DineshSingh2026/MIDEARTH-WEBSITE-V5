"use client";
/**
 * How Labs works — an agent card travels engine → create → run → learn.
 * Calm 2.6s step loop, only while in view. Reduced motion → static final frame.
 */
import { useEffect, useState } from "react";
import { LABS } from "@/content/site";
import { useInView } from "@/components/v2/kit";
import { Mascot } from "@/components/brand/Mascot";
import { useUI } from "@/store/ui";
import { Icon } from "./icons";

const STATION_ICONS = ["cpu", "agent", "spark", "chart"];
const STATE = ["engine selected", "role · skills · memory", "running routines", "lesson saved"];

export default function HowFlow() {
  const motion = useUI((s) => s.motion);
  const { ref, inView } = useInView<HTMLDivElement>();
  const [tick, setTick] = useState(0);
  const n = LABS.how.length;

  useEffect(() => {
    if (!motion || !inView) return;
    const t = setInterval(() => setTick((v) => v + 1), 2600);
    return () => clearInterval(t);
  }, [motion, inView]);

  const idx = motion ? tick % n : n - 1;
  const pct = (i: number) => ((i + 0.5) / n) * 100;

  return (
    <div ref={ref} className="mt-12">
      {/* Track */}
      <div className="rounded-2xl border border-[var(--rule)] bg-[var(--deck)] px-3 pb-6 pt-5 md:px-8 md:pb-8 md:pt-6">
        <div className="relative h-[86px] md:h-[92px]">
          <div
            className="absolute top-0 -translate-x-1/2 transition-[left] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]"
            style={{ left: `clamp(52px, ${pct(idx)}%, calc(100% - 52px))` }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-[color:color-mix(in_oklab,var(--signal)_40%,transparent)] bg-[var(--deck-raise)] px-2.5 py-2 shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--signal)_45%,transparent)] md:px-3">
              <Mascot kind="exec" size={22} />
              <div className="leading-tight">
                <p className="text-[0.76rem] font-semibold md:text-[0.8rem]">Your agent</p>
                <p className="mono hidden text-[0.64rem] text-[var(--signal)] sm:block">{STATE[idx]}</p>
              </div>
            </div>
            <div className="mx-auto h-4 w-px bg-[color:color-mix(in_oklab,var(--signal)_50%,transparent)]" />
          </div>
        </div>

        <div className="relative">
          {/* rail */}
          <div className="absolute top-5 h-px bg-[var(--rule-strong)]" style={{ left: `${pct(0)}%`, right: `${100 - pct(n - 1)}%` }} />
          <div
            className="absolute top-5 h-px bg-[var(--signal)] transition-[width] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]"
            style={{ left: `${pct(0)}%`, width: `${pct(idx) - pct(0)}%` }}
          />
          <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {LABS.how.map((s, i) => {
              const on = i <= idx;
              const cur = i === idx;
              return (
                <li key={s.title} className="flex flex-col items-center text-center">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--void)] transition-colors duration-500"
                    style={{
                      color: on ? "var(--signal)" : "var(--paper-dim)",
                      borderColor: cur ? "var(--signal)" : on ? "color-mix(in oklab, var(--signal) 45%, transparent)" : "var(--rule-strong)",
                    }}
                  >
                    <Icon name={STATION_ICONS[i] ?? "spark"} size={18} />
                  </span>
                  <span className="mono mt-3 text-[0.64rem] tracking-[0.1em] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`mt-1 px-1 text-[0.78rem] font-semibold leading-tight md:text-[0.95rem] ${cur ? "text-[var(--paper)]" : "text-[var(--paper-dim)]"}`}>{s.title}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Step detail */}
      <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {LABS.how.map((s, i) => (
          <li
            key={s.title}
            className="border-t-2 pt-5 transition-colors duration-500"
            style={{ borderColor: i === idx && motion ? "var(--signal)" : "var(--rule)" }}
          >
            <p className="mono text-[0.7rem] text-[var(--signal)]">Step {String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-2 text-[1.05rem] font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
