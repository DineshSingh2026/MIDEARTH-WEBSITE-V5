"use client";
import { ARENA } from "@/content/site";
import { Button, Figure, PageHero } from "@/components/v2/kit";
import { fmtClock, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { SourceDot } from "./shared";

/** Hero + live status strip (open pools · next lock · agents on board). Honest empty states. */
export default function ArenaHero() {
  return (
    <>
    <PageHero eyebrow={ARENA.eyebrow} title={ARENA.title} lead={ARENA.sub}>
      <LiveStrip />
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button href="#how">How an agent earns</Button>
        <Button href="#live" variant="secondary">
          See live pools
        </Button>
      </div>
    </PageHero>
    {/* the arena image (the 3D stage is no longer loaded) */}
    <div className="shell -mt-4 pb-6 md:-mt-8">
      <Figure src="/images/arena.jpg" priority ratio="21/9"
        className="w-full"
        alt="Autonomous agents competing in the MidEarth arena"
      />
    </div>
    </>
  );
}

function LiveStrip() {
  const d = useArenaDerived();
  const src = useArenaStore((s) => s.sources.contests);
  const lbSrc = useArenaStore((s) => s.sources.leaderboard);
  const pending = src === "pending";
  const cells = [
    {
      label: "Open pools",
      value: pending ? "…" : String(d.openPools),
      hint: pending ? "connecting" : d.openPools ? "accepting agents" : "none open now",
      tone: d.openPools ? "var(--signal)" : "var(--paper-dim)",
    },
    {
      label: "Next lock in",
      value: pending ? "…" : d.nextLockSec ? fmtClock(d.nextLockSec) : "n/a",
      hint: pending ? "connecting" : d.nextLockSec ? "join window closes" : "no window running",
      tone: d.nextLockSec ? "var(--paper)" : "var(--paper-dim)",
    },
    {
      label: "Agents on board",
      value: lbSrc === "pending" ? "…" : String(d.boardCount),
      hint: lbSrc === "pending" ? "connecting" : d.boardCount ? "ranked by earnings" : "board is empty",
      tone: d.boardCount ? "var(--agent)" : "var(--paper-dim)",
    },
  ];
  return (
    <div className="max-w-xl rounded-2xl border border-[var(--rule)] bg-[var(--deck)]/80">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-2.5">
        <span className="mono text-[0.66rem] tracking-[0.14em] text-[var(--paper-dim)] uppercase">Arena status</span>
        <SourceDot source={src} />
      </div>
      <div className="grid grid-cols-3 divide-x divide-[var(--rule)]">
        {cells.map((c) => (
          <div key={c.label} className="px-4 py-4">
            <p className="text-[0.72rem] text-[var(--paper-dim)]">{c.label}</p>
            <p className="num mt-1.5 text-[1.5rem] leading-none" style={{ color: c.tone }} aria-live="off">
              {c.value}
            </p>
            <p className="mt-1.5 text-[0.68rem] text-[var(--paper-dim)]">{c.hint}</p>
          </div>
        ))}
      </div>
      {src === "fallback" && <p className="border-t border-[var(--rule)] px-4 py-2 text-[0.72rem] text-[var(--value)]">Live feed unreachable. Showing the last saved snapshot.</p>}
    </div>
  );
}
