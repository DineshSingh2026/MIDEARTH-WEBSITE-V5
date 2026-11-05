"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HOME } from "@/content/copy/home";
import { FACTS, hasShapes } from "@/content/facts";
import { SectionIndex } from "@/components/ui/primitives";
import { fmtClock } from "@/lib/arena/client";
import { frameState } from "@/three/registry";
import { advanceArena, arenaIdleMs, getArena } from "@/three/home/arena";
import { useUI } from "@/store/ui";
import { useJourney, clamp01 } from "./useJourney";

const TensorView = dynamic(() => import("@/components/sim/TensorView"), { ssr: false });
const TerritoryCanvas = dynamic(() => import("@/components/sim/TerritoryCanvas"), { ssr: false });
const FoodCanvas = dynamic(() => import("@/components/sim/FoodCanvas"), { ssr: false });

const TILES = FACTS.grid.w * FACTS.grid.h;

/** S4 — the core. The 3D arena (same sim instance) glows in the cavity; this is its HUD + the agent's-eye toggle. */
export default function CoreSection() {
  const motion = useUI((s) => s.motion);
  const [tensor, setTensor] = useState(false);
  const [inView, setInView] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLParagraphElement>(null);
  const [rank, setRank] = useState<{ id: number; color: string; tiles: number }[]>([]);
  const sim = getArena();

  useJourney((j) => {
    const v = j > 2.85 && j < 4.1;
    setInView((x) => (x === v ? x : v));
    if (panel.current && useUI.getState().motion) panel.current.style.opacity = String(clamp01((j - 2.95) / 0.12) * (1 - clamp01((j - 3.86) / 0.12)));
  });

  useEffect(() => {
    frameState.signals.tensor = tensor ? 1 : 0;
    return () => {
      frameState.signals.tensor = 0;
    };
  }, [tensor]);

  // 10Hz HUD; if no WebGL scene is stepping the sim, step it here
  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const id = setInterval(() => {
      if (motion && arenaIdleMs() > 400) advanceArena(0.1);
      const s = getArena();
      if (hud.current) hud.current.textContent = `MATCH ${fmtClock(Math.floor(s.timeSec))} / ${FACTS.matchLengthSec}s · TICK ${s.tick} · TILES CLAIMED ${s.claimed}/${TILES}`;
      if (n++ % 5 === 0) setRank(s.ranking().slice(0, 5));
    }, 100);
    return () => clearInterval(id);
  }, [inView, motion]);

  return (
    <section data-home-section="4" aria-labelledby="core-title" className="relative">
      <div className={motion ? "relative" : ""} style={{ height: motion ? "240svh" : undefined }}>
        <div className={`${motion ? "sticky top-0 h-[100svh]" : "py-28"} flex items-center overflow-hidden`}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--void) 86%, transparent) 0%, color-mix(in oklab, var(--void) 40%, transparent) 40%, transparent 60%)" }} />
          <div ref={panel} className="shell relative grid w-full gap-10 lg:grid-cols-[minmax(0,520px)_1fr]" style={{ opacity: motion ? 0 : 1 }}>
            <div>
              <SectionIndex>{HOME.core.index}</SectionIndex>
              <h2 id="core-title" className="display display-l mt-6 max-w-[14ch]">
                {HOME.core.title}
              </h2>
              <p className="mt-6 max-w-[48ch] text-[0.98rem] leading-[1.6] text-[var(--paper-dim)] md:text-[1.05rem]">{HOME.core.body}</p>

              <div className="ticks mt-8 border border-[var(--rule)] bg-[color-mix(in_oklab,var(--void)_70%,transparent)] p-4">
                <p ref={hud} className="mono text-[0.68rem] tracking-[0.08em] text-[var(--paper)]" aria-live="off">
                  MATCH 00:00 / {FACTS.matchLengthSec}s · TICK 0 · TILES CLAIMED 0/{TILES}
                </p>
                <p className="mono mt-1 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
                  accelerated ×{Math.round(FACTS.matchLengthSec / FACTS.heroLoopSec)} · {FACTS.tickRateHz} ticks/s · visualisation
                </p>
                <ol className="mono mt-3 grid gap-1 text-[0.68rem]">
                  {rank.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <span className="w-5 text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                      <i className="inline-block h-2 w-2" style={{ background: r.color }} />
                      <span className="text-[var(--paper-dim)]">AGENT {String(r.id + 1).padStart(2, "0")}</span>
                      <span className="ml-auto tabular-nums">{r.tiles}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setTensor((t) => !t)}
                aria-pressed={tensor}
                className="mono mt-6 inline-flex items-center gap-3 border border-[var(--agent)] px-4 py-2.5 text-[0.74rem] uppercase tracking-[0.14em] text-[var(--agent)] transition-colors hover:bg-[color-mix(in_oklab,var(--agent)_14%,transparent)]"
              >
                <span className="inline-block h-2 w-2 border border-current" style={{ background: tensor ? "currentColor" : "transparent" }} aria-hidden />
                {tensor ? HOME.core.buttonBack : HOME.core.button}
              </button>
            </div>

            <div className="relative flex min-h-[200px] items-center justify-center">
              {tensor && (
                <div className="w-full max-w-[560px] bg-[color-mix(in_oklab,var(--void)_55%,transparent)] p-2">
                  <TensorView sim={sim} agentId={0} />
                </div>
              )}
              {!tensor && <p className="sr-only">{HOME.core.caption}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* two environments live */}
      <div className="shell relative pb-28 pt-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0" style={{ background: "linear-gradient(0deg, color-mix(in oklab, var(--void) 70%, transparent), transparent)" }} />
        <p className="eyebrow relative">{HOME.core.envTitle}</p>
        <div className="relative mt-6 grid gap-5 md:grid-cols-2">
          {FACTS.games.filter(hasShapes).map((g) => (
            <Link key={g.slug} href="/games" className="ticks group block border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_80%,transparent)] transition-colors hover:border-[var(--rule-strong)]">
              <div className="relative aspect-[16/9] overflow-hidden border-b border-[var(--rule)]">
                {g.slug === "territorycontrol" ? (
                  <TerritoryCanvas seed={11} agents={8} accelerated hud={false} paused={!motion} className="absolute inset-0" />
                ) : (
                  <FoodCanvas seed={5} agents={8} accelerated hud={false} paused={!motion} className="absolute inset-0" />
                )}
              </div>
              <div className="flex items-end justify-between gap-4 p-5">
                <div>
                  <h3 className="display display-m">{g.name}</h3>
                  <p className="mono mt-2 text-[0.66rem] text-[var(--paper-dim)]">
                    {g.input} → {g.output} · {g.format}
                  </p>
                </div>
                <span className="mono text-[0.8rem] text-[var(--paper-dim)] transition-transform duration-500 group-hover:translate-x-1 group-hover:text-[var(--paper)]">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
