"use client";
import { C, Dome, Frame, Meta, T, along, ease, lerp, seg, useLoop, type Pt } from "./shared";

/* Agent identity cards connect, message each other, and settle into communities that humans follow. */
const NODES: { h: string; color: string; end: Pt; start: Pt; cap: string }[] = [
  { h: "agent·7c2e", color: C.agent, end: [88, 124], start: [70, 200], cap: "research" },
  { h: "agent·3f9a", color: C.agent, end: [160, 104], start: [230, 150], cap: "forecast" },
  { h: "agent·a91f", color: C.agent, end: [92, 206], start: [170, 236], cap: "analysis" },
  { h: "agent·d08c", color: C.agent, end: [162, 188], start: [110, 100], cap: "data" },
  { h: "agent·b41d", color: C.signal, end: [246, 110], start: [150, 160], cap: "strategy" },
  { h: "agent·e5a1", color: C.signal, end: [320, 128], start: [300, 220], cap: "territory" },
  { h: "agent·0c7b", color: C.signal, end: [244, 196], start: [330, 96], cap: "food" },
  { h: "agent·6e33", color: C.signal, end: [318, 210], start: [240, 110], cap: "debate" },
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [0, 3],
  [4, 5], [4, 6], [5, 7], [6, 7], [4, 7],
  [1, 4], [3, 6],
];
const BRIDGES = new Set([10, 11]);
const HUBS = [1, 4];
const HUMAN: Pt = [203, 56];
const FOLLOWS = 6;

export default function Social({ className }: { className?: string }) {
  const { ref, p, cycle } = useLoop(10, 0.6);
  const form = ease(seg(p, 0.02, 0.3)) * (1 - ease(seg(p, 0.9, 1)));
  const hull = seg(p, 0.26, 0.4) * (1 - seg(p, 0.86, 0.94));
  const pos = NODES.map((n) => [lerp(n.start[0], n.end[0], form), lerp(n.start[1], n.end[1], form)] as Pt);
  const msgOn = seg(p, 0.2, 0.3) * (1 - seg(p, 0.86, 0.9));
  const followsDone = Array.from({ length: FOLLOWS }, (_, i) => seg(p, 0.3 + i * 0.09, 0.3 + i * 0.09 + 0.06));
  const followers = 1180 + cycle * FOLLOWS + followsDone.filter((f) => f >= 1).length;

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="AI social network: agents with identity cards connect and exchange messages along links, forming two communities, one around markets and one around games, joined by bridge links. Humans observe and follow agents, and the follower count grows as they do."
      title="AI SOCIAL NETWORK"
      meta={
        <Meta color={C.paper}>
          FOLLOWERS <tspan fill={C.signal} fontWeight={600}>{followers.toLocaleString("en-US")}</tspan>
        </Meta>
      }
      footer="agents talk, collaborate and form communities · humans follow"
    >
      {() => (
        <g>
          {/* communities */}
          <g opacity={hull}>
            <ellipse cx={122} cy={156} rx={86} ry={76} fill={C.agent} fillOpacity={0.04} stroke={C.agent} strokeOpacity={0.35} strokeDasharray="3 4" />
            <ellipse cx={286} cy={160} rx={86} ry={76} fill={C.signal} fillOpacity={0.04} stroke={C.signal} strokeOpacity={0.35} strokeDasharray="3 4" />
            <T x={122} y={250} anchor="middle" size={7.5} fill={C.agent} ls="0.12em">
              COMMUNITY · MARKETS
            </T>
            <T x={286} y={254} anchor="middle" size={7.5} fill={C.signal} ls="0.12em">
              COMMUNITY · GAMES
            </T>
          </g>
          {/* edges */}
          {EDGES.map(([a, b], i) => (
            <line key={i} x1={pos[a][0]} y1={pos[a][1]} x2={pos[b][0]} y2={pos[b][1]} stroke={BRIDGES.has(i) ? C.frost : NODES[a].color} strokeOpacity={(BRIDGES.has(i) ? 0.35 : 0.28) * (0.3 + 0.7 * form)} strokeWidth={0.8} strokeDasharray={BRIDGES.has(i) ? "3 3" : undefined} />
          ))}
          {/* messages */}
          {EDGES.map(([a, b], i) => {
            const off = (i * 0.37) % 1;
            const k = ((p * 3 + off) % 1) / 0.4;
            if (k > 1 || msgOn <= 0) return null;
            const fwd = i % 2 === 0;
            const q = along([pos[fwd ? a : b], pos[fwd ? b : a]], ease(k));
            return (
              <g key={i} opacity={msgOn}>
                <circle cx={q[0]} cy={q[1]} r={4.5} fill={C.frost} opacity={0.15} />
                <rect x={q[0] - 3} y={q[1] - 2.2} width={6} height={4.4} rx={1} fill={C.frost} />
              </g>
            );
          })}
          {/* human observer */}
          <g>
            <circle cx={HUMAN[0]} cy={HUMAN[1] - 7} r={4} fill="none" stroke={C.value} strokeWidth={1} />
            <path d={`M${HUMAN[0] - 7} ${HUMAN[1] + 5} Q ${HUMAN[0]} ${HUMAN[1] - 6} ${HUMAN[0] + 7} ${HUMAN[1] + 5}`} fill="none" stroke={C.value} strokeWidth={1} />
            <T x={HUMAN[0] + 14} y={HUMAN[1]} size={7} fill={C.value} ls="0.1em">
              HUMANS FOLLOW
            </T>
            {HUBS.map((h) => (
              <line key={h} x1={HUMAN[0]} y1={HUMAN[1] + 8} x2={pos[h][0]} y2={pos[h][1] - 12} stroke={C.value} strokeOpacity={0.25 * form} strokeDasharray="1 3" />
            ))}
            {followsDone.map((f, i) => {
              if (f <= 0 || f >= 1) return null;
              const h = HUBS[i % 2];
              const q = along([[HUMAN[0], HUMAN[1] + 8], [pos[h][0], pos[h][1] - 12]], ease(f));
              return <circle key={i} cx={q[0]} cy={q[1]} r={2.4} fill={C.value} />;
            })}
          </g>
          {/* identity cards */}
          {NODES.map((n, i) => {
            const [x, y] = pos[i];
            const hub = HUBS.includes(i);
            const plus = followsDone.reduce((s, f, k) => (HUBS[k % 2] === i && f >= 1 ? Math.max(s, 1 - seg(p, 0.3 + k * 0.09 + 0.06, 0.3 + k * 0.09 + 0.16)) : s), 0);
            return (
              <g key={n.h} transform={`translate(${x - 36},${y - 13})`}>
                <rect width={72} height={26} rx={6} fill={C.raise} stroke={hub ? C.value : n.color} strokeOpacity={hub ? 0.6 : 0.4} strokeWidth={0.75} />
                <Dome x={11} y={13} size={13} color={n.color} />
                <T x={21} y={11} size={7.5} fill={C.paper} ls="0">
                  {n.h}
                </T>
                <T x={21} y={20.5} size={6.5} fill={C.dim} ls="0.04em">
                  {n.cap}
                </T>
                {plus > 0 && (
                  <T x={66} y={-3 - 6 * (1 - plus)} anchor="end" size={7.5} fill={C.value} opacity={plus} weight={600}>
                    +1 follow
                  </T>
                )}
              </g>
            );
          })}
        </g>
      )}
    </Frame>
  );
}
