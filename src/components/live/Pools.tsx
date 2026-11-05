"use client";
import { LIVE } from "@/content/copy/live";
import { fmtClock, useArenaStore, useCountdown } from "@/lib/arena/client";
import type { ContestT } from "@/lib/arena/schemas";
import { Odometer } from "@/components/ui/primitives";
import { CREDIT } from "@/components/idle/kit";

export function PoolCard({ c, i }: { c: ContestT; i: number }) {
  const secs = useCountdown(c);
  const fill = c.max_slots ? c.filled_slots / c.max_slots : 0;
  const urgent = secs > 0 && secs < 60;
  return (
    <article className="ticks relative flex flex-col border border-[var(--rule)] bg-[var(--void)] p-5 md:p-6" aria-label={`${c.game_name ?? "Pool"}, entry ${c.entry_fee} ${CREDIT}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
            POOL {String(i + 1).padStart(2, "0")} · {c.status}
          </p>
          <h3 className="display mt-3 text-[1.7rem] leading-none md:text-[2rem]" style={{ fontVariationSettings: '"wdth" 78, "wght" 700' }}>
            {c.game_name ?? c.game_slug ?? "Pool"}
          </h3>
        </div>
        <div className="text-right">
          <p className="eyebrow">{LIVE.pools.locks}</p>
          <p className="mono mt-1 text-[1.5rem] leading-none" style={{ color: urgent ? "var(--hot)" : "var(--paper)" }} aria-live="off">
            {secs > 0 ? fmtClock(secs) : "--:--"}
          </p>
        </div>
      </div>

      {/* seat-by-seat fill: one tick per seat */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{LIVE.pools.seats}</span>
          <span className="mono text-[0.8rem]">
            <span className="text-[var(--signal)]">{c.filled_slots}</span>
            <span className="text-[var(--paper-dim)]"> / {c.max_slots}</span>
          </span>
        </div>
        <div className="mt-2 flex h-5 gap-[1px]" role="meter" aria-valuemin={0} aria-valuemax={c.max_slots} aria-valuenow={c.filled_slots} aria-label={LIVE.pools.seats}>
          {Array.from({ length: Math.min(c.max_slots, 200) }, (_, k) => (
            <span
              key={k}
              className="flex-1"
              style={{
                background: k < c.filled_slots ? "var(--signal)" : "var(--rule)",
                opacity: k < c.filled_slots ? 1 : k % 10 === 9 ? 1 : 0.7,
                transition: `background .4s steps(2) ${k * 6}ms`,
              }}
            />
          ))}
        </div>
        <p className="mono mt-1 text-right text-[0.62rem] text-[var(--paper-dim)]">{Math.round(fill * 100)}% full</p>
      </div>

      <dl className="mt-auto grid grid-cols-2 border-t border-[var(--rule)] pt-4">
        <div>
          <dt className="eyebrow">{LIVE.pools.entry}</dt>
          <dd className="mono mt-1 text-[1.1rem]">
            {c.entry_fee} <span className="text-[0.7rem] text-[var(--paper-dim)]">{CREDIT}</span>
          </dd>
        </div>
        <div className="border-l border-[var(--rule)] pl-4">
          <dt className="eyebrow">{LIVE.pools.prize}</dt>
          <dd className="mt-1 text-[1.1rem] text-[var(--value)]">
            <Odometer value={Math.round(c.prize_pool)} /> <span className="mono text-[0.7rem]">{CREDIT}</span>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function Pools() {
  const contests = useArenaStore((s) => s.contests);
  const src = useArenaStore((s) => s.sources.contests);
  const open = contests.filter((c) => c.status === "open");
  if (src === "pending")
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" aria-busy>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="h-[260px] animate-pulse border border-[var(--rule)] bg-[var(--deck)]" />
        ))}
      </div>
    );
  if (!open.length)
    return (
      <div className="border border-dashed border-[var(--rule-strong)] p-8">
        <p className="display display-m">{LIVE.nowPlaying.empty}</p>
        <p className="mt-3 max-w-[56ch] text-[var(--paper-dim)]">{LIVE.nowPlaying.emptyBody}</p>
      </div>
    );
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {open.map((c, i) => (
        <PoolCard key={c.contest_id} c={c} i={i} />
      ))}
    </div>
  );
}
