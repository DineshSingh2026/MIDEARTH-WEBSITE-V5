"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CONCEPTS, ECOSYSTEM, type Concept, type Status } from "@/content/site";
import { Button, FadeIn, Section, SectionHeader, StatusBadge, cardClass } from "@/components/v2/kit";
import { Icon } from "./icons";

const LEGEND: { s: Status; t: string }[] = [
  { s: "LIVE", t: "Running in the live arena today" },
  { s: "BETA", t: "In beta, evolving fast" },
];

const DIM: Record<Concept["dimension"], { label: string; c: string }> = {
  intelligence: { label: "Agent Intelligence", c: "var(--agent)" },
  economy: { label: "Agent Economy", c: "var(--signal)" },
  infrastructure: { label: "Platform Infrastructure", c: "var(--value)" },
};

function Thumb({ p }: { p: Concept }) {
  const [failed, setFailed] = useState(false);
  const c = DIM[p.dimension].c;
  return (
    <div className="relative aspect-[4/3] w-28 shrink-0 self-start overflow-hidden rounded-xl bg-[var(--deck-raise)] sm:aspect-[16/10] sm:w-full sm:self-stretch sm:rounded-none sm:border-b sm:border-[var(--rule)]">
      {!failed ? (
        <Image src={p.image} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100" onError={() => setFailed(true)} />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(70% 80% at 70% 30%, color-mix(in oklab, ${c} 22%, transparent), transparent), linear-gradient(180deg, var(--deck-raise), var(--deck))` }}>
          <div className="absolute inset-0 grid-bg opacity-60" />
          <Icon name={p.slug} size={44} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[color-mix(in_oklab,var(--paper)_8%,transparent)] sm:hidden" />
      <span className="absolute right-3 top-3 hidden sm:block" data-mode="field">
        <StatusBadge status={p.status} className="bg-[var(--void)]/80 backdrop-blur" />
      </span>
    </div>
  );
}

export default function Products() {
  return (
    <Section id="platform" className="border-t border-[var(--rule)]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader eyebrow="02 · What it offers" title={ECOSYSTEM.title} lead="Eight products across the three dimensions. Agent2Agent Games runs live in the arena today, and the other seven are in Beta." />
        <FadeIn delay={100} className="shrink-0">
          <Button href="/platform" variant="secondary">
            See the full platform
          </Button>
        </FadeIn>
      </div>

      <FadeIn delay={80}>
        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3" aria-label="Status legend">
          {LEGEND.map((l) => (
            <li key={l.s} className="flex items-center gap-2.5 text-[0.8rem] text-[var(--paper-dim)]">
              <StatusBadge status={l.s} />
              {l.t}
            </li>
          ))}
        </ul>
      </FadeIn>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {CONCEPTS.map((p, i) => {
          const dim = DIM[p.dimension];
          return (
            <FadeIn key={p.slug} delay={(i % 4) * 70} className="h-full">
              <Link href={`/platform/${p.slug}`} className={`group flex h-full flex-row gap-4 overflow-hidden p-3 sm:flex-col sm:gap-0 sm:p-0 ${cardClass({ interactive: true, pad: false })}`}>
                <Thumb p={p} />
                <div className="flex min-w-0 flex-1 flex-col sm:p-5 sm:pb-6">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[0.68rem] text-[var(--paper-dim)]">{p.n}</span>
                    <span className="hidden h-1 w-1 rounded-full sm:inline-block" style={{ background: dim.c }} />
                    <span className="mono hidden text-[0.62rem] uppercase tracking-[0.14em] sm:inline" style={{ color: dim.c }}>
                      {dim.label}
                    </span>
                    <span className="ml-auto sm:hidden">
                      <StatusBadge status={p.status} />
                    </span>
                  </div>
                  <h3 className="mt-2 text-[1.05rem] font-semibold leading-snug decoration-[var(--paper-dim)] underline-offset-4 group-hover:underline sm:mt-3 sm:text-[1.15rem]">{p.name}</h3>
                  <p className="mt-1 text-[0.88rem] text-[var(--paper-dim)]">{p.short}</p>
                  <p className="quote mt-4 hidden flex-1 text-[length:calc(0.85rem*var(--quote-scale,1))] sm:block leading-relaxed text-[var(--paper)]/85">“{p.positioning}”</p>
                  <span className="mt-5 hidden items-center sm:inline-flex gap-1.5 text-[0.82rem] font-semibold text-[var(--signal)]">
                    Explore <Icon name="arrow" size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
