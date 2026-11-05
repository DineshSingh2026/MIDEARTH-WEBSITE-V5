"use client";
import type { ReactNode } from "react";
import { Btn, Card, Reveal, SectionIndex } from "@/components/ui/primitives";
import { HOW } from "@/content/copy/howItWorks";
import { GlassRule, GlassSeam } from "./GlassSeam";
import { HowRow } from "./Row";
import { AsymmetryAgent, AsymmetryOwner, useAsymmetry } from "./Asymmetry";

/** Split background: Field left, Stands right (desktop). On mobile the block is Field only. */
function SplitBg() {
  return (
    <div aria-hidden className="absolute inset-0 grid md:grid-cols-2">
      <div data-mode="field" className="bg-[var(--void)]" />
      <div data-mode="stands" className="hidden bg-[var(--void)] md:block" />
    </div>
  );
}

function Half({ side, children, className = "" }: { side: "field" | "stands"; children: ReactNode; className?: string }) {
  const inner =
    side === "field"
      ? "md:ml-auto md:mr-0 md:pl-10 md:pr-[clamp(56px,6vw,110px)]"
      : "md:ml-0 md:mr-auto md:pl-[clamp(56px,6vw,110px)] md:pr-10";
  return (
    <div data-mode={side} className={`relative min-w-0 bg-[var(--void)] text-[var(--paper)] ${className}`}>
      {side === "stands" && <GlassRule />}
      <div className={`mx-auto h-full max-w-[640px] px-4 sm:px-6 md:px-0 ${inner}`}>{children}</div>
    </div>
  );
}

export default function HowItWorks() {
  const asym = useAsymmetry();
  const total = HOW.rows.length;

  return (
    <div className="relative overflow-x-clip">
      <GlassSeam />

      {/* ───────── Hero: the headline crosses the glass ───────── */}
      <header className="relative">
        <SplitBg />
        <div className="shell relative pb-20 pt-36 md:pb-28 md:pt-48">
          <div className="grid md:grid-cols-2">
            <div data-mode="field">
              <SectionIndex>{HOW.eyebrow}</SectionIndex>
            </div>
            <div data-mode="stands" className="hidden md:flex md:justify-end">
              <p className="eyebrow">Daylight · {HOW.heads.ownerHint}</p>
            </div>
          </div>
          <Reveal as="h1" width className="display display-hero mt-10 max-w-[12ch] text-white mix-blend-difference">
            {HOW.h1}
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div data-mode="field" className="md:pr-[clamp(56px,6vw,110px)]">
              <Reveal as="p" delay={140} className="max-w-[48ch] text-[1.08rem] text-[var(--paper-dim)] md:text-[1.18rem]">
                {HOW.sub}
              </Reveal>
            </div>
            <div data-mode="stands" className="hidden items-end md:flex md:pl-[clamp(56px,6vw,110px)]">
              <p className="mono text-[0.72rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
                {String(total).padStart(2, "0")} rows · scroll to step through
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── The six rows, with sticky column heads ───────── */}
      <section aria-label="The six steps, agent and owner side by side" className="relative">
        <div className="sticky top-16 z-20 hidden grid-cols-2 md:top-[72px] md:grid">
          {(
            [
              ["field", HOW.heads.agent, HOW.heads.agentHint, "md:pr-[clamp(56px,6vw,110px)] md:pl-10 text-right justify-end"],
              ["stands", HOW.heads.owner, HOW.heads.ownerHint, "md:pl-[clamp(56px,6vw,110px)] md:pr-10"],
            ] as const
          ).map(([mode, head, hint, cls]) => (
            <div
              key={mode}
              data-mode={mode}
              className="border-b border-[var(--rule-strong)] bg-[color-mix(in_oklab,var(--void)_82%,transparent)] text-[var(--paper)] backdrop-blur-md"
            >
              <div className={`flex items-baseline gap-4 py-3.5 ${cls}`}>
                {mode === "stands" ? (
                  <>
                    <p className="mono text-[0.74rem] uppercase tracking-[0.16em]">{head}</p>
                    <p className="mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{hint}</p>
                  </>
                ) : (
                  <>
                    <p className="mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{hint}</p>
                    <p className="mono text-[0.74rem] uppercase tracking-[0.16em]">{head}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {HOW.rows.map((row, i) => (
          <HowRow key={i} index={i} row={row} total={total} />
        ))}
      </section>

      {/* ───────── Closer: the asymmetry ───────── */}
      <section aria-labelledby="how-closer" className="relative">
        <header className="relative">
          <SplitBg />
          <div className="shell relative pb-10 pt-28 md:pb-16 md:pt-40">
            <div data-mode="field">
              <SectionIndex>Write actions · {HOW.closer.left} : {HOW.closer.right}</SectionIndex>
            </div>
            <Reveal as="h2" width className="display display-xl mt-8 max-w-[16ch] text-white mix-blend-difference">
              <span id="how-closer">{HOW.closer.title}</span>
            </Reveal>
          </div>
        </header>
        <div ref={asym.ref} className="grid md:grid-cols-2">
          <Half side="field" className="pb-16 md:pb-28">
            <div className="pt-6 md:pt-8">
              <AsymmetryAgent lit={asym.left} />
            </div>
          </Half>
          <Half side="stands" className="pb-16 md:pb-28">
            <div className="pt-14 md:pt-8">
              <AsymmetryOwner lit={asym.right} />
            </div>
          </Half>
        </div>
        <div className="grid md:grid-cols-2">
          <Half side="field" className="pb-16 md:pb-24">
            <Reveal as="p" className="max-w-[40ch] text-[1.08rem] text-[var(--paper-dim)] md:text-[1.18rem]">
              {HOW.closer.body}
            </Reveal>
          </Half>
          <Half side="stands" className="hidden md:block" >
            <span />
          </Half>
        </div>
      </section>

      {/* ───────── Two paths ───────── */}
      <section aria-label="Choose a path" className="grid md:grid-cols-2">
        {HOW.paths.map((p, i) => {
          const side = i === 0 ? "field" : "stands";
          return (
            <Half key={p.href} side={side} className="pb-24 pt-14 md:pb-36 md:pt-16">
              <Card className="flex h-full flex-col p-6 md:p-8">
                <p className="mono text-[0.72rem] tracking-[0.18em] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")} / 02</p>
                <Reveal as="h2" width className="display display-l mt-5">
                  {p.title}
                </Reveal>
                <p className="mt-5 max-w-[42ch] flex-1 text-[var(--paper-dim)]">{p.body}</p>
                <div className="mt-8">
                  <Btn href={p.href} tone={i === 0 ? "signal" : "paper"} variant={i === 0 ? "solid" : "line"}>
                    {p.title}
                  </Btn>
                </div>
              </Card>
            </Half>
          );
        })}
      </section>
    </div>
  );
}
