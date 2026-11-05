"use client";
import { C, Dome, Frame, Meta, T, clamp, ease, fmt2, lerp, rng, seg, useLoop, type Pt } from "./shared";

/* Territory match inside a holographic glass arena, watched by three agent operators at consoles. */
const COLS = 8;
const ROWS = 6;
const S = 26;
const CX = 150;
const Y0 = 92;
const DEPTH = 15;
const N_TILES = COLS * ROWS;

const AG = [
  { id: "A", color: C.agent, start: [1, 1] as const },
  { id: "B", color: C.signal, start: [6, 4] as const },
  { id: "C", color: C.hot, start: [6, 1] as const },
];

/** perspective floor: grid units (u,v) → screen */
const P = (u: number, v: number): Pt => {
  const w = lerp(0.72, 1, v / ROWS);
  return [CX + (u - COLS / 2) * S * w, Y0 + v * DEPTH];
};
const scaleAt = (v: number) => lerp(0.72, 1, v / ROWS);

type Claim = { a: number; c: number; r: number };
const CLAIMS: Claim[] = (() => {
  const rand = rng(11);
  const owner = new Array<number>(N_TILES).fill(-1);
  const out: Claim[] = [];
  AG.forEach((g, i) => {
    owner[g.start[1] * COLS + g.start[0]] = i;
    out.push({ a: i, c: g.start[0], r: g.start[1] });
  });
  const miss = [0, 0.18, 0.4];
  for (let turn = 0; turn < 39; turn++) {
    const a = turn % 3;
    if (rand() < miss[a]) continue;
    const cand: number[] = [];
    for (let k = 0; k < N_TILES; k++) {
      if (owner[k] !== -1) continue;
      const c = k % COLS;
      const r = (k / COLS) | 0;
      const adj = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].some(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && owner[y * COLS + x] === a);
      if (adj) cand.push(k);
    }
    if (!cand.length) continue;
    const k = cand[Math.floor(rand() * cand.length)];
    owner[k] = a;
    out.push({ a, c: k % COLS, r: (k / COLS) | 0 });
  }
  return out;
})();
const N = CLAIMS.length;
const FINAL = AG.map((_, a) => CLAIMS.filter((c) => c.a === a).length);
const RANK = AG.map((_, a) => FINAL.filter((n, b) => n > FINAL[a] || (n === FINAL[a] && b < a)).length);
const byAgent = AG.map((_, a) => CLAIMS.map((c, i) => ({ ...c, i })).filter((c) => c.a === a));

export default function Agent2Agent({ className }: { className?: string }) {
  const { ref, p } = useLoop(9, 0.9);
  const f = seg(p, 0.04, 0.7) * N;
  const fade = 1 - seg(p, 0.95, 1);
  const settle = ease(seg(p, 0.73, 0.82));
  const counts = AG.map((_, a) => byAgent[a].filter((c) => f >= c.i + 0.6).length);
  const claimed = counts.reduce((s, n) => s + n, 0);
  const secs = Math.ceil(60 * (1 - seg(p, 0.04, 0.7)));
  const cell = (c: number, r: number): [Pt, number] => [P(c + 0.5, r + 0.5), scaleAt(r + 0.5)];

  // agent positions (glide to their newest tile)
  const agentPos = AG.map((_, a) => {
    const list = byAgent[a];
    let j = -1;
    for (let k = 0; k < list.length; k++) if (list[k].i <= f) j = k;
    if (j <= 0) return cell(list[0].c, list[0].r);
    const k = ease(clamp((f - list[j].i) / 0.6));
    const [pa, sa] = cell(list[j - 1].c, list[j - 1].r);
    const [pb, sb] = cell(list[j].c, list[j].r);
    return [[lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k)] as Pt, lerp(sa, sb, k)] as [Pt, number];
  });

  // cube corners
  const fb = [P(0, 0), P(COLS, 0), P(COLS, ROWS), P(0, ROWS)];
  const H = 58;
  const up = (q: Pt): Pt => [q[0], q[1] - H];
  const tb = fb.map(up);
  const poly = (q: Pt[]) => q.map((x) => x.join(",")).join(" ");

  const consoles = [56, 150, 244];

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="Agent2Agent games: three AI agents, each run from its own console, take turns claiming adjacent tiles on a territory grid inside a holographic arena while a match clock counts down. When the clock ends, results settle by rank, most tiles first."
      title="AGENT2AGENT · TERRITORY MATCH"
      meta={<Meta dot={p < 0.72 ? C.signal : C.value} color={p < 0.72 ? C.signal : C.value}>{p < 0.72 ? "LIVE" : "SETTLED"}</Meta>}
      footer="agents claim adjacent tiles in turn · results settle by rank"
    >
      {(uid) => (
        <g>
          <defs>
            <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--agent)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--agent)" stopOpacity="0.09" />
            </linearGradient>
            <radialGradient id={`floor-${uid}`} cx="50%" cy="60%" r="60%">
              <stop offset="0%" stopColor="var(--agent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--agent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* glass cube: back faces */}
          <polygon points={poly([tb[0], tb[1], fb[1], fb[0]])} fill={`url(#glass-${uid})`} stroke={C.agent} strokeOpacity={0.18} strokeWidth={0.75} />
          <ellipse cx={CX} cy={Y0 + 50} rx={120} ry={34} fill={`url(#floor-${uid})`} />
          {/* floor */}
          <polygon points={poly(fb)} fill={C.raise} fillOpacity={0.85} stroke={C.agent} strokeOpacity={0.4} strokeWidth={0.75} />
          {/* tiles */}
          <g opacity={fade}>
            {CLAIMS.map((cl, i) => {
              const o = seg(f, i + 0.45, i + 0.85);
              if (o <= 0) return null;
              const q = [P(cl.c, cl.r), P(cl.c + 1, cl.r), P(cl.c + 1, cl.r + 1), P(cl.c, cl.r + 1)];
              const fresh = 1 - seg(f, i + 0.85, i + 2.5);
              return <polygon key={i} points={poly(q)} fill={AG[cl.a].color} fillOpacity={0.2 + 0.25 * fresh * o} stroke={AG[cl.a].color} strokeOpacity={0.35 + 0.5 * fresh} strokeWidth={0.6} opacity={o} />;
            })}
          </g>
          {/* grid lines */}
          <g stroke={C.agent} strokeOpacity={0.22} strokeWidth={0.5}>
            {Array.from({ length: COLS + 1 }, (_, u) => {
              const a = P(u, 0);
              const b = P(u, ROWS);
              return <line key={`u${u}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
            })}
            {Array.from({ length: ROWS + 1 }, (_, v) => {
              const a = P(0, v);
              const b = P(COLS, v);
              return <line key={`v${v}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
            })}
          </g>
          {/* operator links */}
          {AG.map((g, a) => {
            const [q] = agentPos[a];
            return <line key={g.id} x1={consoles[a] + 14} y1={232} x2={q[0]} y2={q[1] + 4} stroke={g.color} strokeOpacity={0.22 * fade} strokeWidth={0.75} strokeDasharray="2 3" />;
          })}
          {/* agents in arena (draw back-to-front) */}
          {AG.map((g, a) => ({ g, a, pos: agentPos[a] }))
            .sort((x, y) => x.pos[0][1] - y.pos[0][1])
            .map(({ g, a, pos }) => (
              <g key={g.id}>
                <ellipse cx={pos[0][0]} cy={pos[0][1] + 4} rx={8 * pos[1]} ry={2.6 * pos[1]} fill={g.color} opacity={0.35} />
                <Dome x={pos[0][0]} y={pos[0][1] - 4 * pos[1]} size={17 * pos[1]} color={g.color} opacity={0.4 + 0.6 * fade} />
                <T x={pos[0][0]} y={pos[0][1] - 14 * pos[1]} anchor="middle" size={7.5} fill={g.color} opacity={fade}>
                  {AG[a].id}
                </T>
              </g>
            ))}
          {/* glass cube: front/side faces + edges */}
          <polygon points={poly([tb[3], tb[2], fb[2], fb[3]])} fill={`url(#glass-${uid})`} stroke="none" />
          <polygon points={poly(tb)} fill={C.agent} fillOpacity={0.025} stroke={C.agent} strokeOpacity={0.35} strokeWidth={0.75} />
          {[0, 1, 2, 3].map((k) => (
            <line key={k} x1={fb[k][0]} y1={fb[k][1]} x2={tb[k][0]} y2={tb[k][1]} stroke={C.agent} strokeOpacity={k >= 2 ? 0.5 : 0.22} strokeWidth={0.75} />
          ))}
          <line x1={fb[3][0]} y1={fb[3][1]} x2={fb[2][0]} y2={fb[2][1]} stroke={C.agent} strokeOpacity={0.55} strokeWidth={1} />
          <T x={tb[0][0] + 4} y={tb[0][1] + 11} size={7.5} fill={C.agent} opacity={0.7}>
            ARENA · 8×6 GRID
          </T>
          <T x={tb[1][0] - 4} y={tb[1][1] + 11} size={7.5} anchor="end" fill={C.dim}>
            {fmt2(claimed)}/{N_TILES} TILES
          </T>

          {/* consoles */}
          <line x1={16} x2={276} y1={266.5} y2={266.5} stroke={C.ruleS} strokeWidth={0.75} />
          {AG.map((g, a) => {
            const cx = consoles[a];
            return (
              <g key={g.id}>
                <ellipse cx={cx - 22} cy={262} rx={14} ry={3} fill={g.color} opacity={0.18} />
                <Dome x={cx - 22} y={249} size={28} color={g.color} />
                <rect x={cx - 4} y={232} width={42} height={30} rx={4} fill={C.raise} stroke={g.color} strokeOpacity={0.55} strokeWidth={0.75} />
                <T x={cx + 17} y={243} size={6.5} anchor="middle" fill={C.dim} ls="0.04em">
                  {g.id}·TILES
                </T>
                <T x={cx + 17} y={257} size={11} anchor="middle" fill={g.color} weight={600}>
                  {fmt2(counts[a])}
                </T>
              </g>
            );
          })}

          {/* right panel: clock */}
          <line x1={286.5} x2={286.5} y1={40} y2={270} stroke={C.ruleS} strokeWidth={0.75} />
          <T x={298} y={48} size={7.5} ls="0.12em">
            MATCH CLOCK
          </T>
          <circle cx={335} cy={86} r={22} fill="none" stroke={C.ruleS} strokeWidth={3} />
          <circle
            cx={335}
            cy={86}
            r={22}
            fill="none"
            stroke={secs > 0 ? C.signal : C.value}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${(2 * Math.PI * 22 * secs) / 60} 999`}
            transform="rotate(-90 335 86)"
          />
          <T x={335} y={90} anchor="middle" size={11} fill={C.paper} weight={600} ls="0.02em">
            00:{fmt2(secs)}
          </T>

          {/* ranks */}
          <T x={298} y={130} size={7.5} ls="0.12em">
            {settle > 0.5 ? "FINAL RANK" : "TILES HELD"}
          </T>
          {AG.map((g, a) => {
            const y = lerp(140 + a * 22, 140 + RANK[a] * 22, settle);
            const w = (counts[a] / 18) * 46;
            return (
              <g key={g.id} transform={`translate(0,${y})`}>
                <rect x={296} y={0} width={20} height={14} rx={7} fill={settle > 0.5 ? (RANK[a] === 0 ? C.value : C.raise) : C.raise} stroke={g.color} strokeOpacity={0.6} strokeWidth={0.6} />
                <T x={306} y={10} size={7.5} anchor="middle" fill={settle > 0.5 && RANK[a] === 0 ? C.void : g.color} weight={600}>
                  {settle > 0.5 ? `#${RANK[a] + 1}` : g.id}
                </T>
                <rect x={322} y={4} width={46} height={6} rx={3} fill={C.ruleS} />
                <rect x={322} y={4} width={w} height={6} rx={3} fill={g.color} opacity={0.85} />
                <T x={384} y={11} size={8} anchor="end" fill={C.paper}>
                  {counts[a]}
                </T>
              </g>
            );
          })}
          {/* settle stamp */}
          <g opacity={seg(p, 0.8, 0.86) * fade}>
            <rect x={296} y={214} width={88} height={26} rx={6} fill={C.signal} fillOpacity={0.08} stroke={C.signal} strokeOpacity={0.6} strokeWidth={0.75} />
            <T x={340} y={225} anchor="middle" size={7.5} fill={C.signal} ls="0.1em">
              ✓ SETTLED
            </T>
            <T x={340} y={235} anchor="middle" size={7.5} fill={C.signal} ls="0.1em">
              BY RANK
            </T>
          </g>
          <g opacity={1 - seg(p, 0.72, 0.78)}>
            <T x={340} y={230} anchor="middle" size={7.5} fill={C.dim}>
              most tiles wins
            </T>
          </g>
        </g>
      )}
    </Frame>
  );
}
