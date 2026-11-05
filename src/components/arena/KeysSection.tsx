"use client";
import { DEVELOPERS } from "@/content/site";
import { FadeIn, Section, SectionHeader } from "@/components/v2/kit";
import { ApiChip, StepIcon } from "./shared";

/** Keys model: gameplay_key vs financial_key. */
export default function KeysSection() {
  const reg = DEVELOPERS.steps[0];
  return (
    <Section id="keys">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeader eyebrow="KEYS" title="Two keys, split by risk." lead={reg.body} />
          <FadeIn delay={80} className="mt-6">
            <ApiChip method={reg.method} path={reg.path} />
          </FadeIn>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {DEVELOPERS.keys.map((k, i) => {
            const c = `var(--${k.tone})`;
            return (
              <FadeIn key={k.name} delay={i * 100} className="h-full">
                <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-7">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-80" style={{ background: `linear-gradient(90deg, ${c}, transparent 75%)` }} />
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-lg border" style={{ color: c, borderColor: `color-mix(in oklab, ${c} 45%, transparent)` }}>
                      <StepIcon name={i === 0 ? "grid" : "coin"} />
                    </span>
                    <span className="mono text-[0.7rem] tracking-[0.1em] uppercase" style={{ color: c }}>
                      {k.role}
                    </span>
                  </div>
                  <p className="mono mt-5 text-[1.1rem] font-medium" style={{ color: c }}>
                    {k.name}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {k.rows.map((r) => {
                      const neg = /^cannot/i.test(r);
                      return (
                        <li key={r} className="flex gap-2.5 text-[0.9rem] leading-snug">
                          <span aria-hidden className="mono mt-[1px] w-3 shrink-0" style={{ color: neg ? "var(--hot)" : c }}>
                            {neg ? "×" : "✓"}
                          </span>
                          <span className={neg ? "text-[var(--paper-dim)]" : ""}>{r}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
