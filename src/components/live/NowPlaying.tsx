"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { LIVE } from "@/content/copy/live";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { fmtClock, useArenaDerived, useArenaStore, useCountdown, useNow } from "@/lib/arena/client";
import { CREDIT } from "@/components/idle/kit";

const TerritoryCanvas = dynamic(() => import("@/components/sim/TerritoryCanvas"), { ssr: false });
const FoodCanvas = dynamic(() => import("@/components/sim/FoodCanvas"), { ssr: false });
const SignalCanvas = dynamic(() => import("@/components/sim/SignalCanvas"), { ssr: false });

/** Broadcast frame: corner ticks, ON AIR / OFF AIR bug, UTC timecode. */
function Frame({ onAir, label, children }: { onAir: boolean; label: string; children: React.ReactNode }) {
  const now = useNow();
  const tc = new Date(now).toISOString().slice(11, 19);
  return (
    <div className="relative border border-[var(--rule-strong)] bg-[var(--deck)]">
      <div className="mono flex items-center justify-between border-b border-[var(--rule)] px-3 py-2 text-[0.64rem] uppercase tracking-[0.18em] md:px-4">
        <span className="flex items-center gap-2" style={{ color: onAir ? "var(--hot)" : "var(--paper-dim)" }}>
          <i className={onAir ? "led" : ""} style={{ width: 7, height: 7, display: "inline-block", borderRadius: 99, background: "currentColor", opacity: onAir ? 1 : 0.5 }} />
          {onAir ? "on air" : "off air"}
        </span>
        <span className="hidden text-[var(--paper-dim)] sm:inline">{label}</span>
        <span className="text-[var(--paper-dim)]" suppressHydrationWarning>
          {tc} UTC
        </span>
      </div>
      {children}
      {/* registration corners */}
      {["left-2 top-11 border-l border-t", "right-2 top-11 border-r border-t", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"].map((c) => (
        <span key={c} aria-hidden className={`pointer-events-none absolute h-4 w-4 border-[var(--paper-dim)] ${c}`} />
      ))}
    </div>
  );
}

export default function NowPlaying() {
  const contests = useArenaStore((s) => s.contests);
  const leaders = useArenaStore((s) => s.leaders);
  const d = useArenaDerived();
  const running = contests.find((c) => c.status === "running") ?? null;
  const left = useCountdown(running);
  const colors = useMemo(() => leaders.slice(0, 12).map((l) => l.color), [leaders]);
  const labels = useMemo(() => leaders.slice(0, 12).map((l) => l.name), [leaders]);

  if (running && running.game_slug === "signal") {
    return (
      <Frame onAir label={`${running.game_name} · ${running.filled_slots} agents · ${running.entry_fee} ${CREDIT}`}>
        <div className="relative aspect-square w-full md:aspect-[16/9]">
          <SignalCanvas seed={running.contest_id.charCodeAt(0) * 97} agents={Math.min(8, Math.max(3, running.filled_slots))} className="absolute inset-0" />
        </div>
        <p className="mono border-t border-[var(--rule)] px-4 py-2 text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
          {LIVE.nowPlaying.simNote} {left > 0 && `· ${fmtClock(left)} remaining`}
        </p>
      </Frame>
    );
  }
  if (running && (running.game_slug === "territorycontrol" || running.game_slug === "foodcollector")) {
    const Sim = running.game_slug === "foodcollector" ? FoodCanvas : TerritoryCanvas;
    return (
      <Frame onAir label={`${running.game_name} · ${running.filled_slots} agents · ${running.entry_fee} ${CREDIT}`}>
        <div className="relative aspect-square w-full md:aspect-[16/9]">
          <Sim seed={running.contest_id.charCodeAt(0) * 97} agents={Math.min(16, Math.max(4, running.filled_slots))} colors={colors} labels={labels} hud className="absolute inset-0" />
        </div>
        <p className="mono border-t border-[var(--rule)] px-4 py-2 text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
          {LIVE.nowPlaying.simNote} {left > 0 && `· ${fmtClock(left)} remaining`}
        </p>
      </Frame>
    );
  }

  // honest empty state: the empty 40×40 arena, waiting
  const next = d.nextLockSec;
  return (
    <Frame onAir={false} label={running ? `${running.game_name} · running` : LIVE.nowPlaying.title}>
      <div className="relative grid min-h-[440px] place-items-center overflow-hidden md:aspect-[16/9] md:min-h-0">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-90" />
        <div aria-hidden className="absolute inset-[12%] border border-[var(--rule-strong)]" style={{ background: "repeating-linear-gradient(90deg, transparent 0 calc(2.5% - 1px), var(--rule) calc(2.5% - 1px) 2.5%), repeating-linear-gradient(0deg, transparent 0 calc(2.5% - 1px), var(--rule) calc(2.5% - 1px) 2.5%)", opacity: 0.55 }} />
        <div className="relative z-10 px-6 text-center">
          <p className="eyebrow">{running ? `${running.game_name} · ${LIVE.nowPlaying.simNote}` : HOME.liveStrip.labels.nextLock}</p>
          <p className="mono mt-4 text-[clamp(3.6rem,13vw,10rem)] leading-none tracking-tight" aria-live="off">
            {running ? (left > 0 ? fmtClock(left) : "--:--") : next > 0 ? fmtClock(next) : "--:--"}
          </p>
          <p className="display mx-auto mt-6 max-w-[22ch] text-[clamp(1.2rem,2.4vw,1.9rem)]" style={{ fontVariationSettings: '"wdth" 85, "wght" 600' }}>
            {running ? running.game_name : LIVE.nowPlaying.empty}
          </p>
          <p className="mx-auto mt-3 max-w-[52ch] text-[0.95rem] text-[var(--paper-dim)]">{LIVE.nowPlaying.emptyBody}</p>
          <p className="mono mt-6 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">
            arena {FACTS.grid.w}×{FACTS.grid.h} · {FACTS.matchLengthSec}s match · {d.openPools} open pools
          </p>
        </div>
      </div>
    </Frame>
  );
}
