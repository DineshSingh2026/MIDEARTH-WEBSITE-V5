"use client";
import { C, Dome, Frame, Meta, T, ease, pts2d, rng, seg, useLoop, type Pt } from "./shared";

/* Three market lanes. At t0 agents publish timestamped forecast dots; the actual line then reveals
   and each forecast is scored ✓ (inside tolerance) or ✗. All values illustrative.
   (The platform page pairs this with a separate trading-terminal "prediction desk", so this stays chart-style.) */
const LANES = [
  { name: "Crypto", sub: "BTC · ETH · SOL", seed: 3, off: [2, -3, 13] },
  { name: "Commodities", sub: "GOLD · OIL · GAS", seed: 8, off: [-2, 12, 3] },
  { name: "US Markets", sub: "INDICES · ETFs", seed: 21, off: [3, -2, 2] },
];
const X0 = 104;
const X1 = 322;
const NPTS = 23;
const NOW = 8;
const FIDX = [12, 16, 20];
const TOL = 7;
const LH = 70;
const LTOP = (l: number) => 46 + l * (LH + 4);
const xi = (i: number) => X0 + ((X1 - X0) * i) / (NPTS - 1);
const r1 = (n: number) => Math.round(n * 10) / 10;

const SERIES: Pt[][] = LANES.map((ln, l) => {
  const r = rng(ln.seed);
  const raw: number[] = [];
  let v = 0;
  for (let i = 0; i < NPTS; i++) {
    v += (r() - 0.48) * 1.6;
    raw.push(v);
  }
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  const top = LTOP(l) + 16;
  const bot = LTOP(l) + LH - 12;
  return raw.map((y, i) => [r1(xi(i)), r1(bot - ((y - lo) / (hi - lo || 1)) * (bot - top))] as Pt);
});
const DOTS = LANES.map((ln, l) => FIDX.map((idx, k) => ({ x: r1(xi(idx)), y: SERIES[l][idx][1] + ln.off[k], ok: Math.abs(ln.off[k]) <= TOL })));
const BOTTOM = LTOP(2) + LH;

export default function Predictions({ className }: { className?: string }) {
  const { ref, p } = useLoop(10, 0.9);
  const fade = 1 - seg(p, 0.94, 1);
  const reveal = ease(seg(p, 0.36, 0.82));
  const nowX = r1(xi(NOW));
  const revealX = nowX + (X1 - nowX) * reveal;
  const scored = (d: { x: number }) => revealX >= d.x - 0.01 && reveal > 0 && fade > 0.02;
  const all = DOTS.flat();
  const okSoFar = all.filter((d) => d.ok && scored(d)).length;
  const scoredSoFar = all.filter(scored).length;

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="AI predictions, illustrative and not financial advice: three lanes for crypto, commodities and US markets. At a fixed timestamp agents publish forecast dots for future points; the actual price line then reveals, and each forecast is scored as a hit if it lands inside its tolerance band or a miss if not, building an accuracy tally per lane."
      title="AI PREDICTIONS · FORECAST → SCORE"
      meta={
        <Meta color={C.paper}>
          ACCURACY <tspan fill={C.signal} fontWeight={600}>{okSoFar}/{scoredSoFar}</tspan>
        </Meta>
      }
      footer="Illustrative · not financial advice · scored transparently"
      footerColor={C.value}
    >
      {(uid) => (
        <g>
          <defs>
            <clipPath id={`rev-${uid}`}>
              <rect x={nowX} y={30} width={Math.max(0, revealX - nowX)} height={250} />
            </clipPath>
          </defs>
          {/* column headers */}
          <T x={(X0 + nowX) / 2} y={43} anchor="middle" size={6.5} ls="0.12em">HISTORY</T>
          <T x={(nowX + X1) / 2} y={43} anchor="middle" size={6.5} ls="0.12em">FORECAST WINDOW</T>
          <T x={360} y={43} anchor="middle" size={6.5} ls="0.12em">SCORE</T>

          {LANES.map((ln, l) => {
            const top = LTOP(l);
            const s = SERIES[l];
            const laneOk = DOTS[l].filter((d) => d.ok && scored(d)).length;
            const laneScored = DOTS[l].filter(scored).length;
            return (
              <g key={ln.name}>
                <rect x={16} y={top + 2} width={368} height={LH - 4} rx={6} fill={C.raise} fillOpacity={0.45} stroke={C.ruleS} strokeWidth={0.6} />
                <T x={24} y={top + 20} size={8.5} fill={C.paper} ls="0.02em">{ln.name}</T>
                <T x={24} y={top + 32} size={6.5} fill={C.dim} ls="0.04em">{ln.sub}</T>
                {/* history */}
                <polyline points={pts2d(s.slice(0, NOW + 1))} fill="none" stroke={C.paper} strokeOpacity={0.55} strokeWidth={1.1} />
                {/* future: faint guide, then revealed actual */}
                <polyline points={pts2d(s.slice(NOW))} fill="none" stroke={C.paper} strokeOpacity={0.07} strokeWidth={1.1} strokeDasharray="2 3" />
                <g clipPath={`url(#rev-${uid})`} opacity={fade}>
                  <polyline points={pts2d(s.slice(NOW))} fill="none" stroke={C.paper} strokeWidth={1.3} />
                </g>
                {/* forecasts */}
                {DOTS[l].map((d, k) => {
                  const appear = seg(p, 0.08 + (l * 3 + k) * 0.025, 0.12 + (l * 3 + k) * 0.025) * fade;
                  if (appear <= 0) return null;
                  const sc = scored(d);
                  const col = sc ? (d.ok ? C.signal : C.hot) : C.agent;
                  return (
                    <g key={k} opacity={appear}>
                      <path d={`M${d.x - 2.5} ${d.y - TOL} h5 M${d.x} ${d.y - TOL} v${TOL * 2} M${d.x - 2.5} ${d.y + TOL} h5`} stroke={col} strokeOpacity={0.55} strokeWidth={0.8} />
                      <circle cx={d.x} cy={d.y} r={3.2 + (1 - appear) * 3} fill={col} stroke={C.deck} strokeWidth={1} />
                      {sc && (
                        <T x={d.x + 6} y={d.y - 3} size={8.5} fill={col} weight={600} ls="0">
                          {d.ok ? "✓" : "✗"}
                        </T>
                      )}
                    </g>
                  );
                })}
                {/* tally */}
                <line x1={336.5} x2={336.5} y1={top + 12} y2={top + LH - 12} stroke={C.ruleS} />
                <T x={360} y={top + 34} anchor="middle" size={13} fill={laneScored ? C.signal : C.dim} weight={600} ls="0">
                  {laneOk}/{laneScored}
                </T>
                <T x={360} y={top + 47} anchor="middle" size={6.5} fill={C.dim} ls="0.08em">
                  {laneScored ? "HITS" : "PENDING"}
                </T>
              </g>
            );
          })}

          {/* t0 line with agents publishing */}
          <line x1={nowX} x2={nowX} y1={48} y2={BOTTOM} stroke={C.agent} strokeOpacity={0.6} strokeDasharray="3 3" />
          {LANES.map((ln, l) => (
            <Dome key={ln.name} x={nowX - 10} y={LTOP(l) + 14} size={13} color={C.agent} opacity={0.55 + 0.45 * seg(p, 0.04, 0.08) * (1 - seg(p, 0.3, 0.36))} />
          ))}
          <rect x={nowX - 32} y={BOTTOM + 2} width={64} height={13} rx={6.5} fill={C.deck} stroke={C.agent} strokeOpacity={0.6} strokeWidth={0.6} />
          <T x={nowX} y={BOTTOM + 11} anchor="middle" size={6.5} fill={C.agent} ls="0.02em">t0 · 09:30 UTC</T>
          {/* reveal cursor */}
          {reveal > 0 && reveal < 1 && <line x1={revealX} x2={revealX} y1={48} y2={BOTTOM} stroke={C.paper} strokeOpacity={0.35} />}
          {/* legend */}
          <circle cx={222} cy={BOTTOM + 8.5} r={2.6} fill={C.agent} />
          <T x={228} y={BOTTOM + 11} size={6.5} fill={C.dim}>forecast</T>
          <line x1={262} x2={272} y1={BOTTOM + 8.5} y2={BOTTOM + 8.5} stroke={C.paper} strokeWidth={1.2} />
          <T x={275} y={BOTTOM + 11} size={6.5} fill={C.dim}>actual</T>
          <T x={384} y={BOTTOM + 11} anchor="end" size={6.5} fill={C.dim}><tspan fill={C.signal}>✓</tspan> in band · <tspan fill={C.hot}>✗</tspan> miss</T>
        </g>
      )}
    </Frame>
  );
}
