"use client";
/**
 * Ecosystem stack — the 4 ECOSYSTEM layers as a clean vertical stack.
 * One token (an agent's activity) travels down the rail; each layer lights as it passes. 7s calm loop.
 * Reduced motion: global CSS collapses the animation to its final frame.
 */
import Link from "next/link";
import { ECOSYSTEM } from "@/content/site";
import { useUI } from "@/store/ui";
import { useScrub } from "@/components/v2/motion";
import { LAYER_LINKS, STATUS_TONE, conceptsOf } from "./data";

const GAP = 44; // px between layers (connector label lives here)
const DUR = 7; // s
const HITS = [0, 0.2667, 0.5333, 0.8]; // fraction of cycle the token reaches layer i
const LAYER_TONE = ["var(--agent)", "var(--frost)", "var(--signal)", "var(--value)"];

export default function EcosystemStack({ highlight }: { highlight?: string }) {
  const motion = useUI((s) => s.motion);
  // the four layers assemble into one stack as the section scrolls in (progress-linked, no pinning)
  const scrub = useScrub<HTMLDivElement>({ start: "top 90%", end: "center 50%" });
  return (
    <div ref={scrub} className="eco-scrub relative">
      <style>{`
        @keyframes pf-token { 0% { top: 0%; opacity: 0; background: var(--agent) } 4% { opacity: 1 } 55% { background: var(--signal) } 80% { top: 100%; opacity: 1; background: var(--value) } 92%, 100% { top: 100%; opacity: 0; background: var(--value) } }
        @keyframes pf-node { 0% { transform: scale(1.9); opacity: 1 } 18%, 100% { transform: scale(1); opacity: .55 } }
        @keyframes pf-panel { 0% { border-color: var(--pf-tone) } 22%, 100% { border-color: var(--rule) } }
      `}</style>
      <div className="grid grid-cols-[28px_1fr] gap-x-4 sm:grid-cols-[40px_1fr] sm:gap-x-6">
        {/* rail */}
        <div className="relative" aria-hidden>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `calc((100% - ${GAP * 3}px) / 8)`, bottom: `calc((100% - ${GAP * 3}px) / 8)` }}>
            <div className="eco-rail absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-[var(--agent)]/50 via-[var(--signal)]/40 to-[var(--value)]/60" />
            {HITS.map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--void)]"
                style={{ top: `${(i / 3) * 100}%`, borderColor: LAYER_TONE[i] }}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: LAYER_TONE[i], opacity: motion ? undefined : 0.55, animation: motion ? `pf-node ${DUR}s ease-out ${HITS[i] * DUR}s infinite` : undefined }}
                />
              </span>
            ))}
            {motion && (
              <span
                className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_16px_4px_color-mix(in_oklab,var(--signal)_45%,transparent)]"
                style={{ animation: `pf-token ${DUR}s linear infinite` }}
              />
            )}
          </div>
        </div>
        {/* layers */}
        <ol className="grid auto-rows-fr" style={{ rowGap: GAP }}>
          {ECOSYSTEM.layers.map((l, i) => {
            const items = conceptsOf(l.concepts);
            const isHi = !!highlight && (l.concepts as readonly string[]).includes(highlight);
            return (
              <li
                key={l.label}
                className="eco-layer relative flex flex-col justify-center rounded-2xl border bg-[var(--deck)] px-5 py-5 sm:px-6"
                style={
                  {
                    "--pf-tone": LAYER_TONE[i],
                    "--li": i,
                    borderColor: isHi ? LAYER_TONE[i] : "var(--rule)",
                    animation: motion && !highlight ? `pf-panel ${DUR}s ease-out ${HITS[i] * DUR}s infinite` : undefined,
                  } as React.CSSProperties
                }
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
                  <div className="min-w-0">
                    <p className="mono text-[0.68rem] tracking-[0.16em]" style={{ color: LAYER_TONE[i] }}>
                      LAYER {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1.5 text-[1.15rem] font-semibold leading-snug">{l.label}</h3>
                    <p className="mt-1 text-[0.86rem] leading-relaxed text-[var(--paper-dim)]">{l.sub}</p>
                  </div>
                  <ul className="flex shrink-0 flex-wrap gap-2 md:max-w-[52%] md:justify-end">
                    {items.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/platform/${c.slug}`}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8rem] transition-colors hover:border-[var(--paper-dim)] ${c.slug === highlight ? "border-[var(--paper)] bg-[var(--deck-raise)] text-[var(--paper)]" : "border-[var(--rule-strong)] text-[var(--paper)]/90"}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_TONE[c.status] }} />
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {i < 3 && (
                  <p className="mono absolute left-0 top-full flex items-center gap-2 text-[0.68rem] tracking-[0.04em] text-[var(--paper-dim)]" style={{ height: GAP }}>
                    <span aria-hidden>↓</span>
                    {LAYER_LINKS[i]}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
