"use client";
import { ARENA } from "@/content/site";
import { FACTS } from "@/content/facts";
import { FadeIn, Section, SectionHeader } from "@/components/v2/kit";
import TerritoryCanvas from "@/components/sim/TerritoryCanvas";
import FoodCanvas from "@/components/sim/FoodCanvas";
import SignalCanvas from "@/components/sim/SignalCanvas";
import SignalSpotlight from "./SignalSpotlight";
import { useArenaStore } from "@/lib/arena/client";
import { Tag } from "./shared";

/** #games: two live games plus Signal (coming next), each with a rules simulation. */
export default function GamesSection() {
  const contests = useArenaStore((s) => s.contests);
  const src = useArenaStore((s) => s.sources.contests);
  const apiGames = useArenaStore((s) => s.games);
  return (
    <Section id="games" tone="deck" bg="territory">
      <SectionHeader
        eyebrow="THE GAMES"
        title="Real-time physics games."
        lead={`Territory Control and Food Collector are live, and Signal is next. Live matches run ${FACTS.matchLengthSec} seconds. Each game publishes a locked ${FACTS.games[0].format} architecture, so every agent sees the same observation and answers with the same action vector.`}
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ARENA.games.map((g, i) => {
          const slug = g.slug;
          // a game counts as live once the arena API lists it as enabled (or the site marks it LIVE)
          const live = g.status === "LIVE" || apiGames.some((a) => a.slug === slug && a.enabled);
          const open = contests.filter((c) => c.game_slug === slug && c.status === "open");
          const fees = [...new Set(open.map((c) => c.entry_fee))].sort((a, b) => a - b);
          return (
            <FadeIn key={g.name} delay={i * 100} className={`h-full ${i === 2 ? "md:col-span-2 lg:col-span-1" : ""}`}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--void)]">
                <div className="relative h-[260px] border-b border-[var(--rule)] sm:h-[340px]" data-mode="field">
                  {slug === "territorycontrol" ? (
                    <TerritoryCanvas accelerated hud={false} seed={7} agents={12} className="h-full w-full" />
                  ) : slug === "foodcollector" ? (
                    <FoodCanvas accelerated hud={false} seed={11} agents={10} className="h-full w-full" />
                  ) : (
                    <SignalCanvas seed={5} agents={6} className="h-full w-full" />
                  )}
                  <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-[var(--void)]/85">
                    <Tag>{slug === "signal" ? "Simulation · illustrative" : "Simulation · accelerated ×3"}</Tag>
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[1.4rem] font-semibold">{g.name}</h3>
                    {!live ? (
                      <Tag tone="value">coming next · no pools yet</Tag>
                    ) : src === "pending" ? (
                      <Tag>checking pools…</Tag>
                    ) : open.length ? (
                      <Tag tone="signal">
                        {open.length} open {open.length === 1 ? "pool" : "pools"} · entry {fees.join(" / ")}
                      </Tag>
                    ) : (
                      <Tag>no open pool right now</Tag>
                    )}
                  </div>
                  <p className="mt-3 max-w-[62ch] text-[0.95rem] leading-relaxed text-[var(--paper-dim)]">{g.body}</p>
                  {g.input && g.output ? (
                    <dl className="mt-auto grid grid-cols-2 gap-x-5 gap-y-4 pt-6 sm:grid-cols-3 lg:grid-cols-2">
                      <Shape k="Input" v={g.input} />
                      <Shape k="Output" v={g.output} />
                      <Shape k="Model" v={`${FACTS.games[i]?.format ?? "ONNX"}: locked base`} wide />
                    </dl>
                  ) : (
                    <dl className="mt-auto grid grid-cols-2 gap-x-5 gap-y-4 pt-6 sm:grid-cols-3 lg:grid-cols-2">
                      <Info k="Model" v="ONNX policy" />
                      <Info k="Local test" v="NumPy test mode" />
                      <Info k="Shapes" v="publish with the game" wide />
                    </dl>
                  )}
                </div>
              </article>
            </FadeIn>
          );
        })}
      </div>
      <p className="mt-6 text-[0.8rem] text-[var(--paper-dim)]">Previews are visual reproductions of the published rules, not the production engine and not live matches. Territory Control and Food Collector play at ×3; the Signal preview is illustrative.</p>
      <SignalSpotlight className="mt-16 md:mt-20" />
    </Section>
  );
}

function Info({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 border-t border-[var(--rule)] pt-3 ${wide ? "col-span-2 sm:col-span-1 lg:col-span-2" : ""}`}>
      <dt className="text-[0.75rem] text-[var(--paper-dim)] md:text-[0.7rem]">{k}</dt>
      <dd className="mono mt-1 text-[0.72rem] leading-snug text-[var(--agent)]">{v}</dd>
    </div>
  );
}

function Shape({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  const [name, shape] = v.split(/:s*/);
  return (
    <div className={`min-w-0 border-t border-[var(--rule)] pt-3 ${wide ? "col-span-2 sm:col-span-1 lg:col-span-2" : ""}`}>
      <dt className="text-[0.75rem] text-[var(--paper-dim)] md:text-[0.7rem]">{k}</dt>
      <dd className="mono mt-1 text-[0.72rem] leading-snug">
        <span className="block break-words text-[var(--paper-dim)]">
          {name.split("_").map((part, j) => (
            <span key={j}>
              {j > 0 && (
                <>
                  _<wbr />
                </>
              )}
              {part}
            </span>
          ))}
        </span>
        <span className="block text-[var(--agent)]">{shape}</span>
      </dd>
    </div>
  );
}
