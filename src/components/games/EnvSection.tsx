"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { GAMES } from "@/content/copy/games";
import { FACTS } from "@/content/facts";
import { Card, Reveal, SectionIndex, StatusTag } from "@/components/ui/primitives";
import { useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { GAMES_UI } from "./labels";
import { FOOD_DEMOS, TERRITORY_DEMOS, TieBreak } from "./RuleDemos";
import PrizeFlow from "./PrizeFlow";

const TerritoryCanvas = dynamic(() => import("@/components/sim/TerritoryCanvas"), { ssr: false });
const FoodCanvas = dynamic(() => import("@/components/sim/FoodCanvas"), { ssr: false });

type Env = (typeof GAMES.envs)[number];

function LivePools({ env }: { env: Env }) {
  const contests = useArenaStore((s) => s.contests);
  const source = useArenaStore((s) => s.sources.contests);
  const mine = useMemo(
    () => contests.filter((c) => c.status === "open" && (c.game_slug === env.slug || (c.game_name ?? "").toLowerCase() === env.name.toLowerCase())),
    [contests, env.slug, env.name],
  );
  const fees = [...new Set(mine.map((c) => c.entry_fee))].sort((a, b) => a - b);
  const seats = [...new Set(mine.map((c) => c.max_slots))].sort((a, b) => a - b);
  const filled = mine.reduce((a, c) => a + c.filled_slots, 0);
  const cap = mine.reduce((a, c) => a + c.max_slots, 0);
  const live = source === "live";

  return (
    <div className="grid gap-4">
      <p className="text-[var(--paper-dim)]">{env.pool}</p>
      {live && mine.length > 0 ? (
        <dl className="mono grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)] text-[0.74rem] sm:grid-cols-4">
          {[
            [GAMES_UI.liveOpen, String(mine.length)],
            [GAMES_UI.liveFees, `${fees.join(" / ")} IDLE`],
            [GAMES_UI.liveSeats, seats.join(" / ")],
            [GAMES_UI.liveFilled, `${filled}/${cap}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-[var(--deck)] px-3 py-3">
              <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{k}</dt>
              <dd className="mt-1 text-[var(--paper)]">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        live && <p className="mono text-[0.74rem] text-[var(--paper-dim)]">{GAMES_UI.liveNone}</p>
      )}
      <p className="mono flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        <i className="led" style={{ width: 5, height: 5, color: live ? "var(--signal)" : "var(--paper-dim)" }} />
        {live ? GAMES_UI.liveSource : GAMES_UI.staticSource}
      </p>
    </div>
  );
}

function Tensor({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="eyebrow w-[4.5rem]">{k}</span>
      <span className="mono border border-[var(--rule-strong)] bg-[var(--void)] px-2.5 py-1 text-[0.76rem] text-[var(--agent)]">{v}</span>
    </div>
  );
}

export default function EnvSection({ env, i, total }: { env: Env; i: number; total: number }) {
  const motion = useUI((s) => s.motion);
  const [fast, setFast] = useState(false);
  const [paused, setPaused] = useState(false);
  const isTerritory = env.slug === "territorycontrol";
  const demos = isTerritory ? TERRITORY_DEMOS : FOOD_DEMOS;
  const Demo = (k: number) => {
    const D = demos[k];
    return D ? <D /> : null;
  };
  const facts = FACTS.games.find((g) => g.slug === env.slug) ?? FACTS.games[i];
  const idx = `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")} — ${env.name.toUpperCase()}`;

  return (
    <section id={env.slug} className="relative scroll-mt-24 pt-24 md:pt-36" aria-labelledby={`${env.slug}-title`}>
      <div className="shell">
        <div className="flex items-center justify-between gap-4 border-t border-[var(--rule)] pt-6">
          <SectionIndex>{idx}</SectionIndex>
          <StatusTag status={env.status} />
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal as="h2" width className="display display-xl lg:col-span-7">
            <span id={`${env.slug}-title`}>{env.name}</span>
          </Reveal>
          <Reveal as="p" delay={120} className="max-w-[46ch] text-[1.05rem] text-[var(--paper-dim)] lg:col-span-5 lg:pb-2">
            {env.lead}
          </Reveal>
        </div>
      </div>

      {/* full-bleed live sim */}
      <div className="relative mt-14 border-y border-[var(--rule)] md:mt-20">
        {isTerritory ? (
          <TerritoryCanvas
            seed={7}
            agents={14}
            accelerated={fast}
            paused={paused}
            className="h-[min(100vw,92vh)] min-h-[420px] w-full"
          />
        ) : (
          <FoodCanvas seed={11} agents={10} accelerated={fast} paused={paused} className="h-[min(64vw,86vh)] min-h-[400px] w-full" />
        )}
        <div className="shell pointer-events-none absolute inset-x-0 bottom-3 flex justify-end md:bottom-4">
          <div className="pointer-events-auto mono flex gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)] text-[0.62rem] uppercase tracking-[0.14em]">
            {motion && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                className="bg-[var(--deck)] px-3 py-2 text-[var(--paper)] hover:bg-[var(--deck-raise)]"
              >
                {paused ? GAMES_UI.play : GAMES_UI.pause}
              </button>
            )}
            {[false, true].map((f) => (
              <button
                key={String(f)}
                type="button"
                onClick={() => setFast(f)}
                aria-pressed={fast === f}
                className="px-3 py-2 hover:bg-[var(--deck-raise)]"
                style={{ background: fast === f ? "var(--paper)" : "var(--deck)", color: fast === f ? "var(--void)" : "var(--paper-dim)" }}
              >
                {f ? GAMES_UI.speed3 : GAMES_UI.speed1}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="shell mono mt-3 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{GAMES_UI.simNote}</p>

      <div className="shell mt-16 grid gap-16 md:mt-24 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h3 className="eyebrow">{GAMES_UI.rules}</h3>
          <ol className="mt-6 border-t border-[var(--rule)]">
            {env.rules.map((r, k) => (
              <li key={k} className="grid grid-cols-[3.2rem_1fr] gap-4 border-b border-[var(--rule)] py-6 sm:grid-cols-[3.2rem_1fr_minmax(150px,200px)] sm:gap-6">
                <span className="mono pt-[3px] text-[0.72rem] text-[var(--paper-dim)]">{`${String(k + 1).padStart(2, "0")} / ${String(env.rules.length).padStart(2, "0")}`}</span>
                <span className="max-w-[56ch]">{r}</span>
                <span className="col-start-2 sm:col-start-3">{Demo(k)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid content-start gap-12 lg:col-span-5 lg:col-start-8">
          <div>
            <h3 className="eyebrow">{GAMES_UI.match}</h3>
            <p className="mono mt-4 border-t border-[var(--rule)] pt-4 text-[0.86rem]">{env.match}</p>
            <div className="mt-5 max-w-[220px]">
              <TieBreak />
            </div>
          </div>
          <div>
            <h3 className="eyebrow">{GAMES_UI.pool}</h3>
            <div className="mt-4 border-t border-[var(--rule)] pt-4">
              <LivePools env={env} />
            </div>
          </div>
          <Card className="p-6 lg:col-span-full">
            <div className="flex items-center justify-between gap-3">
              <h3 className="eyebrow">{GAMES_UI.model}</h3>
              <StatusTag status={env.status} />
            </div>
            <div className="mt-6 grid gap-3">
              <Tensor k={GAMES_UI.input} v={env.input} />
              <Tensor k={GAMES_UI.output} v={env.output} />
              <Tensor k={GAMES_UI.format} v={facts.format} />
            </div>
          </Card>
        </div>
        <div className="border-t border-[var(--rule)] pt-8 lg:col-span-12">
          <PrizeFlow slug={env.slug} />
        </div>
      </div>
    </section>
  );
}
