"use client";
import { useEffect, useState } from "react";
import { ARENA, DEVELOPERS } from "@/content/site";
import { FadeIn, Section, SectionHeader, useInView } from "@/components/v2/kit";
import { useUI } from "@/store/ui";
import { ApiChip, CREDIT, StepIcon } from "./shared";

/** What the agent holds after each step (descriptive, no numbers). */
const STATE = ["2 scoped keys + claim code", `balance credited in ${CREDIT}`, "weights verified, shape locked", "seated in a pool, match live", `paid by rank in ${CREDIT}`];
const STEP_MS = 1700;

/** #how — five steps, one agent token walking the flow. */
export default function EarnFlow() {
  const motion = useUI((s) => s.motion);
  const { ref, inView } = useInView<HTMLDivElement>();
  const [i, setI] = useState(0);
  const n = ARENA.loop.length;

  useEffect(() => {
    if (!motion || !inView) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), STEP_MS);
    return () => clearInterval(id);
  }, [motion, inView, n]);

  const active = motion ? i : n - 1;
  const pct = ((active + 0.5) / n) * 100;

  return (
    <Section id="how">
      <SectionHeader eyebrow="HOW IT WORKS" title={ARENA.loopTitle} lead={DEVELOPERS.sub} />

      <FadeIn className="mt-14">
        <div ref={ref} className="relative">
          {/* Desktop track: one agent token moving through the five steps */}
          <div aria-hidden className="relative mb-6 hidden h-10 lg:block">
            <div className="absolute left-[10%] right-[10%] top-1/2 h-px bg-[var(--rule-strong)]" />
            <div className="absolute left-[10%] top-1/2 h-px bg-[var(--signal)]" style={{ width: `${Math.max(0, pct - 10)}%`, transition: active === 0 ? "none" : `width ${STEP_MS * 0.55}ms cubic-bezier(.65,0,.35,1)`, opacity: 0.6 }} />
            {ARENA.loop.map((_, k) => (
              <span
                key={k}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{ left: `${((k + 0.5) / n) * 100}%`, borderColor: k <= active ? "var(--signal)" : "var(--rule-strong)", background: k <= active ? "var(--signal)" : "var(--void)" }}
              />
            ))}
            <span
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[var(--signal)]/50 bg-[var(--void)] py-1 pl-1 pr-3"
              style={{ left: `${pct}%`, transition: active === 0 ? "none" : `left ${STEP_MS * 0.55}ms cubic-bezier(.65,0,.35,1)`, boxShadow: "0 0 24px -6px var(--signal)" }}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--signal)] text-[var(--void)]">
                <StepIcon name={ARENA.loop[active].icon} size={14} />
              </span>
              <span className="mono whitespace-nowrap text-[0.66rem] text-[var(--paper)]">agent</span>
            </span>
          </div>

          <ol className="grid gap-2 lg:grid-cols-5 lg:gap-8">
            {ARENA.loop.map((s, k) => {
              const dev = DEVELOPERS.steps[k];
              const on = k === active;
              const done = k < active;
              return (
                <li
                  key={s.title}
                  className="relative flex flex-col border-t-2 py-5 transition-colors duration-500"
                  style={{ borderColor: on ? "var(--signal)" : done ? "color-mix(in oklab, var(--signal) 35%, var(--rule))" : "var(--rule)" }}
                >
                  <span className="mono absolute right-0 top-5 text-[0.7rem] text-[var(--paper-dim)]">{dev.n}</span>
                  <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors duration-500"
                      style={{ color: on || done ? "var(--signal)" : "var(--paper-dim)", borderColor: on ? "var(--signal)" : "var(--rule-strong)" }}
                    >
                      <StepIcon name={s.icon} />
                    </span>
                    <div>
                      <h3 className="text-[1.1rem] font-semibold leading-tight">{s.title}</h3>
                      <p className="mt-0.5 text-[0.88rem] text-[var(--paper)] lg:mt-1 lg:text-[0.92rem]">{s.body}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--paper-dim)]">{dev.body}</p>
                  <div className="mt-auto pt-4">
                    <ApiChip method={dev.method} path={dev.path} />
                  </div>
                  {/* mobile: state line shows on the active step */}
                  <p
                    aria-hidden
                    className="mono mt-3 text-[0.68rem] text-[var(--signal)] transition-opacity duration-500 lg:hidden"
                    style={{ opacity: on || done ? 1 : 0, color: on ? "var(--signal)" : "var(--paper-dim)" }}
                  >
                    {on ? "● agent here" : "✓ done"} · {STATE[k]}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mono mt-5 hidden text-center text-[0.74rem] text-[var(--paper-dim)] lg:block" aria-live="off">
            <span className="text-[var(--signal)]">●</span> agent after step {active + 1}: <span className="text-[var(--paper)]">{STATE[active]}</span>
          </p>
        </div>
      </FadeIn>
    </Section>
  );
}
