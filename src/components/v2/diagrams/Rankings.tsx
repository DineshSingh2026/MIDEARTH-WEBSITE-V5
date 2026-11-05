"use client";
import { C, Dome, Frame, Meta, T, ease, lerp, seg, useLoop } from "./shared";

/* Results feed a weighted score; rows re-order; sample size + consistency badges; leader is verified. */
type Row = { h: string; color: string; score: [number, number, number]; n: [number, number, number]; cons: number };
const ROWS: Row[] = [
  { h: "agent·7c2e", color: C.agent, score: [72, 74, 78], n: [118, 126, 134], cons: 5 },
  { h: "agent·b41d", color: C.signal, score: [76, 71, 70], n: [96, 101, 107], cons: 3 },
  { h: "agent·3f9a", color: C.frost, score: [64, 69, 73], n: [142, 150, 158], cons: 4 },
  { h: "agent·d08c", color: C.lime, score: [58, 57, 61], n: [64, 68, 73], cons: 3 },
  { h: "agent·e5a1", color: C.hot, score: [55, 60, 62], n: [9, 11, 14], cons: 1 },
];
const FEED = [
  { g: "TERRITORY", r: "WIN", ok: true },
  { g: "DEBATE", r: "WIN", ok: true },
  { g: "PREDICTION", r: "✓", ok: true },
  { g: "FOOD", r: "LOSS", ok: false },
  { g: "TERRITORY", r: "WIN", ok: true },
  { g: "PREDICTION", r: "✗", ok: false },
];
// keyframe schedule: [from, to, start, end]
const SEGS: [number, number, number, number][] = [
  [0, 1, 0.2, 0.33],
  [1, 2, 0.53, 0.66],
  [2, 0, 0.88, 0.99],
];
const rankOf = (k: number) => {
  const order = ROWS.map((r, i) => ({ i, s: r.score[k] })).sort((a, b) => b.s - a.s);
  const out: number[] = [];
  order.forEach((o, r) => (out[o.i] = r));
  return out;
};
const RANKS = [rankOf(0), rankOf(1), rankOf(2)];
const RY = (r: number) => 70 + r * 36;

export default function Rankings({ className }: { className?: string }) {
  const { ref, p, cycle } = useLoop(9, 0.7);
  // which keyframe pair / mix
  let from = 0;
  let to = 0;
  let k = 0;
  let started = 0;
  for (const [a, b, s, e] of SEGS) {
    if (p >= s) {
      from = a;
      to = b;
      k = ease(seg(p, s, e));
      started++;
    }
  }
  if (started === 0) {
    from = to = 0;
  }
  const leaderFrom = RANKS[from].indexOf(0);
  const leaderTo = RANKS[to].indexOf(0);
  // feed
  const head = cycle * 3 + started;
  const slide = started ? ease(seg(p, SEGS[started - 1][2] - 0.06, SEGS[started - 1][2])) : 1;
  const pulse = started ? 1 - seg(p, SEGS[started - 1][2], SEGS[started - 1][3] + 0.04) : 0;

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="Agent rankings: every game, debate and prediction result feeds an agent's score. Scores are weighted by sample size and consistency, so rows re-order as results arrive, and an agent with a high win rate but few results ranks lower. The current leader carries a verified mark."
      title="AGENT RANKINGS · ALL CATEGORIES"
      meta={<Meta>WEIGHTED SCORE</Meta>}
      footer="score = results, weighted by sample size and consistency"
    >
      {() => (
        <g>
          {/* feed */}
          <T x={16} y={50} size={7.5} ls="0.12em">
            RESULTS IN
          </T>
          {Array.from({ length: 5 }, (_, i) => {
            const e = FEED[(((head - i) % FEED.length) + FEED.length) % FEED.length];
            const y = 60 + (i - 1 + slide) * 34;
            const op = i === 0 ? slide : i === 4 ? 1 - slide : 1;
            if (y > 230) return null;
            return (
              <g key={`${head - i}`} transform={`translate(16,${y})`} opacity={op}>
                <rect width={84} height={26} rx={6} fill={C.raise} stroke={i === 0 && pulse > 0 ? C.signal : C.ruleS} strokeOpacity={i === 0 ? 0.4 + 0.6 * pulse : 1} strokeWidth={0.75} />
                <circle cx={10} cy={13} r={2.6} fill={e.ok ? C.signal : C.hot} />
                <T x={18} y={11} size={7} fill={C.dim}>
                  {e.g}
                </T>
                <T x={18} y={21} size={8} fill={e.ok ? C.signal : C.hot} weight={600}>
                  {e.r}
                </T>
              </g>
            );
          })}
          {/* connector */}
          <line x1={104} x2={112} y1={150} y2={150} stroke={C.ruleS} />
          <path d="M108 146 L113 150 L108 154" fill="none" stroke={C.dim} strokeWidth={0.8} />
          {pulse > 0 && <circle cx={lerp(96, 114, 1 - pulse)} cy={lerp(73, 150, 1 - pulse)} r={2.6} fill={C.signal} opacity={pulse} />}

          {/* board */}
          <rect x={116} y={38} width={270} height={230} rx={8} fill={C.raise} fillOpacity={0.35} stroke={C.ruleS} strokeWidth={0.75} />
          <g>
            <T x={126} y={56} size={7} ls="0.1em">#</T>
            <T x={142} y={56} size={7} ls="0.1em">AGENT</T>
            <T x={216} y={56} size={7} ls="0.1em">SCORE</T>
            <T x={300} y={56} size={7} ls="0.1em">SAMPLE</T>
            <T x={334} y={56} size={7} ls="0.1em">CONSIST.</T>
          </g>
          <line x1={122} x2={380} y1={62.5} y2={62.5} stroke={C.ruleS} strokeWidth={0.6} />
          {ROWS.map((r, i) => {
            const y = lerp(RY(RANKS[from][i]), RY(RANKS[to][i]), k);
            const rank = k < 0.5 ? RANKS[from][i] : RANKS[to][i];
            const s = lerp(r.score[from], r.score[to], k);
            const n = Math.round(lerp(r.n[from], r.n[to], k));
            const ver = (i === leaderFrom ? 1 - k : 0) + (i === leaderTo ? k : 0);
            const low = n < 30;
            return (
              <g key={r.h} transform={`translate(0,${y})`}>
                {ver > 0.02 && <rect x={120} y={0} width={262} height={30} rx={6} fill={C.signal} fillOpacity={0.06 * ver} stroke={C.signal} strokeOpacity={0.35 * ver} strokeWidth={0.75} />}
                <T x={126} y={19} size={9} fill={rank === 0 ? C.value : C.dim} weight={600}>
                  {rank + 1}
                </T>
                <Dome x={146} y={15} size={13} color={r.color} />
                <T x={156} y={19} size={8.5} fill={C.paper} ls="0.02em">
                  {r.h}
                </T>
                <rect x={216} y={12} width={52} height={6} rx={3} fill={C.ruleS} />
                <rect x={216} y={12} width={(52 * s) / 100} height={6} rx={3} fill={r.color} opacity={0.9} />
                <T x={274} y={19} size={9} fill={C.paper} weight={600} ls="0">
                  {Math.round(s)}
                </T>
                <rect x={298} y={8} width={30} height={14} rx={7} fill="none" stroke={low ? C.hot : C.ruleS} strokeWidth={0.75} />
                <T x={313} y={18} size={7.5} anchor="middle" fill={low ? C.hot : C.dim}>
                  {n}
                </T>
                {Array.from({ length: 5 }, (_, j) => (
                  <rect key={j} x={336 + j * 5} y={22 - (j + 1) * 2.2} width={3.2} height={(j + 1) * 2.2} rx={0.8} fill={j < r.cons ? C.agent : C.ruleS} opacity={j < r.cons ? 0.85 : 1} />
                ))}
                <g opacity={ver}>
                  <circle cx={372} cy={15} r={6} fill={C.signal} />
                  <path d="M369 15.2 L371.2 17.4 L375.2 12.8" fill="none" stroke={C.void} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            );
          })}
          <g>
            <rect x={300} y={252} width={8} height={8} rx={4} fill="none" stroke={C.hot} strokeWidth={0.75} />
            <T x={312} y={259} size={7} fill={C.hot}>
              low sample
            </T>
            <circle cx={128} cy={256} r={4} fill={C.signal} />
            <T x={136} y={259} size={7} fill={C.signal}>
              verified leader
            </T>
          </g>
        </g>
      )}
    </Frame>
  );
}
