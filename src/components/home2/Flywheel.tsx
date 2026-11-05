"use client";
import { FLYWHEEL, INVESTORS } from "@/content/site";
import { FadeIn, Section, SectionHeader } from "@/components/v2/kit";
import { Logo } from "@/components/brand/Logo";
import { easeInOut, useLoop, useVisible } from "./motion";

const CX = 320, CY = 230, R = 150;
const COLORS = ["var(--signal)", "var(--agent)", "var(--frost)", "var(--value)"];
const ang = (i: number) => -Math.PI / 2 + (i * Math.PI) / 2;
const pt = (a: number, r = R): [number, number] => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];

/** label placement around the loop (top, right, bottom, left) */
const LABEL = [
  { x: CX, y: CY - R - 30, anchor: "middle" as const },
  { x: CX + R + 24, y: CY + 5, anchor: "start" as const },
  { x: CX, y: CY + R + 40, anchor: "middle" as const },
  { x: CX - R - 24, y: CY + 5, anchor: "end" as const },
];

function split(label: string): string[] {
  const w = label.split(" ");
  if (w.length < 3) return [label];
  const mid = Math.ceil(w.length / 2);
  return [w.slice(0, mid).join(" "), w.slice(mid).join(" ")];
}

export default function Flywheel() {
  const { ref, visible } = useVisible<HTMLDivElement>();
  const t = useLoop(9600, visible);
  // dwell at each node, then travel a quarter turn
  let a = ang(0), active = -1;
  if (t !== null) {
    const x = t * 4, k = Math.floor(x), u = x - k;
    const travel = u < 0.45 ? 0 : easeInOut((u - 0.45) / 0.55);
    a = ang(k) + travel * (Math.PI / 2);
    active = travel > 0.5 ? (k + 1) % 4 : k;
  }
  const lit = (i: number) => active === -1 || active === i;
  const [tx, ty] = pt(a);

  const wheel = (compact: boolean) => {
    const mk = compact ? "fw-arrow-c" : "fw-arrow";
    return (
            <svg viewBox={compact ? `${CX - R - 36} ${CY - R - 36} ${2 * R + 72} ${2 * R + 72}` : "0 0 640 480"} className={`h-auto w-full ${compact ? "sm:hidden" : "hidden sm:block"}`} role="img" aria-label="Network-effects loop: participation, diversity, competition and activity reinforce each other">
              <defs>
                <marker id={mk} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="var(--paper-dim)" />
                </marker>
              </defs>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--rule-strong)" strokeWidth={1.5} />
              <circle cx={CX} cy={CY} r={R - 46} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
              {/* arrows between nodes */}
              {[0, 1, 2, 3].map((i) => {
                const [x1, y1] = pt(ang(i) + 0.32);
                const [x2, y2] = pt(ang(i + 1) - 0.32);
                return <path key={i} d={`M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`} fill="none" stroke="var(--paper-dim)" strokeOpacity={0.5} strokeWidth={1.5} markerEnd={`url(#${mk})`} />;
              })}
              {/* center */}
              <g transform={`translate(${CX - 29} ${CY - 44})`}>
                <Logo size={48} />
              </g>
              <text x={CX} y={CY + 30} textAnchor="middle" className="mono" fontSize="11" letterSpacing="2" fill="var(--paper-dim)">
                MIDEARTH
              </text>
              {/* travelling token */}
              {t !== null && (
                <g>
                  <circle cx={tx} cy={ty} r={9} fill="var(--signal)" opacity={0.22} />
                  <circle cx={tx} cy={ty} r={5} fill="var(--signal)" />
                </g>
              )}
              {/* nodes */}
              {FLYWHEEL.steps.map((s, i) => {
                const [x, y] = pt(ang(i));
                const on = lit(i);
                return (
                  <g key={s.label}>
                    <circle cx={x} cy={y} r={compact ? 24 : 20} fill="var(--void)" stroke={COLORS[i]} strokeOpacity={on ? 1 : 0.4} strokeWidth={1.5} />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize={compact ? 15 : 12} className="mono" fill={COLORS[i]}>
                      0{i + 1}
                    </text>
                    {!compact && (<text x={LABEL[i].x} y={LABEL[i].y} textAnchor={LABEL[i].anchor} fontSize="15" fontWeight={600} fill="var(--paper)" opacity={on ? 1 : 0.55}>
                      {split(s.label).map((line, j, arr) => (
                        <tspan key={j} x={LABEL[i].x} dy={j === 0 ? -(arr.length - 1) * 9 : 18}>
                          {line}
                        </tspan>
                      ))}
                    </text>)}
                  </g>
                );
              })}
            </svg>
    );
  };

  return (
    <Section id="network" className="border-t border-[var(--rule)]">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeader eyebrow="05 · Why it compounds" title={FLYWHEEL.title} lead={INVESTORS.why[2].body} />
          <FadeIn delay={120}>
            <ol className="mt-10 space-y-1">
              {FLYWHEEL.steps.map((s, i) => (
                <li
                  key={s.label}
                  className="flex gap-4 border-l-2 py-2.5 pl-4 transition-[border-color,opacity] duration-500"
                  style={{ borderColor: lit(i) && active !== -1 ? COLORS[i] : "var(--rule)", opacity: lit(i) ? 1 : 0.6 }}
                >
                  <span className="mono mt-0.5 text-[0.72rem]" style={{ color: COLORS[i] }}>
                    0{i + 1}
                  </span>
                  <p className="text-[0.95rem] leading-relaxed">
                    <span className="font-semibold">{s.label}</span> <span className="text-[var(--paper-dim)]">{s.body}.</span>
                  </p>
                </li>
              ))}
            </ol>
          </FadeIn>
        </div>

        <FadeIn delay={150} className="lg:col-span-7">
          <div ref={ref} className="rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-2 sm:p-6">
            {wheel(true)}
            {wheel(false)}
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
