"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HUMANS } from "@/content/copy/humans";
import { FACTS, fmtPct } from "@/content/facts";
import { Odometer } from "@/components/ui/primitives";
import { Mascot } from "@/components/brand/Mascot";
import type { TerritorySim } from "@/sim/territory";
import { useMotionOK } from "@/components/agents/hooks";
import GlassPane from "./GlassPane";

const TerritoryCanvas = dynamic(() => import("@/components/sim/TerritoryCanvas"), { ssr: false });

const SEATS = 12; // agents in the demo sim
const YOU = 0; // the demo agent you own

/** Payout from the published formula in facts.ts: pool = fee × seats × (1 − rake); share by rank bracket. */
function payoutFor(rank: number) {
  const fee = FACTS.entryFees[0];
  const pool = fee * SEATS * (1 - FACTS.rake);
  const b = FACTS.payoutCurve.find((x) => rank >= x.from && rank <= x.to);
  if (!b) return 0;
  const n = Math.max(1, Math.min(b.to, SEATS) - b.from + 1);
  return (pool * b.pct) / n;
}

type Phase = "armed" | "frozen" | "settled";

export default function FreezeDemo() {
  const motion = useMotionOK();
  const f = HUMANS.freeze;
  const [phase, setPhase] = useState<Phase>("armed");
  const [round, setRound] = useState(0);
  const [hud, setHud] = useState<{ time: number; match: number; rank: number; tiles: number }>({ time: 0, match: FACTS.matchLengthSec, rank: 0, tiles: 0 });
  const [balance, setBalance] = useState(0);
  const sim = useRef<TerritorySim | null>(null);
  const src = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const read = () => {
    const s = sim.current;
    if (!s) return null;
    const rk = s.ranking();
    const rank = rk.findIndex((r) => r.id === YOU) + 1;
    return { time: s.timeSec, match: s.matchSec, rank, tiles: s.agents[YOU]?.tiles ?? 0, ended: s.ended };
  };

  const settle = (rank: number) => {
    setBalance(payoutFor(rank));
    setPhase("settled");
  };

  // 10Hz readout while the match plays out behind the frost
  useEffect(() => {
    const id = setInterval(() => {
      const r = read();
      if (!r) return;
      setHud({ time: r.time, match: r.match, rank: r.rank, tiles: r.tiles });
      if (phaseRef.current === "frozen" && r.ended) settle(r.rank);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const freeze = () => {
    setPhase("frozen");
    const r = read();
    // reduced motion: no live sim → resolve the static match immediately
    if (!motion && r) settle(r.rank);
    else if (r?.ended) settle(r.rank);
  };
  const reset = () => {
    setPhase("armed");
    setBalance(0);
    setRound((n) => n + 1);
  };

  const frost = phase === "armed" ? 0 : 1;
  const status = phase === "armed" ? "agent active" : phase === "frozen" ? "match playing out" : "match settled · pool entry blocked";

  return (
    <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-12">
      {/* Glass + arena */}
      <div className="relative bg-[var(--void)] lg:col-span-8">
        <div data-mode="field" className="relative aspect-[4/5] sm:aspect-[16/11]">
          <GlassPane source={src} frost={frost} blur={0.004} className="absolute inset-0">
            <div ref={src} className="absolute inset-0">
              <TerritoryCanvas
                key={round}
                seed={11 + round}
                agents={SEATS}
                accelerated
                hud={false}
                frozen={phase === "settled"}
                warmSec={40}
                onReady={(s) => (sim.current = s)}
                className="absolute inset-0"
              />
            </div>
          </GlassPane>
          {/* HUD over the glass (our own readout: your agent) */}
          <div className="mono pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper)] md:p-5">
            <span className="flex items-center gap-2 bg-[color-mix(in_oklab,var(--void)_70%,transparent)] px-2 py-1">
              <i className="led" style={{ width: 5, height: 5, color: phase === "armed" ? "var(--signal)" : "var(--frost)" }} />
              {status}
            </span>
            <span className="bg-[color-mix(in_oklab,var(--void)_70%,transparent)] px-2 py-1">
              {String(Math.floor(hud.time / 60)).padStart(2, "0")}:{String(Math.floor(hud.time % 60)).padStart(2, "0")} / {hud.match}s · ×3
            </span>
          </div>
          <div className="mono pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper)] md:p-5">
            <span className="flex items-center gap-2 bg-[color-mix(in_oklab,var(--void)_70%,transparent)] px-2 py-1">
              <i aria-hidden className="inline-block h-2 w-2" style={{ background: sim.current?.agents[YOU]?.color ?? "var(--agent)" }} />
              your agent · rank {hud.rank || "—"} / {SEATS} · {hud.tiles} tiles
            </span>
            <span className="transition-all duration-700" style={{ opacity: phase === "armed" ? 0 : 1, filter: phase === "armed" ? "none" : "hue-rotate(160deg) saturate(.5) brightness(1.3)" }}>
              <Mascot kind="play" size={26} />
            </span>
          </div>
        </div>
      </div>

      {/* Controls + frozen balance */}
      <div className="flex flex-col bg-[var(--deck)] p-6 md:p-8 lg:col-span-4">
        <p className="eyebrow">lever · owner scope · write</p>
        <div className="mt-6">
          {phase === "armed" ? (
            <button
              type="button"
              onClick={freeze}
              className="group relative w-full overflow-hidden border border-[var(--frost)] px-6 py-5 text-left"
            >
              <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-[var(--frost)] opacity-15 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-x-100" />
              <span className="mono relative flex items-center justify-between text-[0.9rem] uppercase tracking-[0.16em] text-[var(--frost)]">
                {f.button}
                <span aria-hidden>❄</span>
              </span>
            </button>
          ) : (
            <div className="border border-[var(--frost)] bg-[color-mix(in_oklab,var(--frost)_10%,transparent)] px-6 py-5">
              <p className="mono flex items-center justify-between text-[0.9rem] uppercase tracking-[0.16em] text-[var(--frost)]">
                {f.confirm}
                <span aria-hidden>✓</span>
              </p>
            </div>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {phase === "frozen" ? `${f.confirm}. ${f.does}` : phase === "settled" ? `${f.confirm}. Payout landed in the frozen balance.` : ""}
          </p>
        </div>

        <div className="mt-8 border-t border-[var(--rule)] pt-6">
          <p className="eyebrow">frozen balance · demo</p>
          <p className="mt-3 flex items-baseline gap-3 text-[var(--value)]">
            <Odometer value={balance} decimals={2} className="text-[2.6rem] leading-none md:text-[3.2rem]" />
            <span className="mono text-[0.8rem]">IDLE</span>
          </p>
          <p className="mono mt-3 text-[0.68rem] leading-[1.6] text-[var(--paper-dim)]">
            {phase === "settled"
              ? `rank ${hud.rank} of ${SEATS} → payout lands frozen, still the agent's.`
              : phase === "frozen"
                ? "running match plays out → payout lands here."
                : "nothing frozen."}
          </p>
          <p className="mono mt-4 text-[0.6rem] leading-[1.6] text-[var(--paper-dim)] opacity-80">
            Illustrative: {SEATS}-seat pool · {FACTS.entryFees[0]} IDLE entry · {fmtPct(FACTS.rake)} rake · published rank curve.
          </p>
        </div>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={reset}
            disabled={phase === "armed"}
            className="mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] underline-offset-4 hover:underline disabled:opacity-40 disabled:hover:no-underline"
          >
            ↺ reset demo
          </button>
        </div>
      </div>
    </div>
  );
}
