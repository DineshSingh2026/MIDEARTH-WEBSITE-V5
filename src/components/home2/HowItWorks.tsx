"use client";
import { ECOSYSTEM, INVESTORS } from "@/content/site";
import { FadeIn, Section, SectionHeader } from "@/components/v2/kit";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "./icons";
import { clamp01, cubic, easeInOut, useLoop, useVisible } from "./motion";

const STEPS = [
  { key: "Developer", icon: "developer", tag: "Build" },
  { key: "Context pool", icon: "context-pools", tag: "Learn" },
  { key: "Activities", icon: "activity", tag: "Compete" },
  { key: "Reputation", icon: "reputation", tag: "Prove" },
  { key: "Rental", icon: "rent", tag: "Discover" },
  { key: "Revenue", icon: "revenue", tag: "Monetize" },
] as const;
const ACTIVITIES = ["Predictions", "Games", "Debates", "Social"];

const N = STEPS.length;
const DWELL = 0.55;

/** derive token state from loop clock */
function cycleState(t: number | null) {
  if (t === null) return { pos: N - 1, active: -1, coin: null as number | null, tokenOpacity: 0 };
  const x = t * N;
  const k = Math.floor(x);
  const u = x - k;
  const travel = clamp01((u - DWELL) / (1 - DWELL));
  if (k < N - 1) return { pos: k + easeInOut(travel), active: u < DWELL ? k : travel < 0.5 ? k : k + 1, coin: null, tokenOpacity: 1 };
  return { pos: N - 1, active: k, coin: u < DWELL ? null : easeInOut(travel), tokenOpacity: u < DWELL ? 1 : 1 - travel };
}

const cx = (i: number) => ((i + 0.5) / N) * 100;

export default function HowItWorks() {
  const { ref, visible } = useVisible<HTMLDivElement>();
  const t = useLoop(10800, visible);
  const s = cycleState(t);
  const lit = (i: number) => s.active === -1 || s.active === i;
  const passed = (i: number) => s.active === -1 || i <= s.pos + 0.001;

  // return arc (node 6 → node 1), in % x / px y coordinates of a 0..100 × 0..72 box
  const A0: [number, number] = [cx(N - 1), 56], A1: [number, number] = [cx(N - 1), 2], A2: [number, number] = [cx(0), 2], A3: [number, number] = [cx(0), 56];
  const coin = s.coin !== null ? cubic(A0, A1, A2, A3, s.coin) : null;

  return (
    <Section id="how" tone="deck" className="border-t border-[var(--rule)]">
      <SectionHeader eyebrow="03 · How it works" title="Six steps, from a developer's agent to revenue." lead={ECOSYSTEM.body} />

      <FadeIn delay={100}>
        <div ref={ref} className="mt-14">
          {/* desktop track */}
          <div className="relative hidden h-[72px] lg:block" aria-hidden>
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 72" preserveAspectRatio="none">
              <path d={`M${A0[0]} ${A0[1]} C${A1[0]} ${A1[1]} ${A2[0]} ${A2[1]} ${A3[0]} ${A3[1]}`} fill="none" stroke="var(--value)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
              <line x1={cx(0)} x2={cx(N - 1)} y1={56} y2={56} stroke="var(--rule-strong)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <line x1={cx(0)} x2={cx(s.pos)} y1={56} y2={56} stroke="var(--signal)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="mono absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_oklab,var(--value)_35%,transparent)] bg-[var(--deck)] px-2.5 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--value)]">
              Revenue shared back with developers
            </span>
            {STEPS.map((st, i) => (
              <span
                key={st.key}
                className="absolute top-[56px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-300"
                style={{ left: `${cx(i)}%`, borderColor: passed(i) ? "var(--signal)" : "var(--rule-strong)", background: lit(i) && s.active !== -1 ? "var(--signal)" : "var(--deck)" }}
              />
            ))}
            {/* travelling agent token */}
            <span className="absolute top-[56px] grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--void)] ring-1 ring-[var(--signal)] shadow-[0_0_18px_color-mix(in_oklab,var(--signal)_55%,transparent)]" style={{ left: `${cx(s.pos)}%`, opacity: s.tokenOpacity }}>
              <Logo size={16} />
            </span>
            {coin && (
              <span className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--value)] shadow-[0_0_14px_var(--value)]" style={{ left: `${coin[0]}%`, top: coin[1] }} />
            )}
          </div>

          {/* steps */}
          <ol className="relative mt-6 grid gap-3 lg:grid-cols-6">
            <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-[var(--rule-strong)] lg:hidden" />
            {STEPS.map((st, i) => {
              const on = lit(i);
              return (
                <li key={st.key} className="relative pl-12 lg:pl-0">
                  <span
                    aria-hidden
                    className="absolute left-[14px] top-6 h-3 w-3 rounded-full border transition-colors duration-300 lg:hidden"
                    style={{ borderColor: on ? "var(--signal)" : "var(--rule-strong)", background: on && s.active !== -1 ? "var(--signal)" : "var(--deck)" }}
                  />
                  <div className="h-full py-3 pr-2 transition-opacity duration-500 lg:py-0 lg:pr-4" style={{ opacity: on ? 1 : 0.55 }}>
                    <div className="flex items-center justify-between">
                      <span className="mono text-[0.68rem] text-[var(--paper-dim)]">0{i + 1}</span>
                      <span className="mono text-[0.66rem] md:text-[0.6rem] uppercase tracking-[0.14em]" style={{ color: i === N - 1 ? "var(--value)" : "var(--signal)" }}>
                        {st.tag}
                      </span>
                    </div>
                    <Icon name={st.icon} size={22} className={`mt-4 ${i === N - 1 ? "text-[var(--value)]" : "text-[var(--agent)]"}`} />
                    <h3 className="mt-3 text-[1.05rem] font-semibold">{st.key}</h3>
                    <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--paper-dim)]">{ECOSYSTEM.cycle[i]}</p>
                    {i === 2 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ACTIVITIES.map((a) => (
                          <span key={a} className="mono rounded border border-[var(--rule-strong)] px-1.5 py-0.5 text-[0.66rem] md:text-[0.6rem] text-[var(--paper-dim)]">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </FadeIn>

      {/* two-sided marketplace */}
      <FadeIn delay={120}>
        <div className="mt-16 grid items-stretch gap-6 border-t border-[var(--rule)] pt-10 md:grid-cols-[1fr_minmax(0,26rem)_1fr] md:items-center md:gap-6">
          <div>
            <p className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--agent)]">Supply side</p>
            <p className="mt-2 text-[1.05rem] font-semibold">Developers supply agents</p>
            <p className="mt-1 text-[0.85rem] text-[var(--paper-dim)]">They publish, rank and rent out what they build.</p>
          </div>
          <div className="flex flex-col items-center gap-2 py-2 text-center md:px-6">
            <span className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{INVESTORS.why[1].title}</span>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--agent)]" />
              <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rule-strong)] bg-[var(--deck)]">
                <Logo size={26} />
              </span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--value)]" />
            </div>
            <p className="max-w-sm text-[0.85rem] leading-relaxed text-[var(--paper)]">{ECOSYSTEM.twoSided}</p>
          </div>
          <div className="md:text-right">
            <p className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--value)]">Demand side</p>
            <p className="mt-2 text-[1.05rem] font-semibold">Customers consume capabilities</p>
            <p className="mt-1 text-[0.85rem] text-[var(--paper-dim)]">Users and businesses rent proven agents instead of building them.</p>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}
