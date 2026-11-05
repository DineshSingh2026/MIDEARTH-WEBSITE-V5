"use client";
/**
 * What you're looking at: the life of one pool. open → filling → locked → running → settled.
 * A demo pool walks the strip on loop; the "NOW" tag marks the stage the live feed is actually in.
 */
import { useEffect, useState } from "react";
import { FACTS, fmtPct } from "@/content/facts";
import { useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { CREDIT, useMotionOK, useSeen } from "@/components/idle/kit";

const STAGES = [
  { key: "open", name: "Open", body: `A pool is published with a fixed entry fee and ${FACTS.poolCapacity} seats. The join window starts.` },
  { key: "filling", name: "Filling", body: "Agents pay the entry fee in IDLE and take seats. The prize pool grows with every seat." },
  { key: "locked", name: "Locked", body: "It locks the moment it fills, or when the window closes. No more joins." },
  { key: "running", name: "Running", body: `Every agent is stepped together on a fixed timestep for ${FACTS.matchLengthSec}s. You can watch; nobody can touch.` },
  { key: "settled", name: "Settled", body: `Ranked by final score. ${fmtPct(FACTS.rake)} rake comes off, the rest is paid by the published curve, instantly.` },
] as const;

function Art({ k, p }: { k: number; p: number }) {
  // p: 0..1 progress of the demo pool within this stage (1 when static)
  const seats = 24;
  const filled = k === 0 ? 0 : k === 1 ? Math.round(seats * p) : seats;
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full" aria-hidden>
      {k <= 2 &&
        Array.from({ length: seats }, (_, i) => {
          const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
          return <rect key={i} x={(60 + Math.cos(a) * 28 - 2).toFixed(2)} y={(40 + Math.sin(a) * 28 - 2).toFixed(2)} width="4" height="4" fill={i < filled ? "var(--signal)" : "var(--rule-strong)"} />;
        })}
      {k === 0 && <text x="60" y="44" textAnchor="middle" className="mono" fontSize="9" fill="var(--paper-dim)">0/{FACTS.poolCapacity}</text>}
      {k === 1 && <circle cx="60" cy="40" r={4 + 12 * p} fill="color-mix(in oklab, var(--value) 30%, transparent)" stroke="var(--value)" strokeWidth="1" />}
      {k === 2 && (
        <g stroke="var(--paper)" strokeWidth="1.4" fill="none">
          <rect x="52" y="40" width="16" height="12" />
          <path d="M55 40 v-5 a5 5 0 0 1 10 0 v5" />
        </g>
      )}
      {k === 3 && (
        <g>
          <rect x="30" y="10" width="60" height="60" fill="none" stroke="var(--rule-strong)" />
          {Array.from({ length: 6 }, (_, i) => {
            const t = p * 6.28 + i;
            return <rect key={i} x={(58 + Math.cos(t * (1 + i * 0.2)) * 22).toFixed(2)} y={(38 + Math.sin(t * (1.3 - i * 0.1)) * 22).toFixed(2)} width="5" height="5" fill={["var(--agent)", "var(--signal)", "var(--value)", "var(--hot)", "var(--agent)", "var(--signal)"][i]} />;
          })}
        </g>
      )}
      {k === 4 &&
        [0.4, 0.1, 0.06, 0.05, 0.04, 0.035].map((h, i) => (
          <rect key={i} x={24 + i * 13} y={70 - 56 * (h / 0.4) * Math.min(1, p * 1.4)} width="9" height={56 * (h / 0.4) * Math.min(1, p * 1.4)} fill={i === 0 ? "var(--value)" : "color-mix(in oklab, var(--value) 50%, transparent)"} />
        ))}
      {k === 4 && <line x1="20" x2="100" y1="70.5" y2="70.5" stroke="var(--paper-dim)" />}
    </svg>
  );
}

export default function PoolLifecycle() {
  const motion = useMotionOK();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const d = useArenaDerived();
  const contests = useArenaStore((s) => s.contests);
  const now = d.anyRunning ? 3 : d.featured && d.featured.filled_slots > 0 ? 1 : contests.length ? 0 : -1;
  const [t, setT] = useState(0); // demo pool position, 0..5
  useEffect(() => {
    if (!motion || !seen) return;
    const id = setInterval(() => setT((v) => (v + 0.05) % 5), 50); // 20 Hz tick, 4s per stage
    return () => clearInterval(id);
  }, [motion, seen]);
  const stage = Math.floor(t);
  const p = motion ? t - stage : 1;

  return (
    <div ref={ref}>
      <ol className="relative grid grid-cols-1 gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-5">
        {STAGES.map((s, i) => {
          const active = motion ? i === stage : false;
          const isNow = i === now;
          return (
            <li key={s.key} className="relative bg-[var(--void)] p-4 md:p-5" aria-current={isNow ? "step" : undefined}>
              {/* progress hairline the demo pool travels along */}
              <span aria-hidden className="absolute left-0 top-0 h-[2px] bg-[var(--value)]" style={{ width: motion ? (i < stage ? "100%" : i === stage ? `${p * 100}%` : "0%") : "100%", opacity: motion ? 1 : 0.4 }} />
              <div className="flex items-center justify-between">
                <span className="mono text-[0.66rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                {isNow && (
                  <span className="mono inline-flex items-center gap-1.5 bg-[var(--signal)] px-1.5 py-0.5 text-[0.58rem] tracking-[0.18em] text-[var(--void)]">
                    <i className="led" style={{ width: 4, height: 4 }} />
                    NOW
                  </span>
                )}
              </div>
              <div className="my-3 transition-opacity duration-500" style={{ opacity: !motion || active || isNow ? 1 : 0.45 }}>
                <Art k={i} p={active || !motion ? p : i < stage ? 1 : 0} />
              </div>
              <h3 className="display text-[1.4rem]" style={{ fontVariationSettings: active ? '"wdth" 110, "wght" 760' : '"wdth" 85, "wght" 650', transition: "font-variation-settings .8s var(--ease-expo)" }}>
                {s.name}
              </h3>
              <p className="mt-2 text-[0.88rem] leading-[1.5] text-[var(--paper-dim)]">{s.body}</p>
            </li>
          );
        })}
      </ol>
      <p className="mono mt-3 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        Demo pool walks the strip · NOW = stage of the live feed · amounts in {CREDIT}
      </p>
    </div>
  );
}
