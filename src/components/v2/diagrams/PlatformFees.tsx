"use client";
import { C, Frame, Meta, T, along, ease, seg, useLoop, type Pt } from "./shared";

/* Every activity emits small payments → one metering + settlement layer → platform revenue, settled on-chain. */
const SRC = [
  { name: "GAMES", sub: "commission*", color: C.signal },
  { name: "RENTALS", sub: "rental fee", color: C.agent },
  { name: "COMPUTE", sub: "usage billing", color: C.hot },
  { name: "CONTEXT", sub: "pool access", color: C.frost },
  { name: "DATA", sub: "data access", color: C.lime },
];
const RY = (i: number) => 64 + i * 44;
const BAR_X = 190;
const MID = 150;
const BOX_X = 278;
const PATHS: Pt[][] = SRC.map((_, i) => [
  [116, RY(i)],
  [BAR_X, RY(i)],
  [BAR_X + 8, RY(i)],
  [BAR_X + 8, MID],
  [BAR_X + 16, MID],
  [BOX_X, MID],
]);
const PER = 3;
const TRAVEL = 0.22;
const start = (i: number, k: number) => 0.02 + i * 0.045 + k * 0.23;
const UNIT = 84 / (SRC.length * PER);

export default function PlatformFees({ className }: { className?: string }) {
  const { ref, p } = useLoop(10, 0.93);
  const fade = 1 - seg(p, 0.95, 1);
  const arrived = SRC.map((_, i) => Array.from({ length: PER }, (_, k) => seg(p, start(i, k) + TRAVEL - 0.02, start(i, k) + TRAVEL)).reduce((s, v) => s + v, 0));
  const emitting = SRC.map((_, i) => Array.from({ length: PER }, (_, k) => 1 - seg(p, start(i, k), start(i, k) + 0.05)).reduce((m, v, k) => (p >= start(i, k) ? Math.max(m, v) : m), 0));
  let pulse = 0;
  let land = 0;
  const coins: { q: Pt; c: string }[] = [];
  SRC.forEach((s, i) => {
    for (let k = 0; k < PER; k++) {
      const a = seg(p, start(i, k), start(i, k) + TRAVEL);
      if (a > 0 && a < 1) {
        coins.push({ q: along(PATHS[i], ease(a)), c: s.color });
        if (a > 0.4 && a < 0.7) pulse = Math.max(pulse, 1 - Math.abs(a - 0.55) / 0.15);
      }
      land = Math.max(land, seg(p, start(i, k) + TRAVEL - 0.02, start(i, k) + TRAVEL) * (1 - seg(p, start(i, k) + TRAVEL, start(i, k) + TRAVEL + 0.06)));
    }
  });
  const widths = arrived.map((a) => a * UNIT * fade);
  const offs = widths.map((_, i) => widths.slice(0, i).reduce((s, v) => s + v, 0));

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="Unified platform fees: games, rentals, compute, context pools and data access each emit small payments. All of them pass through one metering and settlement layer and land in platform revenue, settled on-chain. Commissions on games apply only where legally permitted."
      title="UNIFIED PLATFORM FEES"
      meta={<Meta dot={C.value} color={C.value}>ONE SETTLEMENT LAYER</Meta>}
      footer="* commissions and on-chain fees only where legally permitted"
    >
      {() => (
        <g>
          <T x={16} y={42} size={7} ls="0.12em">
            ACTIVITY
          </T>
          {SRC.map((s, i) => (
            <g key={s.name} transform={`translate(16,${RY(i) - 15})`}>
              <rect width={100} height={30} rx={7} fill={C.raise} stroke={s.color} strokeOpacity={0.3 + 0.6 * emitting[i] * fade} strokeWidth={0.75} />
              <circle cx={11} cy={15} r={3} fill={s.color} />
              <T x={20} y={13} size={8} fill={C.paper} ls="0.06em">
                {s.name}
              </T>
              <T x={20} y={23} size={7} fill={i === 0 ? C.value : C.dim} ls="0">
                {s.sub}
              </T>
            </g>
          ))}
          {/* rails */}
          {PATHS.map((pa, i) => (
            <polyline key={i} points={pa.slice(0, 2).map((q) => q.join(",")).join(" ")} fill="none" stroke={SRC[i].color} strokeOpacity={0.2} strokeDasharray="2 3" />
          ))}
          <line x1={BAR_X + 16} x2={BOX_X} y1={MID} y2={MID} stroke={C.value} strokeOpacity={0.45} strokeWidth={2} />
          {/* settlement layer */}
          <rect x={BAR_X} y={44} width={16} height={212} rx={8} fill={C.value} fillOpacity={0.06 + 0.1 * pulse} stroke={C.value} strokeOpacity={0.45 + 0.4 * pulse} strokeWidth={0.75} />
          {Array.from({ length: 9 }, (_, k) => (
            <line key={k} x1={BAR_X + 4} x2={BAR_X + 12} y1={56 + k * 24} y2={56 + k * 24} stroke={C.value} strokeOpacity={0.3} strokeWidth={0.6} />
          ))}
          <T x={BAR_X + 8} y={270} anchor="middle" size={7} fill={C.value} ls="0.12em">
            METERING + SETTLEMENT
          </T>

          {/* coins */}
          {coins.map((c, i) => (
            <g key={i}>
              <circle cx={c.q[0]} cy={c.q[1]} r={5.5} fill={C.value} opacity={0.15} />
              <circle cx={c.q[0]} cy={c.q[1]} r={3.2} fill={C.value} stroke={c.c} strokeWidth={1} />
            </g>
          ))}

          {/* revenue box */}
          <g transform={`translate(${BOX_X},92)`}>
            <rect width={106} height={118} rx={8} fill={C.value} fillOpacity={0.05 + 0.06 * land} stroke={C.value} strokeOpacity={0.5 + 0.4 * land} strokeWidth={0.75} />
            <T x={10} y={17} size={7.5} fill={C.value} ls="0.12em">
              PLATFORM
            </T>
            <T x={10} y={28} size={7.5} fill={C.value} ls="0.12em">
              REVENUE
            </T>
            <T x={10} y={46} size={6.5} fill={C.dim} ls="0.1em">
              MIX BY SOURCE
            </T>
            <rect x={10} y={51} width={86} height={10} rx={3} fill={C.ruleS} />
            {SRC.map((s, i) => {
              const w = widths[i];
              const x = 11 + offs[i];
              return w > 0.1 ? <rect key={s.name} x={x} y={52} width={w} height={8} fill={s.color} opacity={0.9} /> : null;
            })}
            {/* on-chain blocks */}
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <rect x={10 + k * 26} y={76} width={18} height={14} rx={2} fill="none" stroke={C.agent} strokeOpacity={0.4 + (k === 2 ? 0.5 * land : 0)} strokeWidth={0.75} />
                {k < 2 && <line x1={28 + k * 26} x2={36 + k * 26} y1={83} y2={83} stroke={C.agent} strokeOpacity={0.5} strokeDasharray="2 1.5" />}
              </g>
            ))}
            <T x={10} y={106} size={6.5} fill={C.agent} ls="0.1em">
              SETTLED ON-CHAIN*
            </T>
          </g>
        </g>
      )}
    </Frame>
  );
}
