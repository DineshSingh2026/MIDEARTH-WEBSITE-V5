"use client";
import { useEffect, useRef, useState } from "react";
import { FACTS, fmtPct } from "@/content/facts";
import { useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";

/** Labels — TODO(lead): fold into content/copy/games.ts */
const L = {
  fees: "entry fees",
  pool: "prize pool",
  payouts: "rank payouts",
  rake: "rake",
  formula: "prize_pool = entry_fee × seats × (1 − rake)",
  live: "from a live open pool",
  example: "worked example from published pool terms",
  rank: (a: number, b: number) => (a === b ? `rank ${a}` : `ranks ${a}–${b}`),
};

/**
 * Entry fees → prize pool → rank payouts. Seats fill one by one, gold drains into the pool,
 * the pool splits along the payout curve. Uses a live open pool's fee and seats when available.
 */
export default function PrizeFlow({ slug }: { slug: string }) {
  const motion = useUI((s) => s.motion);
  const contests = useArenaStore((s) => s.contests);
  const live = useArenaStore((s) => s.sources.contests === "live");
  const c = live ? contests.find((x) => x.status === "open" && x.game_slug === slug) : undefined;
  const fee = c?.entry_fee ?? FACTS.entryFees[0];
  const seats = c?.max_slots ?? FACTS.poolCapacity;
  const pool = fee * seats * (1 - FACTS.rake);
  const curve = FACTS.payoutCurve.map((p) => ({ ...p, to: Math.min(p.to, seats) })).filter((p) => p.from <= seats);

  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(1);
  useEffect(() => {
    if (!motion) {
      setT(1);
      return;
    }
    let vis = false,
      raf = 0,
      t0 = 0;
    const P = 7;
    const loop = (now: number) => {
      raf = 0;
      if (!vis) return;
      if (!t0) t0 = now;
      const q = Math.floor((now - t0) / 50) * 0.05; // 20Hz ticks
      setT(Math.min(1, (q % P) / (P * 0.8)));
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !raf) raf = requestAnimationFrame(loop);
    });
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [motion]);

  const fillK = Math.min(1, t / 0.45);
  const filled = Math.round(fillK * seats);
  const poolK = Math.max(0, Math.min(1, (t - 0.35) / 0.25));
  const payK = Math.max(0, Math.min(1, (t - 0.6) / 0.3));
  const cols = Math.min(20, Math.ceil(Math.sqrt(seats * 2)));
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

  return (
    <div ref={ref} className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1.3fr] md:items-stretch">
        {/* seats */}
        <div>
          <p className="eyebrow">{L.fees}</p>
          <div className="mt-3 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} aria-hidden>
            {Array.from({ length: seats }, (_, i) => (
              <i key={i} className="block aspect-square" style={{ background: i < filled ? "var(--value)" : "transparent", outline: "0.5px solid var(--rule-strong)", opacity: i < filled ? 0.85 : 1 }} />
            ))}
          </div>
          <p className="mono mt-3 text-[0.74rem]">
            {fee} IDLE × {seats}
          </p>
        </div>
        <span aria-hidden className="mono hidden self-center text-[var(--paper-dim)] md:block">→</span>
        {/* pool */}
        <div className="flex flex-col">
          <p className="eyebrow">{L.pool}</p>
          <div className="relative mt-3 min-h-[90px] flex-1 border border-[var(--rule-strong)]" aria-hidden>
            <div className="absolute inset-x-0 bottom-0 bg-[var(--value)]" style={{ height: `${poolK * 100}%`, opacity: 0.35 }} />
            <div className="absolute inset-x-0 border-t border-dashed border-[var(--hot)]" style={{ bottom: `${(1 - FACTS.rake) * 100}%` }} />
          </div>
          <p className="mono mt-3 text-[0.74rem]">
            <span className="text-[var(--value)]">{fmt(pool)} IDLE</span>
            <span className="text-[var(--paper-dim)]"> · {L.rake} {fmtPct(FACTS.rake)}</span>
          </p>
        </div>
        <span aria-hidden className="mono hidden self-center text-[var(--paper-dim)] md:block">→</span>
        {/* payouts */}
        <div>
          <p className="eyebrow">{L.payouts}</p>
          <ul className="mt-3 grid gap-2">
            {curve.map((p) => (
              <li key={p.from} className="mono grid grid-cols-[6.5em_1fr_5.5em] items-center gap-3 text-[0.72rem]">
                <span className="text-[var(--paper-dim)]">{L.rank(p.from, p.to)}</span>
                <span aria-hidden className="relative h-[8px] border border-[var(--rule-strong)]">
                  <span className="absolute inset-y-0 left-0 bg-[var(--value)]" style={{ width: `${p.pct * 100 * payK}%` }} />
                </span>
                <span className="text-right">
                  {fmtPct(p.pct)} · {fmt(pool * p.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
        {L.formula} · {c ? L.live : L.example}
      </p>
    </div>
  );
}
