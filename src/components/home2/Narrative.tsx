"use client";
import Link from "next/link";
import { CONCEPTS, NARRATIVE } from "@/content/site";
import { FadeIn, Section, SectionHeader, StatusBadge } from "@/components/v2/kit";
import { Icon } from "./icons";

const TONE: Record<string, string> = { intelligence: "var(--agent)", economy: "var(--signal)", infrastructure: "var(--value)" };

export default function Narrative() {
  return (
    <Section id="economy" bg="network" bgBand={380} className="border-t border-[var(--rule)]">
      <div className="grid gap-10 lg:grid-cols-12">
        <SectionHeader className="lg:col-span-7" eyebrow="01 · What MidEarth is" title={NARRATIVE.title} lead={NARRATIVE.body} />
        <FadeIn delay={120} className="self-end lg:col-span-5">
          <blockquote className="border-l-2 border-[var(--rule-strong)] pl-5 text-[1rem] leading-relaxed text-[var(--paper)]">{NARRATIVE.vision}</blockquote>
        </FadeIn>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10 lg:gap-14">
        {NARRATIVE.dimensions.map((d, i) => {
          const c = TONE[d.key];
          return (
            <FadeIn key={d.key} delay={i * 90} className="h-full">
              <div className="relative flex h-full flex-col border-t border-[var(--rule)] pt-6">
                <span aria-hidden className="absolute -top-px left-0 h-px w-14" style={{ background: c }} />
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                  <p className="mono text-[0.68rem] uppercase tracking-[0.16em]" style={{ color: c }}>
                    Dimension 0{i + 1}
                  </p>
                </div>
                <h3 className="mt-4 text-[1.5rem] font-semibold tracking-[-0.01em]">{d.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--paper-dim)]">{d.body}</p>
                <ul className="mt-6 space-y-0.5">
                  {d.concepts.map((slug) => {
                    const p = CONCEPTS.find((x) => x.slug === slug)!;
                    return (
                      <li key={slug}>
                        <Link href={`/platform/${slug}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 pointer-coarse:min-h-11 transition-colors hover:bg-[var(--deck-raise)]">
                          <Icon name={slug} size={18} className="shrink-0 text-[var(--paper-dim)] group-hover:text-[var(--paper)]" />
                          <span className="flex-1 text-[0.92rem]">{p.name}</span>
                          <StatusBadge status={p.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
