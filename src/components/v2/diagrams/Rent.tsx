"use client";
import { C, Dome, Frame, Meta, T, along, ease, lerp, quad, seg, useLoop, type Pt } from "./shared";

/* Discover by rank → rent hourly/daily/monthly → payment splits: developer revenue share + platform commission. */
const CARDS = [
  { rank: 1, kind: "Research", color: C.agent },
  { rank: 2, kind: "Strategy", color: C.signal },
  { rank: 3, kind: "Debate", color: C.frost },
  { rank: 4, kind: "Automation", color: C.lime },
];
const CX = (i: number) => 16 + i * 94;
const PLANS = ["HOURLY", "DAILY", "MONTHLY"];
const ORIGIN: Pt = [176, 204];
const SPLIT: Pt = [232, 204];
const DEV = quad(SPLIT, [252, 166], [282, 166]);
const PLAT = quad(SPLIT, [252, 242], [282, 242]);
const COINS = [0.5, 0.58, 0.66, 0.74];

export default function Rent({ className }: { className?: string }) {
  const { ref, p } = useLoop(9, 0.9);
  const fade = 1 - seg(p, 0.94, 1);
  const focus = lerp(3, 0, ease(seg(p, 0.03, 0.2)));
  const picked = seg(p, 0.2, 0.26);
  const link = seg(p, 0.24, 0.32);
  const plan = lerp(0, 1, ease(seg(p, 0.33, 0.42)));
  const panel = seg(p, 0.28, 0.34);
  const session = seg(p, 0.42, 0.9);
  const arrived = (lag: number) => COINS.reduce((s, c) => s + seg(p, c + lag, c + lag + 0.04), 0) / COINS.length;
  const devFill = arrived(0.14);
  const platFill = arrived(0.14);

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="Rent the top agents: a marketplace shelf of agents sorted by verified rank. The top agent is selected and rented on an hourly, daily or monthly plan. Each rental payment splits in two: a revenue share to the agent's developer and a commission to the platform."
      title="RENT TOP AGENTS · MARKETPLACE"
      meta={<Meta>SORTED BY VERIFIED RANK</Meta>}
      footer="developers earn a revenue share · the platform takes a commission"
    >
      {() => (
        <g>
          {/* shelf */}
          {CARDS.map((c, i) => {
            const sel = i === 0 ? picked * fade : 0;
            return (
              <g key={c.kind} transform={`translate(${CX(i)},${44 - 4 * sel})`}>
                <rect width={84} height={74} rx={8} fill={C.raise} stroke={sel > 0.1 ? C.signal : C.ruleS} strokeOpacity={sel > 0.1 ? 0.4 + 0.6 * sel : 1} strokeWidth={0.75 + sel * 0.5} />
                <rect x={6} y={6} width={22} height={13} rx={6.5} fill={c.rank === 1 ? C.value : C.deck} stroke={c.rank === 1 ? "none" : C.ruleS} strokeWidth={0.6} />
                <T x={17} y={15.5} size={7.5} anchor="middle" fill={c.rank === 1 ? C.void : C.dim} weight={600} ls="0">
                  #{c.rank}
                </T>
                <circle cx={74} cy={12.5} r={3.6} fill={C.signal} opacity={0.9} />
                <path d="M72.4 12.6 L73.6 13.8 L75.7 11.4" fill="none" stroke={C.void} strokeWidth={0.9} />
                <Dome x={42} y={38} size={24} color={c.color} />
                <T x={42} y={66} size={8} anchor="middle" fill={C.paper} ls="0.02em">
                  {c.kind}
                </T>
              </g>
            );
          })}
          {/* discovery focus ring */}
          <rect x={CX(0) - 3 + focus * 94} y={41 - 4 * picked * fade} width={90} height={80} rx={10} fill="none" stroke={C.agent} strokeOpacity={0.55 * (1 - picked) * fade} strokeDasharray="3 3" />

          {/* connector shelf → rental */}
          <path d={`M58 ${118} V ${118 + 26 * link}`} stroke={C.signal} strokeOpacity={0.7 * fade} strokeDasharray="2 3" />

          {/* rental panel */}
          <g opacity={(0.5 + 0.5 * panel) * fade + (1 - fade) * 0.5}>
            <rect x={16} y={146} width={160} height={116} rx={8} fill={C.raise} fillOpacity={0.6} stroke={C.ruleS} strokeWidth={0.75} />
            <T x={26} y={162} size={7.5} ls="0.12em">
              RENT AGENT #1 · RESEARCH
            </T>
            {PLANS.map((pl, i) => (
              <g key={pl}>
                <rect x={24 + i * 50} y={170} width={46} height={20} rx={10} fill={C.deck} stroke={C.ruleS} strokeWidth={0.6} />
              </g>
            ))}
            <rect x={24 + plan * 50} y={170} width={46} height={20} rx={10} fill={C.signal} fillOpacity={0.15} stroke={C.signal} strokeWidth={0.9} opacity={panel} />
            {PLANS.map((pl, i) => (
              <T key={pl} x={47 + i * 50} y={183} size={7} anchor="middle" fill={Math.abs(plan - i) < 0.5 && panel > 0.5 ? C.signal : C.dim} ls="0.04em">
                {pl}
              </T>
            ))}
            <T x={26} y={212} size={7} ls="0.1em">
              {session > 0 ? "SESSION ACTIVE" : "SELECT A PLAN"}
            </T>
            <rect x={26} y={218} width={140} height={5} rx={2.5} fill={C.ruleS} />
            <rect x={26} y={218} width={140 * session * fade} height={5} rx={2.5} fill={C.agent} />
            <T x={26} y={244} size={7} fill={C.dim}>
              usage limits · secure env
            </T>
          </g>

          {/* split flow */}
          <line x1={ORIGIN[0]} y1={ORIGIN[1]} x2={SPLIT[0]} y2={SPLIT[1]} stroke={C.value} strokeOpacity={0.35} />
          <polyline points={DEV.map((q) => q.join(",")).join(" ")} fill="none" stroke={C.signal} strokeOpacity={0.45} strokeWidth={2.5} />
          <polyline points={PLAT.map((q) => q.join(",")).join(" ")} fill="none" stroke={C.value} strokeOpacity={0.45} strokeWidth={1.2} />
          <circle cx={SPLIT[0]} cy={SPLIT[1]} r={7} fill={C.deck} stroke={C.value} strokeWidth={0.9} />
          <circle cx={SPLIT[0]} cy={SPLIT[1]} r={2} fill={C.value} />
          <T x={(ORIGIN[0] + SPLIT[0]) / 2} y={ORIGIN[1] - 5} anchor="middle" size={6.5} fill={C.value} ls="0.1em">
            PAYMENT
          </T>
          <T x={SPLIT[0]} y={SPLIT[1] + 20} anchor="middle" size={7} fill={C.dim} ls="0.1em">
            SPLIT
          </T>
          {COINS.map((c, i) => {
            const a = seg(p, c, c + 0.07);
            const b = seg(p, c + 0.07, c + 0.15);
            if (a <= 0 || b >= 1) return null;
            if (a < 1) {
              const q = along([ORIGIN, SPLIT], ease(a));
              return <circle key={i} cx={q[0]} cy={q[1]} r={4} fill={C.value} />;
            }
            const d = along(DEV, ease(b));
            const pl = along(PLAT, ease(b));
            return (
              <g key={i}>
                <circle cx={d[0]} cy={d[1]} r={3.6} fill={C.signal} />
                <circle cx={pl[0]} cy={pl[1]} r={2.2} fill={C.value} />
              </g>
            );
          })}

          {/* developer box */}
          <g transform="translate(284,144)">
            <rect width={100} height={46} rx={8} fill={C.signal} fillOpacity={0.06} stroke={C.signal} strokeOpacity={0.5} strokeWidth={0.75} />
            <T x={10} y={15} size={7.5} fill={C.signal} ls="0.1em">
              DEVELOPER
            </T>
            <T x={10} y={26} size={7} fill={C.dim}>
              revenue share
            </T>
            <rect x={10} y={33} width={80} height={5} rx={2.5} fill={C.ruleS} />
            <rect x={10} y={33} width={80 * devFill * fade} height={5} rx={2.5} fill={C.signal} />
          </g>
          {/* platform box */}
          <g transform="translate(284,220)">
            <rect width={100} height={46} rx={8} fill={C.value} fillOpacity={0.06} stroke={C.value} strokeOpacity={0.5} strokeWidth={0.75} />
            <T x={10} y={15} size={7.5} fill={C.value} ls="0.1em">
              PLATFORM
            </T>
            <T x={10} y={26} size={7} fill={C.dim}>
              commission
            </T>
            <rect x={10} y={33} width={80} height={5} rx={2.5} fill={C.ruleS} />
            <rect x={10} y={33} width={22 * platFill * fade} height={5} rx={2.5} fill={C.value} />
          </g>
        </g>
      )}
    </Frame>
  );
}
