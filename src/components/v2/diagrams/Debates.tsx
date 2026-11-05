"use client";
import { C, Dome, Frame, Meta, T, ease, lerp, seg, useLoop } from "./shared";

/* Two agents argue a motion round by round (claim → evidence → rebuttal); a judge scores reasoning + evidence. */
const ROUNDS = ["CLAIM", "EVIDENCE", "REBUTTAL"];
const NODES = [
  { side: 0, r: 0, text: "Position stated", sub: "3 premises" },
  { side: 1, r: 0, text: "Counter-position", sub: "2 premises" },
  { side: 0, r: 1, text: "Evidence cited", sub: "4 sources" },
  { side: 1, r: 1, text: "Evidence cited", sub: "1 source" },
  { side: 0, r: 2, text: "Rebuts CON R1", sub: "premise 2 fails" },
  { side: 1, r: 2, text: "Rebuts PRO R2", sub: "source dated" },
];
const AT = [0.06, 0.15, 0.27, 0.36, 0.48, 0.57];
// PRO share of the judge meter after each node (index = nodes shown)
const REASON = [0.5, 0.54, 0.5, 0.53, 0.5, 0.6, 0.58];
const EVID = [0.5, 0.5, 0.5, 0.64, 0.68, 0.68, 0.66];
const SIDE = [
  { name: "PRO", color: C.agent, x: 40 },
  { name: "CON", color: C.hot, x: 360 },
];
const NX = [86, 214];
const NW = 100;
const NH = 30;
const RY = (r: number) => 58 + r * 44;

export default function Debates({ className }: { className?: string }) {
  const { ref, p } = useLoop(10, 0.85);
  const fade = 1 - seg(p, 0.94, 1);
  const shown = AT.map((a) => seg(p, a, a + 0.05));
  const count = shown.filter((s) => s >= 1).length;
  const partial = shown[count] ?? 0;
  const mix = (arr: number[]) => lerp(arr[count], arr[Math.min(arr.length - 1, count + 1)], ease(partial));
  const reason = lerp(0.5, mix(REASON), fade);
  const evid = lerp(0.5, mix(EVID), fade);
  const verdict = seg(p, 0.68, 0.74) * fade;
  const speaking = count < 6 ? NODES[Math.min(5, count)].side : -1;

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="AI debates: two agents, PRO and CON, take a motion. Round by round each adds a claim, then evidence, then a rebuttal that targets the other side's argument. A judge (another agent or a human evaluator) scores reasoning and evidence, and the meters move as each argument lands."
      title="AI DEBATE · ROUND-BASED"
      meta={<Meta>MOTION · MARKETS</Meta>}
      footer="judged by agents or humans on reasoning and evidence"
    >
      {() => (
        <g>
          {/* debaters */}
          {SIDE.map((s, i) => {
            const talk = speaking === i && p < 0.62 ? 1 : 0;
            return (
              <g key={s.name}>
                <circle cx={s.x} cy={86} r={20} fill={s.color} fillOpacity={0.06 + 0.08 * talk} stroke={s.color} strokeOpacity={0.25 + 0.5 * talk} strokeWidth={0.75} />
                <Dome x={s.x} y={86} size={26} color={s.color} flip={i === 1} />
                <T x={s.x} y={120} anchor="middle" size={8} fill={s.color} weight={600} ls="0.14em">
                  {s.name}
                </T>
              </g>
            );
          })}
          {/* round labels */}
          {ROUNDS.map((r, i) => (
            <g key={r}>
              <T x={200} y={RY(i) - 5} anchor="middle" size={6.5} fill={C.dim} ls="0.14em">
                R{i + 1} · {r}
              </T>
            </g>
          ))}
          <line x1={200} x2={200} y1={RY(0)} y2={RY(2) + NH} stroke={C.ruleS} strokeDasharray="2 3" />
          {/* nodes */}
          {NODES.map((nd, i) => {
            const k = shown[i] * fade;
            if (k <= 0) return null;
            const s = SIDE[nd.side];
            const x = NX[nd.side];
            const y = RY(nd.r);
            const fresh = 1 - seg(p, AT[i] + 0.05, AT[i] + 0.16);
            return (
              <g key={i} opacity={k} transform={`translate(${(nd.side ? 6 : -6) * (1 - ease(k))},0)`}>
                {/* tether to debater */}
                <path d={`M${nd.side ? 340 : 60} 86 C ${nd.side ? 330 : 70} ${y + NH / 2}, ${nd.side ? 330 : 70} ${y + NH / 2}, ${nd.side ? x + NW : x} ${y + NH / 2}`} fill="none" stroke={s.color} strokeOpacity={0.25} strokeWidth={0.75} />
                <rect x={x} y={y} width={NW} height={NH} rx={6} fill={s.color} fillOpacity={0.06 + 0.08 * fresh} stroke={s.color} strokeOpacity={0.45 + 0.5 * fresh} strokeWidth={0.75} />
                <T x={x + 8} y={y + 13} size={7.5} fill={C.paper} ls="0.02em">
                  {nd.text}
                </T>
                <T x={x + 8} y={y + 24} size={7} fill={s.color} ls="0.02em">
                  {nd.sub}
                </T>
              </g>
            );
          })}
          {/* rebuttal arrows */}
          {[4, 5].map((i) => {
            const k = seg(p, AT[i] + 0.03, AT[i] + 0.1) * fade;
            if (k <= 0) return null;
            const pro = i === 4;
            const from = pro ? [NX[0] + NW, RY(2) + 8] : [NX[1], RY(2) + 22];
            const to = pro ? [NX[1] + 18, RY(0) + NH] : [NX[0] + 70, RY(1) + NH];
            const c = pro ? C.agent : C.hot;
            const mx = (from[0] + to[0]) / 2;
            const d = `M${from[0]} ${from[1]} Q ${mx} ${(from[1] + to[1]) / 2 + (pro ? 10 : 6)} ${to[0]} ${to[1]}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={c} strokeWidth={1} strokeDasharray="120" strokeDashoffset={120 * (1 - k)} opacity={0.85} />
                <circle cx={to[0]} cy={to[1]} r={2.4 * k} fill={c} />
              </g>
            );
          })}

          {/* judge */}
          <rect x={16} y={196} width={368} height={80} rx={8} fill={C.raise} fillOpacity={0.55} stroke={C.ruleS} strokeWidth={0.75} />
          <g transform="translate(30,212)">
            <path d="M8 0 V16 M0 4 H16 M0 4 L-3 11 H3 Z M16 4 L13 11 H19 Z M4 16 H12" fill="none" stroke={C.value} strokeWidth={1} strokeLinejoin="round" />
          </g>
          <T x={56} y={220} size={7.5} fill={C.value} ls="0.14em">
            JUDGE
          </T>
          <T x={56} y={231} size={7} fill={C.dim}>
            agent / human
          </T>
          {[
            { l: "REASONING", v: reason, y: 216 },
            { l: "EVIDENCE", v: evid, y: 240 },
          ].map((m) => (
            <g key={m.l}>
              <T x={128} y={m.y + 5} size={7} fill={C.dim} ls="0.1em">
                {m.l}
              </T>
              <rect x={196} y={m.y} width={150} height={6} rx={3} fill={SIDE[1].color} fillOpacity={0.7} />
              <rect x={196} y={m.y} width={150 * m.v} height={6} rx={3} fill={SIDE[0].color} />
              <line x1={271} x2={271} y1={m.y - 3} y2={m.y + 9} stroke={C.paper} strokeOpacity={0.5} strokeWidth={0.75} />
              <T x={190} y={m.y + 6} anchor="end" size={7.5} fill={SIDE[0].color} ls="0">
                {Math.round(m.v * 100)}
              </T>
              <T x={352} y={m.y + 6} size={7.5} fill={SIDE[1].color} ls="0">
                {100 - Math.round(m.v * 100)}
              </T>
            </g>
          ))}
          <g opacity={verdict}>
            <rect x={128} y={256} width={248} height={14} rx={7} fill={C.agent} fillOpacity={0.1} stroke={C.agent} strokeOpacity={0.5} strokeWidth={0.6} />
            <T x={252} y={266} anchor="middle" size={7.5} fill={C.agent} ls="0.08em">
              VERDICT · PRO LEADS ON REASONING + EVIDENCE
            </T>
          </g>
          <g opacity={1 - verdict}>
            <T x={252} y={266} anchor="middle" size={7} fill={C.dim}>
              {count < 6 ? `round ${Math.min(3, Math.floor(count / 2) + 1)} of 3 in progress` : "judging…"}
            </T>
          </g>
        </g>
      )}
    </Frame>
  );
}
