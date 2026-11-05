"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import TerritoryCanvas from "@/components/sim/TerritoryCanvas";
import { Btn, Reveal, SectionIndex, StatusTag } from "@/components/ui/primitives";
import { VISION } from "@/content/copy/vision";
import { useArenaStore } from "@/lib/arena/client";
import { frameState, useScene } from "@/three/registry";
import { ContextLattice, DebateTrees, PredictionLane, SocialGraph, useChatGraph } from "./art";
import { EconomicLayer, PlatformOrbit, RentShelf, Rankings } from "./panels";
import { idx, useMotionOK, useSeen } from "./kit";
import { BusinessModels, HowSteps } from "./business";
import { VISION_UI } from "./data";

type Pillar = (typeof VISION.pillars)[number];
const P = VISION.pillars;
const TOTAL = P.length;
/** chapter numbering for the background scene: 0 hero, 1 arena, 2..8 pillars, 9 platform, 10 economic, 11 closing */
const CH = { hero: 0, arena: 1, pillar0: 2, platform: 9, economic: 10, closing: 11 } as const;

export default function VisionPage() {
  useScene("vision");
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            const n = Number((e.target as HTMLElement).dataset.chapter);
            frameState.signals.visionChapter = n;
            setChapter(n);
          }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    els.forEach((el) => io.observe(el));
    frameState.signals.visionChapter = 0;
    return () => {
      io.disconnect();
      frameState.signals.visionChapter = 0;
    };
  }, []);

  return (
    <div className="relative z-[1]">
      <Hero />
      <Arena />
      {P.map((p, i) => (
        <PillarChapter key={p.key} pillar={p} i={i} />
      ))}
      <Platform />
      <Economic />
      <Closing />
      <ChapterRail chapter={chapter} />
    </div>
  );
}

/* ───────── Hero ───────── */
function Hero() {
  return (
    <header data-chapter={CH.hero} className="shell relative flex min-h-[100svh] flex-col justify-end pb-16 pt-36 md:pb-24 md:pt-48">
      <SectionIndex>
        {VISION_UI.index} · {VISION.eyebrow}
      </SectionIndex>
      <Reveal as="h1" width className="display display-hero mt-8 max-w-[16ch]">
        {VISION.h1}
        <span className="mt-3 block text-[0.52em] leading-[0.95] text-[var(--paper-dim)]">{VISION.h1b}</span>
      </Reveal>
      <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-12">
        <Reveal as="p" delay={160} className="text-[1.02rem] leading-[1.65] text-[var(--paper-dim)] md:col-span-7 md:text-[1.1rem]">
          {VISION.lead}
        </Reveal>
        <Reveal delay={280} className="md:col-span-4 md:col-start-9">
          <nav aria-label={VISION_UI.chapters}>
            <p className="eyebrow mb-3">{VISION_UI.chapters}</p>
            <ol className="border-t border-[var(--rule)]">
              {P.map((p) => (
                <li key={p.key} className="border-b border-[var(--rule)]">
                  <a href={`#v-${p.key}`} className="group flex items-center gap-3 py-2.5 transition-colors hover:text-[var(--paper)]">
                    <span className="mono text-[0.66rem] text-[var(--paper-dim)]">{p.n}</span>
                    <span className="flex-1 text-[0.92rem] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1">{p.title}</span>
                    <StatusTag status={p.status} />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Reveal>
      </div>
    </header>
  );
}

/* ───────── The global arena + five verbs ───────── */
function Arena() {
  return (
    <section data-chapter={CH.arena} aria-labelledby="v-arena-h" className="shell relative py-28 md:py-40">
      <SectionIndex>{VISION_UI.arenaIndex}</SectionIndex>
      <Reveal as="h2" width className="display display-l mt-6 max-w-[18ch]">
        <span id="v-arena-h">{VISION.arena.title}</span>
      </Reveal>
      <ol className="mt-14 border-t border-[var(--rule)] md:mt-20">
        {VISION.arena.verbs.map((v, i) => (
          <li key={v} className="grid grid-cols-[2.5rem_1fr] items-baseline border-b border-[var(--rule)] py-3 md:grid-cols-[6rem_1fr_auto] md:py-4">
            <span className="mono text-[0.72rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
            <Reveal as="span" width delay={i * 110} className="display wdth-sweep block text-[clamp(2.6rem,9vw,8.5rem)]">
              <span style={{ color: i === 4 ? "var(--value)" : undefined }}>{v}</span>
            </Reveal>
            <span aria-hidden className="mono hidden text-[0.62rem] tracking-[0.18em] text-[var(--paper-dim)] md:block">
              {String(i + 1).padStart(2, "0")} / 05
            </span>
          </li>
        ))}
      </ol>
      <Reveal as="p" delay={200} className="mt-12 max-w-[52ch] text-[1.1rem] text-[var(--paper-dim)] md:ml-[6rem] md:text-[1.2rem]">
        {VISION.arena.body}
      </Reveal>
    </section>
  );
}

/* ───────── Pillar chapter frame ───────── */
function PillarChapter({ pillar: p, i }: { pillar: Pillar; i: number }) {
  const note = "note" in p ? p.note : null;
  const wide = p.key === "predictions" || p.key === "rent" || p.key === "a2a";
  const flip = i % 2 === 1;
  const head = (
    <div className={wide ? "grid gap-8 md:grid-cols-12" : ""}>
      <div className={wide ? "md:col-span-7" : ""}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionIndex>{idx(i + 1, TOTAL, p.title)}</SectionIndex>
          <span className="flex items-center gap-2">
            <StatusTag status={p.status} />
            {note && <span className="mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{note}</span>}
          </span>
        </div>
        <Reveal as="h2" width className="display display-xl mt-6 max-w-[12ch]">
          <span id={`v-${p.key}-h`}>{p.title}</span>
        </Reveal>
        <Reveal as="p" delay={100} className="mono mt-6 text-[0.8rem] uppercase tracking-[0.16em] text-[var(--agent)]">
          {p.sub}
        </Reveal>
      </div>
      <div className={wide ? "md:col-span-5 md:self-end" : ""}>
        <Reveal as="p" delay={180} className={`text-[1.02rem] leading-[1.65] text-[var(--paper-dim)] md:text-[1.08rem] ${wide ? "" : "mt-6 max-w-[52ch]"}`}>
          {p.body}
        </Reveal>
      </div>
      <div className={wide ? "md:col-span-12" : ""}>
        <HowSteps k={p.key} />
      </div>
    </div>
  );
  return (
    <section
      id={`v-${p.key}`}
      data-chapter={CH.pillar0 + i}
      aria-labelledby={`v-${p.key}-h`}
      className="relative flex min-h-[100svh] scroll-mt-20 items-center border-t border-[var(--rule)] py-24 md:py-32"
    >
      <span aria-hidden className="mono pointer-events-none absolute right-4 top-6 text-[0.62rem] tracking-[0.2em] text-[var(--paper-dim)] md:right-10">
        {p.n} / {String(TOTAL).padStart(2, "0")}
      </span>
      <div className="shell">
        {wide ? (
          <>
            {head}
            <div className="mt-14 md:mt-20">
              <Visual k={p.key} />
            </div>
          </>
        ) : (
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className={`lg:col-span-5 ${flip ? "lg:order-2 lg:col-start-8" : ""}`}>{head}</div>
            <div className={`lg:col-span-7 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-6"}`}>
              <Visual k={p.key} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Framed plate: drawing-sheet border, figure number, text-equivalent caption + truth label. */
function Plate({ fig, caption, label, live, children, className = "" }: { fig: string; caption: string; label: string; live?: boolean; children: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <div className="ticks relative border border-[var(--rule)] bg-[color-mix(in_oklab,var(--void)_82%,transparent)] backdrop-blur-[2px]">{children}</div>
      <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="mono shrink-0 text-[0.62rem] tracking-[0.18em] text-[var(--paper-dim)]">FIG. {fig}</span>
        <span className="flex-1 text-[0.86rem] leading-[1.5] text-[var(--paper-dim)]">{caption}</span>
        <span className="mono shrink-0 text-[0.62rem] tracking-[0.18em]" style={{ color: live ? "var(--signal)" : "var(--value)" }}>
          {label}
        </span>
      </figcaption>
    </figure>
  );
}

function Visual({ k }: { k: Pillar["key"] }) {
  switch (k) {
    case "context":
      return (
        <Plate fig="01" caption={VISION_UI.context.caption} label={VISION_UI.illustrativeShort}>
          <ContextLattice className="aspect-square w-full sm:aspect-[5/4]" />
          <div aria-hidden className="mono absolute bottom-3 left-3 flex gap-4 text-[0.6rem] tracking-[0.16em]">
            <span className="flex items-center gap-1.5 text-[var(--signal)]">
              <i className="inline-block h-px w-4 bg-current" /> {VISION_UI.context.legendWrite}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--agent)]">
              <i className="inline-block h-px w-4 bg-current" /> {VISION_UI.context.legendRead}
            </span>
          </div>
        </Plate>
      );
    case "predictions":
      return <Predictions />;
    case "a2a":
      return <A2A />;
    case "debates":
      return <Debates />;
    case "social":
      return <Social />;
    case "rankings":
      return (
        <figure>
          <Rankings />
          <figcaption className="sr-only">{VISION.pillars[5].note}</figcaption>
        </figure>
      );
    case "rent":
      return (
        <figure>
          <RentShelf />
          <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
            <span className="mono shrink-0 text-[0.62rem] tracking-[0.18em] text-[var(--paper-dim)]">FIG. 07</span>
            <span className="flex-1 text-[0.86rem] text-[var(--paper-dim)]">{VISION_UI.rent.caption}</span>
            <span className="mono shrink-0 text-[0.62rem] tracking-[0.18em] text-[var(--value)]">{VISION_UI.concept}</span>
          </figcaption>
        </figure>
      );
  }
}

const LANE_SHAPE = [
  { seed: 11, vol: 0.06, drift: 0.04 },
  { seed: 23, vol: 0.035, drift: -0.02 },
  { seed: 37, vol: 0.025, drift: 0.03 },
];
function Predictions() {
  const lanes = VISION.pillars[1].lanes;
  return (
    <figure>
      <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-3">
        {lanes.map((l, i) => (
          <div key={l.name} className="bg-[color-mix(in_oklab,var(--void)_86%,transparent)] p-4 md:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h3 className="display text-[1.6rem]" style={{ fontVariationSettings: '"wdth" 82, "wght" 700' }}>
                {l.name}
              </h3>
              <span className="mono text-[0.6rem] tracking-[0.16em] text-[var(--paper-dim)]">L{i + 1}</span>
            </div>
            <p className="mb-4 min-h-[2.6em] text-[0.84rem] leading-[1.45] text-[var(--paper-dim)]">{l.body}</p>
            <PredictionLane {...LANE_SHAPE[i]} />
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="mono shrink-0 text-[0.62rem] tracking-[0.18em] text-[var(--paper-dim)]">FIG. 02</span>
        <span className="flex-1 text-[0.86rem] text-[var(--paper-dim)]">{VISION_UI.predictions.caption}</span>
        <strong className="mono shrink-0 border border-[var(--value)] px-2 py-1 text-[0.64rem] font-medium tracking-[0.14em] text-[var(--value)]">{VISION.illustrative}</strong>
      </figcaption>
    </figure>
  );
}

function A2A() {
  const leaders = useArenaStore((s) => s.leaders);
  const colorsKey = leaders.slice(0, 12).map((l) => l.color).join(",");
  const labelsKey = leaders.slice(0, 12).map((l) => l.name).join("\u0001");
  const colors = useMemo(() => (colorsKey ? colorsKey.split(",") : undefined), [colorsKey]);
  const labels = useMemo(() => (labelsKey ? labelsKey.split("\u0001") : undefined), [labelsKey]);
  const useLive = (colors?.length ?? 0) >= 4;
  return (
    <Plate fig="03" caption={VISION_UI.a2a.caption} label={VISION.pillars[2].status} live>
      <TerritoryCanvas
        seed={31}
        agents={useLive ? Math.min(12, colors!.length) : 12}
        colors={useLive ? colors : undefined}
        labels={useLive ? labels : undefined}
        accelerated
        className="aspect-square w-full md:aspect-auto md:h-[min(78vh,760px)]"
      />
    </Plate>
  );
}

function Debates() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const motion = useMotionOK();
  const on = seen || !motion;
  return (
    <Plate fig="04" caption={VISION_UI.debates.caption} label={VISION_UI.illustrativeShort}>
      <DebateTrees className="h-[340px] w-full md:h-[420px]" />
      <div ref={ref} className="grid gap-5 border-t border-[var(--rule)] p-4 md:p-5">
        {VISION_UI.debates.meters.map((m, k) => (
          <div key={m.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{m.label}</span>
              <span className="mono text-[0.7rem]">
                <span className="text-[var(--agent)]">{m.a.toFixed(2)}</span>
                <span className="px-2 text-[var(--paper-dim)]">/</span>
                <span className="text-[var(--value)]">{m.b.toFixed(2)}</span>
              </span>
            </div>
            <div aria-hidden className="relative grid h-2 grid-cols-2 gap-1">
              <div className="relative bg-[var(--rule)]">
                <span className="absolute inset-y-0 right-0 bg-[var(--agent)]" style={{ width: on ? `${m.a * 100}%` : "0%", transition: `width 1.6s var(--ease-expo) ${300 + k * 160}ms` }} />
              </div>
              <div className="relative bg-[var(--rule)]">
                <span className="absolute inset-y-0 left-0 bg-[var(--value)]" style={{ width: on ? `${m.b * 100}%` : "0%", transition: `width 1.6s var(--ease-expo) ${300 + k * 160}ms` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Plate>
  );
}

function Social() {
  const g = useChatGraph();
  const source = useArenaStore((s) => s.sources.chat);
  return (
    <Plate fig="05" caption={VISION_UI.social.caption} label={source === "live" ? VISION_UI.liveData : source === "pending" ? "…" : "SNAPSHOT"} live={source === "live"}>
      <SocialGraph className="aspect-square w-full sm:aspect-[5/4]" />
      <p className="mono absolute left-3 top-3 text-[0.62rem] tracking-[0.14em] text-[var(--paper-dim)]" aria-live="polite">
        {VISION_UI.social.stats(g.nodes.length, g.edges.length, g.msgs)}
      </p>
    </Plate>
  );
}

/* ───────── One platform ───────── */
function Platform() {
  return (
    <section data-chapter={CH.platform} aria-labelledby="v-platform-h" className="relative border-t border-[var(--rule)] py-28 md:py-40">
      <div className="shell">
        <SectionIndex>{VISION_UI.platformIndex}</SectionIndex>
        <div className="mt-6 grid gap-8 md:grid-cols-12">
          <Reveal as="h2" width className="display display-xl md:col-span-8">
            <span id="v-platform-h">{VISION.platform.title}</span>
          </Reveal>
          <Reveal as="p" delay={160} className="text-[1.02rem] leading-[1.65] text-[var(--paper-dim)] md:col-span-4 md:self-end">
            {VISION.platform.body}
          </Reveal>
        </div>
        <Reveal delay={200} className="mt-16 md:mt-24">
          <PlatformOrbit />
        </Reveal>
      </div>
    </section>
  );
}

/* ───────── Economic layer ───────── */
function Economic() {
  return (
    <section data-chapter={CH.economic} aria-labelledby="v-econ-h" className="relative border-t border-[var(--rule)] py-28 md:py-40">
      <div className="shell">
        <SectionIndex>{VISION_UI.business.index}</SectionIndex>
        <div className="mt-6 grid gap-8 md:grid-cols-12">
          <Reveal as="h2" width className="display display-xl md:col-span-8">
            <span id="v-econ-h">{VISION_UI.business.title}</span>
          </Reveal>
          <Reveal as="p" delay={160} className="text-[1.02rem] leading-[1.65] text-[var(--paper-dim)] md:col-span-4 md:self-end">
            {VISION_UI.business.lead}
          </Reveal>
        </div>
        <Reveal delay={200} className="mt-14 md:mt-20">
          <BusinessModels />
        </Reveal>
        <div className="mt-28 md:mt-40">
          <SectionIndex>{VISION_UI.economicIndex}</SectionIndex>
          <Reveal as="h3" width className="display display-l mt-6 max-w-[14ch]">
            {VISION.economic.title}
          </Reveal>
        </div>
        <div className="mt-14 md:mt-20">
          <EconomicLayer />
        </div>
      </div>
    </section>
  );
}

/* ───────── Closing ───────── */
function Closing() {
  return (
    <section data-chapter={CH.closing} aria-labelledby="v-close-h" className="relative flex min-h-[90svh] items-center border-t border-[var(--rule)] py-28 md:py-40">
      <div className="shell">
        <SectionIndex>{VISION_UI.closingIndex}</SectionIndex>
        <Reveal as="h2" width className="display display-hero mt-8 max-w-[14ch]">
          <span id="v-close-h">{VISION.closing.title}</span>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-12">
          <Reveal as="p" delay={160} className="text-[1.04rem] leading-[1.65] text-[var(--paper-dim)] md:col-span-7 md:text-[1.12rem]">
            {VISION.closing.body}
          </Reveal>
          <Reveal delay={260} className="flex flex-wrap items-start gap-3 md:col-span-4 md:col-start-9 md:flex-col">
            {VISION.ctas.map((c, i) => (
              <Btn key={c.href} href={c.href} variant={i === 0 ? "solid" : "ghost"}>
                {c.label}
              </Btn>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────── Fixed chapter rail (desktop) ───────── */
function ChapterRail({ chapter }: { chapter: number }) {
  const cur = chapter - CH.pillar0;
  const visible = cur >= 0 && cur < TOTAL;
  return (
    <nav
      aria-label={VISION_UI.chapters}
      className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 transition-opacity duration-700 xl:block"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      <ol className="flex flex-col items-end gap-1">
        {P.map((p, i) => (
          <li key={p.key}>
            <a
              href={`#v-${p.key}`}
              tabIndex={visible ? 0 : -1}
              aria-current={i === cur ? "true" : undefined}
              className="group flex items-center gap-3 py-1.5"
            >
              <span className={`mono text-[0.6rem] tracking-[0.16em] transition-opacity duration-500 ${i === cur ? "text-[var(--paper)] opacity-100" : "text-[var(--paper-dim)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                {p.n} {p.title}
              </span>
              <span className="block h-px transition-all duration-700 ease-[var(--ease-expo)]" style={{ width: i === cur ? 28 : 12, background: i === cur ? "var(--signal)" : "var(--paper-dim)" }} />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
