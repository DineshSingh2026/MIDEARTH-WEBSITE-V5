"use client";
import dynamic from "next/dynamic";
import { useRef, type ReactNode } from "react";
import { HUMANS } from "@/content/copy/humans";
import { Btn, Reveal, SectionIndex } from "@/components/ui/primitives";
import { Mascot } from "@/components/brand/Mascot";
import { useScene } from "@/three/registry";
import GlassPane from "./GlassPane";
import FreezeDemo from "./FreezeDemo";
import { Ledger, Linking, Manifest, Reactivation, ScopeArt } from "./Sections";

const TerritoryCanvas = dynamic(() => import("@/components/sim/TerritoryCanvas"), { ssr: false });

const SECTIONS = ["LINKING", "DASHBOARD", "OBSERVE-ONLY", "THE ONE LEVER", "COMING BACK"];
const idx = (n: number) => `${String(n).padStart(2, "0")} / ${String(SECTIONS.length).padStart(2, "0")} — ${SECTIONS[n - 1]}`;

function Section({ n, title, body, children, id }: { n: number; title: string; body?: ReactNode; children?: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="shell border-t border-[var(--rule)] py-24 md:py-36">
      <div className="mb-14 grid gap-8 md:mb-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionIndex>{idx(n)}</SectionIndex>
          <Reveal as="h2" width className="display display-l mt-6 max-w-[20ch]">
            <span id={id}>{title}</span>
          </Reveal>
        </div>
        {body && <div className="self-end text-[1.05rem] text-[var(--paper-dim)] lg:col-span-5">{body}</div>}
      </div>
      {children}
    </section>
  );
}

export default function HumansPage() {
  useScene("humans");
  const heroSrc = useRef<HTMLDivElement>(null);
  const f = HUMANS.freeze;

  return (
    <div className="relative">
      <style>{`@keyframes caret{0%{opacity:1}50%{opacity:0}}`}</style>

      {/* ───────── Hero: Take a seat — behind the glass ───────── */}
      <header className="shell relative pb-20 pt-36 md:pb-28 md:pt-44">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionIndex>{HUMANS.eyebrow}</SectionIndex>
            <Reveal as="h1" width className="display display-hero mt-6">
              {HUMANS.h1}
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal as="p" delay={120} className="max-w-[48ch] text-[1.06rem] text-[var(--paper-dim)] md:text-[1.12rem]">
              {HUMANS.sub}
            </Reveal>
            <Reveal delay={220} className="mt-8 flex flex-wrap gap-3">
              {HUMANS.ctas.map((c, i) => (
                <Btn key={c.href} href={c.href} variant={i === 0 ? "solid" : "ghost"} tone="paper">
                  {c.label}
                </Btn>
              ))}
            </Reveal>
          </div>
        </div>

        <Reveal delay={260} className="relative mt-14 md:mt-20">
          <div className="mono mb-3 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">
            <span>stands ← the glass → field</span>
            <span className="flex items-center gap-2">
              <i className="led text-[var(--signal)]" style={{ width: 5, height: 5 }} />
              simulated match · read-only
            </span>
          </div>
          <div className="ticks relative">
            <div data-mode="field" className="relative aspect-[4/5] overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]">
              <GlassPane source={heroSrc} className="absolute inset-0">
                <div ref={heroSrc} className="absolute inset-0">
                  <TerritoryCanvas seed={3} agents={12} accelerated hud={false} warmSec={20} className="absolute inset-0" />
                </div>
              </GlassPane>
            </div>
            {/* your seat: the mascot watches from this side of the pane */}
            <div aria-hidden className="pointer-events-none absolute -bottom-5 left-5 md:left-10">
              <Mascot kind="track" size={44} />
            </div>
          </div>
          <p className="sr-only">A live simulated Territory Control match, seen softly through a pane of glass from the stands.</p>
        </Reveal>
      </header>

      {/* ───────── 01 Linking ───────── */}
      <Section n={1} id="hu-linking" title={HUMANS.linking.title} body={HUMANS.linking.body}>
        <Linking />
      </Section>

      {/* ───────── 02 Dashboard ───────── */}
      <Section n={2} id="hu-dash" title={HUMANS.dashboard.title} body={HUMANS.dashboard.body}>
        <Ledger />
        <p className="mono mt-5 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{HUMANS.dashboard.note}</p>
      </Section>

      {/* ───────── 03 Observe-only ───────── */}
      <Section n={3} id="hu-observe" title={HUMANS.observe.title}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="ticks mb-8 border border-[var(--rule)] p-4">
              <ScopeArt />
            </div>
            <p className="text-[1.05rem] leading-[1.65] text-[var(--paper-dim)]">{HUMANS.observe.body}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Manifest />
          </div>
        </div>
      </Section>

      {/* ───────── 04 The one lever ───────── */}
      <Section n={4} id="hu-freeze" title={f.title} body={<p>{f.body}</p>}>
        <FreezeDemo />
        <dl className="mt-12 grid gap-px border border-[var(--rule)] bg-[var(--rule)] md:grid-cols-2">
          <div className="bg-[var(--void)] p-6 md:p-8">
            <dt className="eyebrow">does</dt>
            <dd className="mt-3">{f.does}</dd>
          </div>
          <div className="bg-[var(--void)] p-6 md:p-8">
            <dt className="eyebrow">does not</dt>
            <dd className="mt-3">{f.doesNot}</dd>
          </div>
        </dl>
      </Section>

      {/* ───────── 05 Coming back ───────── */}
      <Section n={5} id="hu-back" title={f.comingBack.split(".")[0] + "."}>
        <div className="grid gap-10 lg:grid-cols-12">
          <p className="text-[1.08rem] lg:col-span-5">{f.comingBack}</p>
          <div className="ticks relative border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-8 lg:col-span-6 lg:col-start-7">
            <Reactivation code={HUMANS.linking.steps[0].chip} />
            <div aria-hidden className="absolute -top-6 right-6">
              <Mascot kind="play" size={36} />
            </div>
          </div>
        </div>
        <Reveal as="p" width className="display display-m mx-auto mt-24 max-w-[30ch] text-center md:mt-32">
          {f.closer}
        </Reveal>
      </Section>
    </div>
  );
}
