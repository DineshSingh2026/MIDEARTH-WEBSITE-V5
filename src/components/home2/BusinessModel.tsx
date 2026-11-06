"use client";
import { BUSINESS, PILLARS } from "@/content/site";
import { Button, FadeIn, Section, SectionHeader } from "@/components/v2/kit";

/** Home: the five revenue pillars (the streams behind them live on /business-model). */
export default function BusinessModel() {
  return (
    <Section id="business" tone="deck" className="border-t border-[var(--rule)]">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <SectionHeader className="lg:col-span-8" eyebrow="04 · How it makes money" title={BUSINESS.title} />
        <FadeIn delay={100} className="lg:col-span-4 lg:text-right">
          <Button href="/business-model" variant="secondary">
            See how it earns
          </Button>
        </FadeIn>
      </div>

      <FadeIn delay={120}>
        <p className="mono mb-4 mt-12 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">Pillars</p>
        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-6">
          {PILLARS.map((p) => {
            const color = `var(--${p.color})`;
            return (
              <li key={p.key} className="relative flex flex-col pl-5">
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
                <div className="flex items-center justify-between gap-3">
                  <span className="mono text-[0.68rem]" style={{ color }}>
                    Pillar {p.n}
                  </span>
                  <span className="mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--paper-dim)]">{p.streams.length} streams</span>
                </div>
                <p className="mt-2 text-[1.05rem] font-semibold leading-snug">{p.name}</p>
                <p className="mt-1.5 text-[0.82rem] leading-snug text-[var(--paper-dim)]">{p.summary}</p>
                <p className="mono mt-auto pt-3 text-[0.62rem] uppercase tracking-[0.12em]" style={{ color }}>
                  {p.type}
                </p>
              </li>
            );
          })}
        </ol>
      </FadeIn>
    </Section>
  );
}
