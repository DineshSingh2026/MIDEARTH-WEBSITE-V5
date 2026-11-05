"use client";
import { GAMES } from "@/content/copy/games";
import { PageHero } from "@/components/ui/primitives";
import { useScene } from "@/three/registry";
import EnvSection from "./EnvSection";
import Fairness from "./Fairness";
import { GAMES_UI } from "./labels";

export default function GamesView() {
  useScene("games");
  const total = GAMES.envs.length + 1;
  return (
    <>
      <PageHero eyebrow={GAMES.eyebrow} title={GAMES.h1} sub={GAMES.sub}>
        <div className="grid gap-8 border-t border-[var(--rule)] pt-6 md:grid-cols-12">
          <p className="mono max-w-[64ch] text-[0.78rem] leading-relaxed text-[var(--paper-dim)] md:col-span-7">{GAMES.engine}</p>
          <nav aria-label={GAMES.eyebrow} className="md:col-span-4 md:col-start-9">
            <ul className="grid border-t border-[var(--rule)] md:border-t-0">
              {GAMES.envs.map((e, i) => (
                <li key={e.slug}>
                  <a
                    href={`#${e.slug}`}
                    className="group mono flex items-center justify-between gap-4 border-b border-[var(--rule)] py-3 text-[0.78rem] uppercase tracking-[0.12em] transition-colors hover:text-[var(--signal)]"
                  >
                    <span>
                      <span className="text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>&nbsp;&nbsp;{e.name}
                    </span>
                    <span aria-hidden className="transition-transform duration-500 group-hover:translate-y-0.5">↓</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </PageHero>
      {GAMES.envs.map((env, i) => (
        <EnvSection key={env.slug} env={env} i={i} total={total} />
      ))}
      <Fairness index={`${String(total).padStart(2, "0")} / ${String(total).padStart(2, "0")} — ${GAMES_UI.sectionFairness}`} />
    </>
  );
}
