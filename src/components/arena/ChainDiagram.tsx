"use client";
import { useUI } from "@/store/ui";
import { CREDIT } from "./shared";
import { useScrub } from "@/components/v2/motion";

type Cfg = { W: number; H: number; wx: number; ox: number; cx: number; cy: number; r: number; chainY: number; bound: number; fs: number; nodeY: number };
const DESKTOP: Cfg = { W: 1300, H: 330, wx: 170, ox: 1130, cx: 650, cy: 236, r: 58, chainY: 26, bound: 122, fs: 14, nodeY: 66 };
const MOBILE: Cfg = { W: 358, H: 410, wx: 66, ox: 290, cx: 179, cy: 282, r: 50, chainY: 24, bound: 142, fs: 15, nodeY: 80 };

/**
 * "The chain is touched twice": one value token crosses down (deposit), loops off-chain through
 * entry fee → match → payout, then crosses up once (withdrawal).
 */
export default function ChainDiagram() {
  // the sequence plays with scroll: deposit crosses, the off-chain loop spins, the withdrawal crosses
  const scrub = useScrub<HTMLDivElement>({ start: "top 85%", end: "bottom 40%" });
  return (
    <div ref={scrub} className="cd-scrub rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-3 sm:p-5">
      <Diagram cfg={DESKTOP} className="hidden lg:block" />
      <Diagram cfg={MOBILE} className="mx-auto max-w-[520px] lg:hidden" />
    </div>
  );
}

function Diagram({ cfg, className }: { cfg: Cfg; className: string }) {
  const motion = useUI((s) => s.motion);
  const { W, H, wx, ox, cx, cy, r, chainY, bound, fs, nodeY } = cfg;
  const L = cx - r;
  const loop = `a${r},${r} 0 1,1 ${2 * r},0 a${r},${r} 0 1,1 ${-2 * r},0`;
  const top = nodeY + 14;
  const travel = `M${wx},${top} V${cy} H${L} ${loop} ${loop} a${r},${r} 0 1,1 ${2 * r},0 H${ox} V${top}`;
  const small = fs * 0.85;
  const labelsOnRing = [
    { a: -90, t: "entry fee" },
    { a: 30, t: "match" },
    { a: 150, t: "payout" },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full ${className}`} role="img" aria-label="A deposit crosses onto the arena once, matches settle off-chain in a loop, and one withdrawal crosses back to Solana.">
      {/* lanes */}
      <rect x="0" y="0" width={W} height={bound} rx="12" fill="color-mix(in oklab, var(--value) 5%, transparent)" />
      <text x="14" y={chainY} fontSize={small} className="mono" fill="var(--value)" letterSpacing="1.2">
        SOLANA · ON-CHAIN
      </text>
      <text x="14" y={H - 14} fontSize={small} className="mono" fill="var(--agent)" letterSpacing="1.2">
        ARENA · OFF-CHAIN · {CREDIT}
      </text>
      <line x1="0" x2={W} y1={bound} y2={bound} stroke="var(--rule-strong)" strokeDasharray="4 6" />

      {/* wallets */}
      <Node x={wx} y={nodeY} label="Deposit address" fs={fs} />
      <Node x={ox} y={nodeY} label="Any Solana wallet" fs={fs} />

      {/* deposit and withdrawal lines (gold = value crossing the chain) */}
      <path className="cd-dep" pathLength={1} d={`M${wx},${top} V${cy} H${L}`} fill="none" stroke="var(--value)" strokeOpacity=".55" strokeWidth="1.5" />
      <path className="cd-wd" pathLength={1} d={`M${cx + r},${cy} H${ox} V${top}`} fill="none" stroke="var(--value)" strokeOpacity=".55" strokeWidth="1.5" />
      <Arrow x={wx} y={bound + 26} dir="down" />
      <Arrow x={ox} y={bound - 26} dir="up" />

      {/* crossing badges */}
      <g className="cd-b1">
        <Badge x={wx} y={bound} t="1 · deposit" fs={small} />
      </g>
      <g className="cd-b2">
        <Badge x={ox} y={bound} t="2 · withdrawal" fs={small} />
      </g>

      {/* off-chain loop */}
      <circle className="cd-loop" cx={cx} cy={cy} r={r} fill="color-mix(in oklab, var(--agent) 6%, transparent)" stroke="var(--agent)" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="3 5" />
      {labelsOnRing.map((l) => {
        const rad = (l.a * Math.PI) / 180;
        const px = cx + Math.cos(rad) * r;
        const py = cy + Math.sin(rad) * r;
        const lx = cx + Math.cos(rad) * (r + 14);
        const ly = cy + Math.sin(rad) * (r + 14);
        const anchor = Math.abs(Math.cos(rad)) < 0.2 ? "middle" : Math.cos(rad) > 0 ? "start" : "end";
        return (
          <g key={l.t}>
            <circle cx={px} cy={py} r="3.5" fill="var(--agent)" />
            <text x={lx} y={ly + (l.a === -90 ? -4 : fs * 0.9)} fontSize={small} textAnchor={anchor} className="mono" fill="var(--paper-dim)">
              {l.t}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy - 4} fontSize={fs} textAnchor="middle" fill="var(--paper)" fontWeight="600">
        instant
      </text>
      <text x={cx} y={cy + fs + 2} fontSize={small} textAnchor="middle" className="mono" fill="var(--paper-dim)">
        no gas
      </text>

      {/* value token */}
      {motion ? (
        <g className="cd-tok">
          <circle r="6" fill="var(--value)">
            <animateMotion dur="10s" repeatCount="indefinite" path={travel} rotate="0" />
          </circle>
          <circle r="12" fill="var(--value)" opacity=".18">
            <animateMotion dur="10s" repeatCount="indefinite" path={travel} rotate="0" />
          </circle>
        </g>
      ) : (
        <circle cx={cx} cy={cy - r} r="6" fill="var(--value)" />
      )}
    </svg>
  );
}

function Node({ x, y, label, fs }: { x: number; y: number; label: string; fs: number }) {
  return (
    <g>
      <rect x={x - 14} y={y - 14} width="28" height="28" rx="8" fill="var(--deck)" stroke="var(--value)" strokeOpacity=".7" />
      <path d={`M${x - 6},${y - 3} h12 v8 h-12 z M${x - 6},${y - 3} l2,-4 h8 l2,4`} fill="none" stroke="var(--value)" strokeWidth="1.3" strokeLinejoin="round" />
      <text x={x} y={y - 22} fontSize={fs} textAnchor="middle" fill="var(--paper)">
        {label}
      </text>
    </g>
  );
}

function Badge({ x, y, t, fs }: { x: number; y: number; t: string; fs: number }) {
  const w = t.length * fs * 0.62 + 18;
  return (
    <g>
      <rect x={x - w / 2} y={y - fs} width={w} height={fs * 2} rx={fs} fill="var(--void)" stroke="var(--value)" />
      <text x={x} y={y + fs * 0.35} fontSize={fs} textAnchor="middle" className="mono" fill="var(--value)">
        {t}
      </text>
    </g>
  );
}

function Arrow({ x, y, dir }: { x: number; y: number; dir: "up" | "down" }) {
  const d = dir === "down" ? `M${x - 5},${y - 4} L${x},${y + 2} L${x + 5},${y - 4}` : `M${x - 5},${y + 4} L${x},${y - 2} L${x + 5},${y + 4}`;
  return <path d={d} fill="none" stroke="var(--value)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
}
