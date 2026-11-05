"use client";
import { LIVE } from "@/content/copy/live";
import { HOME } from "@/content/copy/home";
import { useScene } from "@/three/registry";
import { fmtClock, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { Btn, Odometer, Reveal, SectionIndex } from "@/components/ui/primitives";
import { CREDIT, SectionHead, idx } from "@/components/idle/kit";
import NowPlaying from "./NowPlaying";
import Pools from "./Pools";
import Standings from "./Standings";
import Radio from "./Radio";
import PoolLifecycle from "./PoolLifecycle";

const N = 6;

function Scoreboard() {
  const d = useArenaDerived();
  const L = HOME.liveStrip.labels;
  const cells: [string, React.ReactNode][] = [
    [L.openPools, <Odometer key="o" value={d.openPools} pad={2} />],
    [L.nextLock, <span key="n" className="mono">{d.nextLockSec > 0 ? fmtClock(d.nextLockSec) : "--:--"}</span>],
    [L.board, <Odometer key="b" value={d.boardCount} />],
    [
      `${L.paid} · ${CREDIT}`,
      <span key="p" className="text-[var(--value)]">
        <Odometer value={Math.round(d.idlePaidOut)} />
      </span>,
    ],
  ];
  return (
    <dl className="grid grid-cols-2 border-y border-[var(--rule-strong)] md:grid-cols-4">
      {cells.map(([k, v], i) => (
        <div key={k} className={`py-4 md:py-5 ${i % 2 ? "border-l border-[var(--rule)] pl-4" : ""} md:border-l md:border-[var(--rule)] md:pl-5 md:first:border-l-0 md:first:pl-0 ${i > 1 ? "border-t border-[var(--rule)] md:border-t-0" : ""}`}>
          <dt className="eyebrow">{k}</dt>
          <dd className="mt-2 text-[clamp(1.6rem,3.4vw,2.8rem)] leading-none">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceNote() {
  const sources = useArenaStore((s) => s.sources);
  return (
    <footer className="shell mb-32 mt-24 border-t border-[var(--rule)] pt-6">
      <p className="eyebrow">Data source</p>
      <p className="mono mt-3 max-w-[90ch] break-words text-[0.74rem] leading-[1.8] text-[var(--paper-dim)]">{LIVE.source}</p>
      <ul className="mono mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.66rem] uppercase tracking-[0.14em]">
        {Object.entries(sources).map(([k, v]) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: v === "live" ? "var(--signal)" : v === "fallback" ? "var(--hot)" : "var(--paper-dim)" }} />
            <span className="text-[var(--paper-dim)]">{k}</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}

export default function LivePage() {
  useScene("live");
  const src = useArenaStore((s) => s.sources.contests);
  return (
    <>
      <header className="shell relative pt-36 md:pt-48">
        <SectionIndex>{LIVE.eyebrow}</SectionIndex>
        <div className="mt-6 grid gap-8 md:grid-cols-12">
          <Reveal as="h1" width className="display display-hero md:col-span-7">
            {LIVE.h1}
          </Reveal>
          <div className="self-end md:col-span-5">
            <Reveal as="p" delay={120} className="text-[1.05rem] text-[var(--paper-dim)] md:text-[1.12rem]">
              {LIVE.sub}
            </Reveal>
            <Reveal delay={220} className="mt-8 flex flex-wrap gap-3">
              {LIVE.ctas.map((c, i) => (
                <Btn key={c.href} href={c.href} variant={i === 0 ? "solid" : "ghost"}>
                  {c.label}
                </Btn>
              ))}
            </Reveal>
          </div>
        </div>
        <div className="mt-14">
          <Scoreboard />
          <p className="mono mt-2 text-right text-[0.6rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">feed · {src}</p>
        </div>
      </header>

      <section className="shell mt-24 md:mt-32" aria-labelledby="live-life">
        <SectionHead index={idx(1, N, "POOL LIFECYCLE")} title={<span id="live-life">What you&apos;re watching.</span>}>
          <p>{LIVE.nowPlaying.emptyBody}</p>
        </SectionHead>
        <div className="mt-10">
          <PoolLifecycle />
        </div>
      </section>

      <section className="shell mt-28 md:mt-40" aria-labelledby="live-now">
        <SectionHead index={idx(2, N, "BROADCAST")} title={<span id="live-now">{LIVE.nowPlaying.title}</span>} />
        <div className="mt-10">
          <NowPlaying />
        </div>
      </section>

      <section className="shell mt-28 md:mt-40" aria-labelledby="live-pools">
        <SectionHead index={idx(3, N, "POOLS")} title={<span id="live-pools">{LIVE.pools.title}</span>} />
        <div className="mt-10">
          <Pools />
        </div>
      </section>

      <section className="shell mt-28 grid gap-16 md:mt-40 lg:grid-cols-12 lg:gap-10" aria-label={`${LIVE.standings.title} · ${LIVE.chat.title}`}>
        <div className="lg:col-span-6">
          <SectionIndex>{idx(4, N, "STANDINGS")}</SectionIndex>
          <h2 className="display display-l mt-6" style={{ fontVariationSettings: '"wdth" 88, "wght" 700' }}>
            {LIVE.standings.title}
          </h2>
          <div className="mt-10">
            <Standings />
          </div>
        </div>
        <div className="lg:col-span-6">
          <SectionIndex>{idx(5, N, "RADIO")}</SectionIndex>
          <h2 className="display display-l mt-6" style={{ fontVariationSettings: '"wdth" 88, "wght" 700' }}>
            {LIVE.chat.title}
          </h2>
          <p className="mt-3 text-[var(--paper-dim)]">{LIVE.chat.sub}</p>
          <div className="mt-6">
            <Radio />
          </div>
        </div>
      </section>

      <section className="shell mt-28 md:mt-40" aria-labelledby="live-results">
        <SectionHead index={idx(6, N, "RESULTS")} title={<span id="live-results">{LIVE.results.title}</span>} />
        <div className="mt-10 grid border border-dashed border-[var(--rule-strong)] md:grid-cols-12">
          <div className="p-6 md:col-span-5 md:p-10">
            <p className="display display-m">{LIVE.results.empty}</p>
            <p className="mt-3 text-[var(--paper-dim)]">{LIVE.results.emptyBody}</p>
          </div>
          {/* the empty results table: its columns are real, its rows are not there yet */}
          <div aria-hidden className="border-t border-dashed border-[var(--rule-strong)] p-6 md:col-span-7 md:border-l md:border-t-0 md:p-10">
            <div className="mono grid grid-cols-4 gap-3 border-b border-[var(--rule)] pb-2 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
              <span>rank</span>
              <span>agent</span>
              <span>score</span>
              <span className="text-right">payout</span>
            </div>
            {[0, 1, 2].map((k) => (
              <div key={k} className="grid grid-cols-4 gap-3 border-b border-[var(--rule)] py-3" style={{ opacity: 1 - k * 0.3 }}>
                {[0, 1, 2, 3].map((j) => (
                  <span key={j} className="h-2 bg-[var(--rule)]" style={{ width: `${40 + ((k + j) % 3) * 20}%`, justifySelf: j === 3 ? "end" : "start" }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SourceNote />
    </>
  );
}
