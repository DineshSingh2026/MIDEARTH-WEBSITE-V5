"use client";
import { useId, useState } from "react";
import { HOME } from "@/content/copy/home";
import { Mascot, type MascotKind } from "@/components/brand/Mascot";
import { Btn } from "@/components/ui/primitives";
import { RegMark, Section, SectionHead, useMotionOK } from "./shared";

const M = HOME.minds;
/** Diagram space 1000 × 600. EXEC above, three minds below. */
const POS: Record<string, [number, number]> = {
  exec: [500, 118],
  play: [170, 468],
  track: [500, 468],
  funds: [830, 468],
};
const LANE = 9; // horizontal separation of command / report lanes

function lanePath(cx: number, o: number) {
  const x0 = 500 + o;
  const x1 = cx + o;
  return `M ${x0} 190 C ${x0} 300, ${x1} 300, ${x1} 398`;
}

export default function S5Minds() {
  const motion = useMotionOK();
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<string | null>(null);
  const children = M.nodes.filter((n) => n.key !== "exec");
  const activeNode = M.nodes.find((n) => n.key === active) ?? null;

  const laneOpacity = (k: string) => (active == null || active === "exec" || active === k ? 1 : 0.18);

  return (
    <Section n={5} labelledBy="s5-title" className="py-28 md:py-40">
      <div className="shell relative">
        <RegMark className="-left-1 -top-10 hidden md:block" />
        <div className="grid gap-12 lg:grid-cols-12">
          <SectionHead id="s5-title" index={M.index} title={M.title} body={M.body} className="lg:col-span-5" />
          <div className="flex items-end lg:col-span-7 lg:justify-end">
            <Btn href={M.link.href} variant="ghost">
              {M.link.label}
            </Btn>
          </div>
        </div>

        {/* Chain of command diagram */}
        <div className="relative mx-auto mt-16 w-full max-w-[1120px] md:mt-24" onMouseLeave={() => setActive(null)}>
          <div className="relative aspect-[1000/600] w-full">
            <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                <marker id={`${uid}-ad`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0 0 L8 4 L0 8" fill="none" stroke="var(--agent)" strokeWidth="1.2" />
                </marker>
                <marker id={`${uid}-au`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0 L8 4 L0 8" fill="none" stroke="var(--signal)" strokeWidth="1.2" />
                </marker>
              </defs>
              {/* bus rule under EXEC */}
              <line x1="120" y1="300" x2="880" y2="300" stroke="var(--rule-strong)" strokeDasharray="2 6" strokeWidth="1" />
              {children.map((c) => {
                const [cx] = POS[c.key];
                const dId = `${uid}-d-${c.key}`;
                const uId = `${uid}-u-${c.key}`;
                const op = laneOpacity(c.key);
                return (
                  <g key={c.key} style={{ opacity: op, transition: "opacity .6s var(--ease-expo)" }}>
                    <path id={dId} d={lanePath(cx, -LANE)} fill="none" stroke="var(--agent)" strokeOpacity="0.55" strokeWidth="1" markerEnd={motion ? undefined : `url(#${uid}-ad)`} />
                    <path id={uId} d={lanePath(cx, LANE)} fill="none" stroke="var(--signal)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="1 4" markerStart={motion ? undefined : `url(#${uid}-au)`} />
                    {motion &&
                      [0, 1].map((i) => (
                        <g key={`d${i}`}>
                          <circle r="7" fill="var(--agent)" opacity="0.16" />
                          <circle r="2.6" fill="var(--agent)" />
                          <animateMotion dur="2.6s" begin={`${i * 1.3 + (cx % 7) * 0.11}s`} repeatCount="indefinite" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0 0.55 1">
                            <mpath href={`#${dId}`} />
                          </animateMotion>
                        </g>
                      ))}
                    {motion &&
                      [0, 1, 2].map((i) => (
                        <g key={`u${i}`}>
                          <rect x="-2.2" y="-2.2" width="4.4" height="4.4" fill="var(--signal)" />
                          <animateMotion dur="1.9s" begin={`${i * 0.63 + (cx % 5) * 0.17}s`} repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                            <mpath href={`#${uId}`} />
                          </animateMotion>
                        </g>
                      ))}
                  </g>
                );
              })}
            </svg>

            {/* flow labels */}
            <span className="mono pointer-events-none absolute left-[24%] top-[44%] -translate-x-full whitespace-nowrap text-[0.6rem] uppercase tracking-[0.16em] text-[var(--agent)] md:text-[0.7rem]">
              {M.flowDown}
            </span>
            <span className="mono pointer-events-none absolute left-[76%] top-[44%] whitespace-nowrap text-[0.6rem] uppercase tracking-[0.16em] text-[var(--signal)] md:text-[0.7rem]">
              {M.flowUp}
            </span>

            {M.nodes.map((n) => {
              const [x, y] = POS[n.key];
              const on = active === n.key;
              const dim = active != null && !on;
              return (
                <div
                  key={n.key}
                  className="absolute z-10 flex flex-col items-center"
                  style={{ left: `${x / 10}%`, top: `${(y / 600) * 100}%`, transform: "translate(-50%, -50%)" }}
                >
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={`${uid}-job-${n.key}`}
                    onMouseEnter={() => setActive(n.key)}
                    onFocus={() => setActive(n.key)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(on ? null : n.key)}
                    className="ticks group flex flex-col items-center gap-1.5 border bg-[var(--deck)] px-3 py-2.5 text-center transition-[opacity,border-color,transform] duration-500 md:px-5 md:py-4"
                    style={{
                      opacity: dim ? 0.32 : 1,
                      borderColor: on ? "var(--agent)" : "var(--rule-strong)",
                      transform: on ? "translateY(-2px)" : "none",
                    }}
                  >
                    <Mascot kind={n.key as MascotKind} size={n.key === "exec" ? 52 : 40} className="h-auto w-[34px] md:w-[62px]" />
                    <span className="mono text-[0.66rem] font-bold tracking-[0.2em] text-[var(--paper)] md:text-[0.78rem]">{n.code}</span>
                    <span className="hidden text-[0.8rem] text-[var(--paper-dim)] md:block">{n.name}</span>
                  </button>
                  {/* expanded job (md+) */}
                  <div
                    id={`${uid}-job-${n.key}`}
                    className="absolute top-full hidden w-[15rem] pt-3 md:grid"
                    style={{ gridTemplateRows: on ? "1fr" : "0fr", transition: "grid-template-rows .6s var(--ease-expo)" }}
                  >
                    <div className="overflow-hidden">
                      <p className="border-l border-[var(--agent)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)] px-4 py-3 text-left text-[0.86rem] leading-snug text-[var(--paper)]">
                        {n.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* mobile readout */}
          <div className="mt-8 min-h-[7.5rem] border-t border-[var(--rule-strong)] pt-5 md:hidden" aria-live="polite">
            {activeNode ? (
              <>
                <p className="mono text-[0.7rem] tracking-[0.2em] text-[var(--agent)]">
                  {activeNode.code} · {activeNode.name}
                </p>
                <p className="mt-2 text-[0.95rem] text-[var(--paper)]">{activeNode.body}</p>
              </>
            ) : (
              <ul className="space-y-1.5">
                {M.nodes.map((n) => (
                  <li key={n.key} className="mono text-[0.7rem] tracking-[0.14em] text-[var(--paper-dim)]">
                    <span className="text-[var(--paper)]">{n.code}</span> · {n.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="hidden h-28 md:block" aria-hidden />
        </div>
      </div>
    </Section>
  );
}
