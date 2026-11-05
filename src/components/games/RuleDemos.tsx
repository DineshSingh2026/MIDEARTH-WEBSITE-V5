"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUI } from "@/store/ui";

/**
 * Tiny looping rule illustrations. One ticker per demo, quantised to the 20Hz sim tick,
 * paused offscreen; reduced motion → one fixed, meaningful frame.
 */
function useLoop(periodSec: number, staticT: number) {
  const motion = useUI((s) => s.motion);
  const ref = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(staticT);
  useEffect(() => {
    if (!motion) {
      setT(staticT);
      return;
    }
    const el = ref.current;
    let vis = false;
    let raf = 0;
    let lastQ = -1;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = 0;
      if (!vis) return;
      const q = Math.floor((now - t0) / 50); // 20Hz
      if (q !== lastQ) {
        lastQ = q;
        setT(((q * 0.05) % periodSec) / periodSec);
      }
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !raf) raf = requestAnimationFrame(loop);
    });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [motion, periodSec, staticT]);
  return { ref, t };
}

const A = "var(--agent)";
const B = "var(--hot)";
const C3 = "var(--value)";
const T = 16; // tile px
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);

function Frame({ svgRef, children, label }: { svgRef: React.Ref<SVGSVGElement>; children: ReactNode; label?: string }) {
  return (
    <svg ref={svgRef} viewBox="0 0 132 64" className="h-auto w-full max-w-[200px] overflow-visible" aria-hidden>
      <rect x="0.5" y="0.5" width="131" height="63" fill="var(--deck)" stroke="var(--rule)" />
      {children}
      {label && (
        <text x="6" y="59" fontSize="5.5" fill="var(--paper-dim)" fontFamily="var(--font-mono)" letterSpacing="0.6">
          {label}
        </text>
      )}
    </svg>
  );
}

function Tiles({ n, y, fill }: { n: number; y: number; fill: (i: number) => { c?: string; o?: number } }) {
  const x0 = (132 - n * T) / 2;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const f = fill(i);
        return (
          <g key={i}>
            <rect x={x0 + i * T + 1} y={y + 1} width={T - 2} height={T - 2} fill={f.c ?? "transparent"} fillOpacity={f.o ?? 0} />
            <rect x={x0 + i * T + 0.5} y={y + 0.5} width={T - 1} height={T - 1} fill="none" stroke="var(--rule-strong)" strokeWidth="0.5" />
          </g>
        );
      })}
    </g>
  );
}

function Dot({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5.5} fill={c} opacity={0.18} />
      <circle cx={x} cy={y} r={2.2} fill={c} />
    </g>
  );
}

/* ── Territory ── */
function Claim() {
  const { ref, t } = useLoop(3.2, 0.8);
  const n = 6,
    x0 = (132 - n * T) / 2;
  const p = clamp01(t / 0.85) * n;
  return (
    <Frame svgRef={ref} label="NEUTRAL → CLAIMED · 0 TICKS">
      <Tiles n={n} y={18} fill={(i) => (i < Math.floor(p) || (i === Math.floor(p) && p < n) ? { c: A, o: i === Math.floor(p) ? 0.75 : 0.35 } : {})} />
      <Dot x={x0 + Math.min(p, n - 0.5) * T + (p < n ? 0 : 0)} y={26} c={A} />
    </Frame>
  );
}

function Flip() {
  const { ref, t } = useLoop(5, 0.45);
  // A: 0–0.5 successful flip of tile 1; B: 0.5–1 attempt on tile 4, step off at 50%
  const x0 = (132 - 6 * T) / 2;
  const tile = t < 0.5 ? 1 : 4;
  const local = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const arrive = ease(local / 0.2);
  let prog = 0;
  let ax = lerp(tile - 1, tile, arrive);
  if (t < 0.5) prog = clamp01((local - 0.2) / 0.55);
  else {
    prog = local < 0.6 ? clamp01((local - 0.2) / 0.55) : 0;
    if (local >= 0.6) ax = lerp(tile, tile + 1.2, ease((local - 0.6) / 0.2));
  }
  const flipped = t < 0.5 && prog >= 1;
  const cx = x0 + (tile + 0.5) * T,
    cy = 26;
  const r = 9;
  const ang = -Math.PI / 2 + prog * Math.PI * 2;
  return (
    <Frame svgRef={ref} label={t < 0.5 ? "HOLD 20 TICKS → FLIP" : "STEP OFF → PROGRESS RESETS"}>
      <Tiles n={6} y={18} fill={(i) => (i === 1 ? { c: t < 0.5 && !flipped ? B : A, o: 0.4 } : i === 4 ? { c: B, o: 0.4 } : i === 0 ? { c: A, o: 0.35 } : {})} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--paper-dim)" strokeOpacity={0.35} strokeWidth="0.6" />
      {prog > 0 && prog < 1 && (
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${prog > 0.5 ? 1 : 0} 1 ${cx + Math.cos(ang) * r} ${cy + Math.sin(ang) * r}`}
          fill="none"
          stroke={A}
          strokeWidth="1.6"
        />
      )}
      <text x={cx} y={cy - r - 3} fontSize="5" textAnchor="middle" fill="var(--paper-dim)" fontFamily="var(--font-mono)">
        {Math.round(prog * 20)}/20
      </text>
      <Dot x={x0 + (ax + 0.5) * T} y={cy} c={A} />
    </Frame>
  );
}

function Freeze() {
  const { ref, t } = useLoop(4, 0.55);
  const x0 = (132 - 6 * T) / 2;
  const meet = ease(t / 0.35);
  const leave = ease((t - 0.8) / 0.2);
  const pa = t < 0.8 ? lerp(0, 2.35, meet) : lerp(2.35, 0, leave);
  const pb = t < 0.8 ? lerp(5, 2.65, meet) : lerp(2.65, 5, leave);
  const frozen = t > 0.33 && t < 0.82;
  const shimmer = 0.5 + 0.5 * Math.sin(t * 60);
  return (
    <Frame svgRef={ref} label={frozen ? "2 AGENTS · 1 TILE · FROZEN" : "CONTESTED TILE"}>
      <defs>
        <pattern id="rd-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="var(--frost)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <Tiles n={6} y={18} fill={() => ({})} />
      {frozen && (
        <g opacity={0.6 + 0.4 * shimmer}>
          <rect x={x0 + 2 * T + 1} y={19} width={T - 2} height={T - 2} fill="url(#rd-hatch)" />
          <rect x={x0 + 2 * T + 0.5} y={18.5} width={T - 1} height={T - 1} fill="none" stroke="var(--frost)" strokeWidth="0.8" />
        </g>
      )}
      <Dot x={x0 + (pa + 0.5) * T} y={26} c={A} />
      <Dot x={x0 + (pb - 0.5) * T + T * 0} y={26} c={B} />
    </Frame>
  );
}

function Tick({ food = false }: { food?: boolean }) {
  const { ref, t } = useLoop(3, 0.5);
  const tick = Math.floor(t * 60);
  const cols = [A, B, C3];
  return (
    <Frame svgRef={ref} label={`TICK ${String(1200 + tick).padStart(4, "0")} · ALL AGENTS STEP TOGETHER`}>
      {Array.from({ length: 21 }, (_, i) => (
        <line key={i} x1={10 + i * 5.6} x2={10 + i * 5.6} y1={44} y2={i % 5 === 0 ? 38 : 41} stroke="var(--paper-dim)" strokeWidth="0.5" opacity={0.6} />
      ))}
      <line x1={10 + (tick % 21) * 5.6} x2={10 + (tick % 21) * 5.6} y1={36} y2={46} stroke="var(--signal)" strokeWidth="1" />
      {cols.map((c, k) => {
        const x = 14 + ((tick * (food ? 1.6 : 1.8) + k * 37) % 104);
        return <Dot key={k} x={x} y={12 + k * 8} c={c} />;
      })}
    </Frame>
  );
}

function TieBreak() {
  const { ref, t } = useLoop(4.5, 0.95);
  const ga = ease(t / 0.4),
    gb = ease((t - 0.15) / 0.5);
  const done = t > 0.72;
  const bar = (x: number, g: number, c: string, tickL: string, win: boolean) => (
    <g>
      <rect x={x} y={44 - g * 30} width={22} height={g * 30} fill={c} fillOpacity={0.4} stroke={c} strokeWidth="0.6" />
      <text x={x + 11} y={50} fontSize="5" textAnchor="middle" fill="var(--paper-dim)" fontFamily="var(--font-mono)">
        {g >= 1 ? tickL : ""}
      </text>
      {done && (
        <text x={x + 11} y={10} fontSize="6" textAnchor="middle" fill={win ? "var(--signal)" : "var(--paper-dim)"} fontFamily="var(--font-mono)">
          {win ? "#1" : "#2"}
        </text>
      )}
    </g>
  );
  return (
    <Frame svgRef={ref} label="EQUAL SCORE · EARLIER TICK WINS">
      {bar(36, ga, A, "t=812", true)}
      {bar(74, gb, B, "t=1004", false)}
    </Frame>
  );
}

/* ── Food ── */
const SPOTS = [
  [22, 18, 1],
  [48, 34, 3],
  [70, 14, 1],
  [96, 30, 5],
  [112, 16, 1],
  [36, 40, 3],
  [84, 42, 1],
] as const;
function Spawn() {
  const { ref, t } = useLoop(3.5, 1);
  return (
    <Frame svgRef={ref} label="CONTINUOUS SPAWN · VALUES 1 / 3 / 5">
      {SPOTS.map(([x, y, v], i) => {
        const k = ease((t - i * 0.11) / 0.12);
        const r = (1.6 + v * 0.7) * k;
        return (
          <g key={i} opacity={k}>
            <circle cx={x} cy={y} r={r * 2.4} fill={C3} opacity={0.12 + v * 0.03} />
            <path d={`M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`} fill={C3} />
            {v > 1 && (
              <text x={x + r + 2} y={y + 2} fontSize="5" fill="var(--paper-dim)" fontFamily="var(--font-mono)">
                {v}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

function Contact() {
  const { ref, t } = useLoop(3.6, 0.62);
  const tx = 72,
    ty = 26;
  const ka = ease(t / 0.5),
    kb = ease(t / 0.75);
  const ax = lerp(14, tx - 4, ka),
    bx = lerp(124, tx + 5, kb);
  const taken = t >= 0.5;
  const bp = clamp01((t - 0.5) / 0.3);
  return (
    <Frame svgRef={ref} label={taken ? "FIRST CONTACT TAKES IT · +3" : "EXCLUSIVE CONTACT"}>
      {!taken && <path d={`M ${tx} ${ty - 4} L ${tx + 4} ${ty} L ${tx} ${ty + 4} L ${tx - 4} ${ty} Z`} fill={C3} />}
      {taken && bp < 1 && (
        <g>
          <circle cx={tx} cy={ty} r={3 + bp * 14} fill="none" stroke={A} strokeWidth={1.4 * (1 - bp)} />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={tx + Math.cos(a) * (2 + bp * 6)}
                y1={ty + Math.sin(a) * (2 + bp * 6)}
                x2={tx + Math.cos(a) * (4 + bp * 12)}
                y2={ty + Math.sin(a) * (4 + bp * 12)}
                stroke={i % 3 ? A : "var(--paper)"}
                strokeWidth="0.8"
                opacity={1 - bp}
              />
            );
          })}
        </g>
      )}
      <Dot x={ax} y={ty} c={A} />
      <Dot x={bx} y={ty} c={B} />
    </Frame>
  );
}

function Path() {
  const { ref, t } = useLoop(4, 0.99);
  const k = ease(t / 0.8);
  // efficient: straight through two tokens; wasteful: big detour
  const eff = (s: number) => (s < 0.5 ? [lerp(12, 66, s * 2), lerp(46, 20, s * 2)] : [lerp(66, 118, (s - 0.5) * 2), lerp(20, 12, (s - 0.5) * 2)]);
  const waste = (s: number) => [lerp(12, 80, s), 46 - Math.sin(s * Math.PI) * 4 + Math.sin(s * 9) * 6];
  const pts = (f: (s: number) => number[], upto: number) =>
    Array.from({ length: 24 }, (_, i) => f((i / 23) * upto))
      .map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  const [ex, ey] = eff(k),
    [wx, wy] = waste(k);
  return (
    <Frame svgRef={ref} label="SAME SPEED · SHORTER PATH SCORES MORE">
      {k < 0.5 && <path d="M 66 16 L 70 20 L 66 24 L 62 20 Z" fill={C3} />}
      {k < 1 && <path d="M 118 8 L 122 12 L 118 16 L 114 12 Z" fill={C3} />}
      <path d={pts(eff, k)} fill="none" stroke={A} strokeWidth="1" opacity={0.7} />
      <path d={pts(waste, k)} fill="none" stroke={B} strokeWidth="1" opacity={0.7} strokeDasharray="2 2" />
      <Dot x={ex} y={ey} c={A} />
      <Dot x={wx} y={wy} c={B} />
    </Frame>
  );
}

function TickT() {
  return <Tick />;
}
function TickF() {
  return <Tick food />;
}
export const TERRITORY_DEMOS = [Claim, Flip, Freeze, TickT];
export const FOOD_DEMOS = [Spawn, Contact, Path, TickF];
export { TieBreak };
