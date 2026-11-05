"use client";
/**
 * RevenueFlow — 14 revenue streams flowing into the 5 revenue pillars (Sankey-style).
 * Ribbon width = one stream each (count, NOT revenue share). Medium motion: ribbons draw in on view,
 * then calm value particles travel stream → pillar. Hover / focus a pillar to isolate its streams.
 */
import { useUI } from "@/store/ui";
import { PILLARS } from "@/content/site";
import { useInView } from "@/components/v2/kit";
import { useScrub } from "@/components/v2/motion";
import { ORDERED, pad2, pillarColor, streamsOf } from "./shared";

const W = 1200;
const ROW = 33; // left row pitch
const GROUP_GAP = 16;
const BAND = 16; // ribbon thickness
const LX = 392; // left node x
const RX = 812; // right node x
const NODE_W = 8;

type Props = { active: string | null; onHover: (k: string | null) => void; onSelect: (k: string) => void };

function layout() {
  // left rows
  const rows: { y: number; key: string; pi: number }[] = [];
  let y = 24;
  PILLARS.forEach((p, pi) => {
    streamsOf(p).forEach(() => {
      rows.push({ y, key: p.key, pi });
      y += ROW;
    });
    y += GROUP_GAP;
  });
  const H = y - GROUP_GAP - ROW + 24 + 22;
  // right pillar nodes spread over full height
  const heights = PILLARS.map((p) => p.streams.length * BAND);
  const total = heights.reduce((a, b) => a + b, 0);
  const gap = (H - 48 - total) / (PILLARS.length - 1);
  let ry = 24;
  const nodes = PILLARS.map((p, i) => {
    const n = { y: ry, h: heights[i] };
    ry += heights[i] + gap;
    return n;
  });
  return { rows, nodes, H };
}

const L = layout();

export default function RevenueFlow({ active, onHover, onSelect }: Props) {
  const motion = useUI((s) => s.motion);
  const { ref } = useInView<HTMLDivElement>();
  // ribbons draw stream by stream as the diagram scrolls in; pillars light once their streams arrive
  const scrub = useScrub<HTMLDivElement>({ start: "top 80%", end: "center 40%" });
  const slotUsed = PILLARS.map(() => 0);

  const links = ORDERED.map(({ s, p }, i) => {
    const pi = PILLARS.indexOf(p);
    const row = L.rows[i];
    const y0 = row.y + 11; // centre of the left node
    const node = L.nodes[pi];
    const y1 = node.y + slotUsed[pi] * BAND + BAND / 2;
    slotUsed[pi]++;
    const x0 = LX + NODE_W;
    const x1 = RX;
    const mx = (x0 + x1) / 2;
    const h = BAND / 2;
    const ribbon = `M${x0},${y0 - h} C${mx},${y0 - h} ${mx},${y1 - h} ${x1},${y1 - h} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z`;
    const centre = `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    return { s, p, i, row, ribbon, centre };
  });

  const dim = (k: string) => active !== null && active !== k;

  return (
    <div ref={ref} className="relative">
      <div ref={scrub} className="rf-scrub">
      <style>{`
        @keyframes rf-flow { from { stroke-dashoffset: 0 } to { stroke-dashoffset: -56 } }
        .rf-dots { stroke-dasharray: 0.1 55.9; stroke-linecap: round; animation: rf-flow 3.2s linear infinite; }
      `}</style>
      <svg viewBox={`0 0 ${W} ${L.H}`} className="h-auto w-full" role="img" aria-labelledby="rf-title rf-desc">
        <title id="rf-title">Fourteen revenue streams flowing into five revenue pillars</title>
        <desc id="rf-desc">
          {PILLARS.map((p) => `${p.name}: ${streamsOf(p).map((s) => s.name).join(", ")}.`).join(" ")}
        </desc>
        <defs>
          {PILLARS.map((p) => (
            <linearGradient key={p.key} id={`rf-g-${p.key}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={pillarColor(p)} stopOpacity="0.10" />
              <stop offset="100%" stopColor={pillarColor(p)} stopOpacity="0.38" />
            </linearGradient>
          ))}
        </defs>

        {/* column labels */}
        <text x="0" y="10" className="mono" fontSize="11" letterSpacing="2" fill="var(--paper-dim)">
          14 REVENUE STREAMS
        </text>
        <text x={RX + 26} y="10" className="mono" fontSize="11" letterSpacing="2" fill="var(--paper-dim)">
          5 REVENUE PILLARS
        </text>

        {/* ribbons */}
        {links.map(({ p, i, ribbon, centre }) => (
          <g
            key={i}
            style={{
              opacity: dim(p.key) ? 0.12 : 1,
              transition: "opacity .6s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <g className="rf-rib" style={{ "--ri": i } as React.CSSProperties}>
            <path d={ribbon} fill={`url(#rf-g-${p.key})`} />
            {motion && (
              <path
                d={centre}
                fill="none"
                stroke={pillarColor(p)}
                strokeWidth="3"
                className="rf-dots"
                style={{ animationDelay: `${-(i * 0.47) % 3.2}s`, opacity: 0.85 }}
              />
            )}
            </g>
          </g>
        ))}

        {/* left: stream nodes + labels */}
        {links.map(({ s, p, row }) => (
          <g key={s.n} style={{ opacity: dim(p.key) ? 0.35 : 1, transition: "opacity .4s" }}>
            <text x="0" y={row.y + 15.5} className="mono" fontSize="11.5" fill="var(--paper-dim)">
              {pad2(s.n)}
            </text>
            <text x="30" y={row.y + 16} fontSize="14.5" fill="var(--paper)">
              {s.name}
            </text>
            <rect x={LX} y={row.y + 11 - BAND / 2} width={NODE_W} height={BAND} rx="2" fill={pillarColor(p)} />
          </g>
        ))}

        {/* right: pillar nodes + labels (interactive) */}
        {PILLARS.map((p, pi) => {
          const n = L.nodes[pi];
          const cy = n.y + n.h / 2;
          return (
            <g
              key={p.key}
              tabIndex={0}
              role="button"
              aria-label={`${p.name}: ${p.streams.length} streams. Show details`}
              className="cursor-pointer outline-none [&:focus-visible_.rf-focus]:opacity-100"
              onMouseEnter={() => onHover(p.key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(p.key)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(p.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.key);
                }
              }}
              style={{ opacity: dim(p.key) ? 0.4 : 1, transition: "opacity .4s" }}
            >
              <rect x={RX - 6} y={cy - 34} width={W - RX + 6} height="68" fill="transparent" />
              <rect className="rf-focus opacity-0 transition-opacity" x={RX + 16} y={cy - 33} width={W - RX - 18} height="66" rx="10" fill="none" stroke="var(--signal)" strokeWidth="1.2" />
              <g className="rf-node" style={{ "--pi": pi } as React.CSSProperties}>
              <rect x={RX} y={n.y} width={NODE_W + 2} height={n.h} rx="2" fill={pillarColor(p)} />
              <text x={RX + 28} y={cy - 6} fontSize="17" fontWeight="600" fill="var(--paper)">
                <tspan className="mono" fontSize="12" fill={pillarColor(p)} fontWeight="500">
                  {p.n}
                </tspan>
                <tspan dx="10">{p.name}</tspan>
              </text>
              <text x={RX + 28} y={cy + 17} className="mono" fontSize="11.5" letterSpacing="0.6" fill="var(--paper-dim)">
                {p.type.toUpperCase()} · {p.streams.length} STREAMS
              </text>
              </g>
            </g>
          );
        })}
      </svg>
      </div>
    </div>
  );
}

/** Mobile version: each pillar with its streams, a calm vertical flow line into the pillar. */
export function RevenueFlowMobile({ onSelect }: { onSelect: (k: string) => void }) {
  const motion = useUI((s) => s.motion);
  return (
    <ol className="divide-y divide-[var(--rule)]">
      <style>{`@keyframes rfm { 0% { transform: translateY(-10px); opacity: 0 } 20% { opacity: 1 } 80% { opacity: 1 } 100% { transform: translateY(var(--rfm-h)); opacity: 0 } }`}</style>
      {PILLARS.map((p) => (
        <li key={p.key}>
          <button
            type="button"
            onClick={() => onSelect(p.key)}
            className="flex w-full gap-4 py-5 text-left"
          >
            <span aria-hidden className="relative w-1 shrink-0 overflow-hidden rounded-full" style={{ background: `color-mix(in oklab, ${pillarColor(p)} 28%, transparent)` }}>
              {motion && (
                <span
                  className="absolute left-0 top-0 h-2.5 w-1 rounded-full"
                  style={{ background: pillarColor(p), animation: "rfm 3s linear infinite", ["--rfm-h" as string]: "120px" }}
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.84rem] leading-snug text-[var(--paper-dim)]">
                {streamsOf(p).map((s) => (
                  <span key={s.n} className="block py-0.5">
                    <span className="mono mr-2 text-[0.7rem]">{pad2(s.n)}</span>
                    {s.name}
                  </span>
                ))}
              </span>
              <span className="mt-3 flex items-baseline gap-2 border-t border-[var(--rule)] pt-3">
                <span className="mono text-[0.72rem]" style={{ color: pillarColor(p) }}>
                  {p.n}
                </span>
                <span className="font-semibold leading-snug">{p.name}</span>
              </span>
              <span className="mono mt-1 block text-[0.66rem] tracking-[0.08em] text-[var(--paper-dim)]">{p.type.toUpperCase()}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
