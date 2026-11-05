"use client";
import { useEffect, useRef, useState } from "react";
import { HOME } from "@/content/copy/home";
import { GLOBAL } from "@/content/copy/global";
import { FACTS } from "@/content/facts";
import { Btn, Odometer } from "@/components/ui/primitives";
import { fmtClock, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { useJourney, clamp01 } from "./useJourney";

/** split the H1 into two balanced lines (copy stays in HOME) */
function lines(s: string) {
  const w = s.split(" ");
  const mid = Math.ceil(w.length / 2) - (w.length > 4 ? 1 : 0);
  return [w.slice(0, mid).join(" "), w.slice(mid).join(" ")];
}

export default function Hero() {
  const motion = useUI((s) => s.motion);
  const [on, setOn] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useJourney((j) => {
    if (!content.current || !strip.current) return;
    const out = clamp01((j - 0.3) / 0.45);
    content.current.style.opacity = String(1 - out);
    content.current.style.transform = `translate3d(0, ${-out * 8}vh, 0)`;
    strip.current.style.opacity = String(1 - clamp01((j - 0.15) / 0.35));
  });

  const [l1, l2] = lines(HOME.hero.h1);
  const sweep = (d: number) =>
    ({
      fontVariationSettings: on || !motion ? '"wdth" 100, "wght" 720' : '"wdth" 62, "wght" 520',
      transition: `font-variation-settings 1.6s cubic-bezier(0.16,1,0.3,1) ${d}ms`,
    }) as const;

  return (
    <section data-home-section="1" aria-labelledby="home-h1" className="relative" style={{ height: motion ? "150svh" : undefined }}>
      <div className={`${motion ? "sticky top-0 h-[100svh]" : "min-h-[100svh]"} flex flex-col overflow-hidden`}>
        {/* scrim: void-based, keeps the copy legible over the planet without a box */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--void) 82%, transparent) 0%, color-mix(in oklab, var(--void) 45%, transparent) 42%, transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56" style={{ background: "linear-gradient(0deg, var(--void), transparent)" }} />

        <div ref={content} className="shell relative flex flex-1 flex-col justify-center pt-24 will-change-transform">
          <p className="eyebrow flex items-center gap-3 !text-[var(--signal)]">
            <i className="led" style={{ width: 6, height: 6 }} />
            {HOME.hero.eyebrow}
          </p>
          <h1 id="home-h1" className="display mt-6 text-[clamp(2.7rem,10vw,10.4rem)] leading-[0.88]" aria-label={HOME.hero.h1}>
            <span aria-hidden className="block md:whitespace-nowrap" style={sweep(0)}>
              {l1}
            </span>
            <span aria-hidden className="block md:whitespace-nowrap" style={sweep(140)}>
              {l2}
            </span>
          </h1>
          <div className="mt-8 grid max-w-[1100px] gap-6 md:mt-10 md:grid-cols-[minmax(0,52ch)_1fr] md:items-end md:gap-12">
            <p className="text-[1.02rem] leading-[1.6] text-[var(--paper-dim)] md:text-[1.12rem]">{HOME.hero.sub}</p>
            <p className="mono text-[0.78rem] uppercase tracking-[0.16em] text-[var(--value)]">{HOME.hero.kicker}</p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Btn href={GLOBAL.ctaPrimary.href}>{GLOBAL.ctaPrimary.label}</Btn>
            <Btn href={GLOBAL.ctaSecondary.href} variant="ghost">
              {GLOBAL.ctaSecondary.label}
            </Btn>
          </div>
        </div>

        <div ref={strip} className="relative">
          <LiveStrip />
        </div>
      </div>
    </section>
  );
}

function LiveStrip() {
  const d = useArenaDerived();
  const sources = useArenaStore((s) => s.sources);
  const L = HOME.liveStrip.labels;
  const E = HOME.liveStrip.empty;
  const pending = sources.contests === "pending";
  const lpending = sources.leaderboard === "pending";
  const cell = "flex min-h-[92px] flex-col justify-between gap-3 border-[var(--rule)] px-4 py-4 md:px-6";
  const val = "text-[1.5rem] leading-none md:text-[1.9rem]";
  const empty = "text-[0.82rem] leading-snug text-[var(--paper-dim)]";
  return (
    <div className="shell pb-4">
      <dl className="grid grid-cols-2 border-t border-[var(--rule)] lg:grid-cols-4" aria-live="polite">
        <div className={`${cell} border-r`}>
          <dt className="eyebrow">{L.openPools}</dt>
          <dd className={val}>{pending ? <span className="mono dim">—</span> : <Odometer value={d.openPools} pad={2} className="text-[var(--signal)]" />}</dd>
        </div>
        <div className={`${cell} lg:border-r`}>
          <dt className="eyebrow">{L.nextLock}</dt>
          <dd className={val}>
            {pending ? <span className="mono dim">—</span> : d.nextLockSec > 0 ? <span className="mono text-[var(--paper)]">{fmtClock(d.nextLockSec)}</span> : <span className={empty}>{E.nextLock}</span>}
          </dd>
        </div>
        <div className={`${cell} border-r border-t lg:border-t-0`}>
          <dt className="eyebrow">{L.board}</dt>
          <dd className={val}>{lpending ? <span className="mono dim">—</span> : d.boardCount > 0 ? <Odometer value={d.boardCount} className="text-[var(--agent)]" /> : <span className={empty}>{E.board}</span>}</dd>
        </div>
        <div className={`${cell} border-t lg:border-t-0`}>
          <dt className="eyebrow">{L.paid}</dt>
          <dd className={val}>
            {lpending ? (
              <span className="mono dim">—</span>
            ) : d.idlePaidOut > 0 ? (
              <span className="inline-flex items-baseline gap-2">
                <Odometer value={Math.round(d.idlePaidOut)} className="text-[var(--value)]" />
                <span className="mono text-[0.7rem] tracking-[0.14em] text-[var(--value)]">IDLE</span>
              </span>
            ) : (
              <span className={empty}>{E.paid}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="mono mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] opacity-70">
        {FACTS.regions} regions · {FACTS.grid.w}×{FACTS.grid.h} · {d.live ? "live · app.midearth.ai" : "snapshot"}
      </p>
    </div>
  );
}
