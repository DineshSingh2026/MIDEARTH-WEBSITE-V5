"use client";
import { C, Dome, Frame, T, along, ease, quad, seg, useLoop, type Pt } from "./shared";

/* Agents in hex pods around a shared memory core. They read (cyan) and write (green) memory packets;
   every write is committed to a chained, on-chain record in front. */
const CX = 200;
const CY = 108;
const A = 26; // iso half-width
const B = 15; // iso half-depth
const H = 30; // height

const PODS: { at: Pt; label: string; to: Pt; ctrl: Pt }[] = [
  { at: [56, 92], label: "MARKETS", to: [CX - A, CY + 10], ctrl: [120, 92] },
  { at: [124, 54], label: "RESEARCH", to: [CX - 10, CY - 22], ctrl: [150, 54] },
  { at: [276, 54], label: "STRATEGY", to: [CX + 10, CY - 22], ctrl: [250, 54] },
  { at: [344, 92], label: "GAMES", to: [CX + A, CY + 10], ctrl: [280, 92] },
  { at: [338, 186], label: "SCIENCE", to: [CX + A, CY + 24], ctrl: [290, 196] },
  { at: [62, 186], label: "DATASETS", to: [CX - A, CY + 24], ctrl: [110, 196] },
];
const PATHS = PODS.map((p) => quad([p.at[0] + (p.at[0] < CX ? 16 : -16), p.at[1] + 4], p.ctrl, p.to));
const EVENTS = 12;
const isWrite = (j: number) => (j + Math.floor(j / 6)) % 2 === 0;
const TRAVEL = 0.075;
const COMMIT = 0.05;
const writesBefore = (j: number) => Array.from({ length: j }, (_, k) => k).filter(isWrite).length;
const WPL = writesBefore(EVENTS);
const BLOCK_W = 32;
const BLOCK_GAP = 12;
const CHAIN_X = 96;
const CHAIN_Y = 230;

const hex = (x: number, y: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

export default function ContextPools({ className }: { className?: string }) {
  const { ref, p, t, cycle } = useLoop(12, 0.62);

  // event states
  let committed = 0;
  let commitK = 1;
  let reads = 0;
  let writes = 0;
  let corePulse = 0;
  const podFlash = PODS.map(() => ({ c: "", k: 0 }));
  const packets: { q: Pt; c: string }[] = [];
  for (let j = 0; j < EVENTS; j++) {
    const s = j / EVENTS;
    const pod = j % 6;
    const w = isWrite(j);
    const k = seg(p, s, s + TRAVEL);
    if (k > 0 && k < 1) packets.push({ q: along(PATHS[pod], w ? ease(k) : 1 - ease(k)), c: w ? C.signal : C.agent });
    if (k >= 1) {
      if (w) writes++;
      else reads++;
    }
    // flashes
    const fl = w ? (p >= s ? 1 - seg(p, s, s + 0.06) : 0) : seg(p, s + TRAVEL - 0.01, s + TRAVEL) * (1 - seg(p, s + TRAVEL, s + TRAVEL + 0.06));
    if (fl > podFlash[pod].k) podFlash[pod] = { c: w ? C.signal : C.agent, k: fl };
    if (w) {
      corePulse = Math.max(corePulse, seg(p, s + TRAVEL - 0.01, s + TRAVEL) * (1 - seg(p, s + TRAVEL, s + TRAVEL + 0.06)));
      const c = seg(p, s + TRAVEL, s + TRAVEL + COMMIT);
      if (c >= 1) committed++;
      else if (c > 0) {
        commitK = c;
        packets.push({ q: along([[CX, CY + 68], [CX, 214], [CHAIN_X + 4 * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2, 214], [CHAIN_X + 4 * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2, CHAIN_Y]], ease(c)), c: C.signal });
      }
    }
  }
  const total = cycle * WPL + committed; // committed blocks so far
  const slide = commitK < 1 ? ease(commitK) : 1;
  const inFlight = commitK < 1;

  // iso cube
  const top = [[CX, CY - B * 2 + 4], [CX + A, CY - B + 4], [CX, CY + 4], [CX - A, CY - B + 4]] as Pt[];
  const lift = (q: Pt[], dy: number) => q.map(([x, y]) => `${x},${y + dy}`).join(" ");
  const faceL = (y0: number, y1: number) => `${CX - A},${CY - B + 4 + y0} ${CX},${CY + 4 + y0} ${CX},${CY + 4 + y1} ${CX - A},${CY - B + 4 + y1}`;
  const faceR = (y0: number, y1: number) => `${CX},${CY + 4 + y0} ${CX + A},${CY - B + 4 + y0} ${CX + A},${CY - B + 4 + y1} ${CX},${CY + 4 + y1}`;

  return (
    <Frame
      className={className}
      loopRef={ref}
      label="Mega context pools: six domain agents in pods around a shared memory core. Agents read memory packets from the pool and write new ones back; each write is committed as a new block in an on-chain record, so the shared context keeps growing."
      title="CONTEXT POOL · SHARED MEMORY"
      meta={
        <g>
          <circle cx={290} cy={19} r={2.6} fill={C.agent} />
          <T x={296} y={22} size={8} fill={C.agent}>READ</T>
          <circle cx={334} cy={19} r={2.6} fill={C.signal} />
          <T x={340} y={22} size={8} fill={C.signal}>WRITE</T>
        </g>
      }
      footer="agents read and write shared memory · every write is recorded on-chain"
    >
      {(uid) => (
        <g>
          <defs>
            <radialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--agent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--agent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* orbit rings */}
          <ellipse cx={CX} cy={CY + 30} rx={170} ry={92} fill="none" stroke={C.agent} strokeOpacity={0.08} />
          <ellipse cx={CX} cy={CY + 30} rx={120} ry={64} fill="none" stroke={C.agent} strokeOpacity={0.1} strokeDasharray="2 4" />
          {/* channels */}
          {PATHS.map((pa, i) => (
            <polyline key={i} points={pa.map((q) => q.join(",")).join(" ")} fill="none" stroke={C.agent} strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 3" />
          ))}
          <polyline points={`${CX},${CY + 68} ${CX},214 ${CHAIN_X + 4 * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2},214 ${CHAIN_X + 4 * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2},${CHAIN_Y}`} fill="none" stroke={C.signal} strokeOpacity={0.25} strokeDasharray="2 3" />
          {/* core glow + platform */}
          <ellipse cx={CX} cy={CY + 8} rx={70} ry={50} fill={`url(#core-${uid})`} opacity={0.7 + 0.5 * corePulse} />
          <polygon points={`${CX},${CY + 12} ${CX + 52},${CY + 40} ${CX},${CY + 68} ${CX - 52},${CY + 40}`} fill={C.agent} fillOpacity={0.05} stroke={C.agent} strokeOpacity={0.35} strokeWidth={0.75} />
          {/* data rain above core */}
          {[-14, -6, 2, 10, 18].map((dx, i) => {
            const y0 = CY - 54;
            const off = (t * 10 + i * 7) % 14;
            return <line key={i} x1={CX + dx - 2} x2={CX + dx - 2} y1={y0} y2={CY - 22} stroke={C.agent} strokeOpacity={0.3} strokeWidth={0.6} strokeDasharray="2 12" strokeDashoffset={off} />;
          })}
          {/* cube: 3 memory layers */}
          {[0, 1, 2].map((l) => {
            const y0 = H - (l + 1) * (H / 3);
            const y1 = H - l * (H / 3);
            return (
              <g key={l}>
                <polygon points={faceL(y0 + 0.6, y1 - 0.6)} fill={C.agent} fillOpacity={0.16 + 0.06 * l + 0.25 * corePulse} stroke={C.agent} strokeOpacity={0.6} strokeWidth={0.5} />
                <polygon points={faceR(y0 + 0.6, y1 - 0.6)} fill={C.agent} fillOpacity={0.1 + 0.05 * l + 0.2 * corePulse} stroke={C.agent} strokeOpacity={0.6} strokeWidth={0.5} />
              </g>
            );
          })}
          <polygon points={lift(top, 0)} fill={C.frost} fillOpacity={0.22 + 0.3 * corePulse} stroke={C.frost} strokeOpacity={0.8} strokeWidth={0.6} />
          <T x={CX} y={CY + 56} anchor="middle" size={7} fill={C.agent} ls="0.12em">
            SHARED MEMORY
          </T>

          {/* pods */}
          {PODS.map((pd, i) => {
            const fl = podFlash[i];
            const [x, y] = pd.at;
            return (
              <g key={pd.label}>
                <ellipse cx={x} cy={y + 16} rx={22} ry={6} fill="none" stroke={fl.k > 0 ? fl.c : C.agent} strokeOpacity={0.25 + 0.6 * fl.k} />
                <polygon points={hex(x, y, 16)} fill={C.raise} fillOpacity={0.7} stroke={fl.k > 0 ? fl.c : C.agent} strokeOpacity={0.4 + 0.6 * fl.k} strokeWidth={0.75} />
                <Dome x={x} y={y + 1} size={17} color={C.agent} />
                <T x={x} y={y + 32} anchor="middle" size={7} fill={C.dim} ls="0.1em">
                  {pd.label}
                </T>
              </g>
            );
          })}

          {/* packets */}
          {packets.map((pk, i) => (
            <g key={i}>
              <circle cx={pk.q[0]} cy={pk.q[1]} r={5} fill={pk.c} opacity={0.18} />
              <rect x={pk.q[0] - 2.6} y={pk.q[1] - 2.6} width={5.2} height={5.2} rx={1} fill={pk.c} />
            </g>
          ))}

          {/* on-chain record */}
          <T x={CHAIN_X - 4} y={CHAIN_Y - 6} size={7} ls="0.12em">
            ON-CHAIN RECORD
          </T>
          <T x={CHAIN_X + 5 * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP + 4} y={CHAIN_Y - 6} anchor="end" size={7} fill={C.dim}>
            writes {writes} · reads {reads}
          </T>
          <g>
            {Array.from({ length: 6 }, (_, k) => {
              // k=0 is the newest (rightmost) block; a block in flight pushes the row left
              const id = total + (inFlight ? 1 : 0) - k;
              const pos = 4 - k + (inFlight ? 1 - slide : 0);
              const x = CHAIN_X + pos * (BLOCK_W + BLOCK_GAP);
              const op = pos < 0 ? Math.max(0, 1 + pos) : k === 0 && inFlight ? slide : 1;
              if (op <= 0 || pos > 4.01) return null;
              const fresh = k === 0 ? (inFlight ? 1 : 0.4) : 0;
              return (
                <g key={id} opacity={op}>
                  {pos > 0.1 && <line x1={x - BLOCK_GAP} x2={x} y1={CHAIN_Y + 11} y2={CHAIN_Y + 11} stroke={C.agent} strokeOpacity={0.5} strokeDasharray="2 2" />}
                  <rect x={x} y={CHAIN_Y} width={BLOCK_W} height={22} rx={3} fill={C.raise} stroke={fresh ? C.signal : C.agent} strokeOpacity={0.4 + 0.5 * fresh} strokeWidth={0.75} />
                  <rect x={x + 3} y={CHAIN_Y + 3} width={BLOCK_W - 6} height={16} rx={2} fill={fresh ? C.signal : C.agent} fillOpacity={0.06 + 0.12 * fresh} />
                  <T x={x + BLOCK_W / 2} y={CHAIN_Y + 14} anchor="middle" size={7} fill={fresh ? C.signal : C.dim} ls="0">
                    #{1040 + id}
                  </T>
                </g>
              );
            })}
          </g>
        </g>
      )}
    </Frame>
  );
}
