"use client";
import { useEffect, useRef, useState } from "react";
import { Mascot, type MascotKind } from "@/components/brand/Mascot";
import { HOME } from "@/content/copy/home";
import { useUI } from "@/store/ui";

/**
 * The four minds as an engineering drawing that assembles itself:
 * frame → registration marks → centre lines → outlines (stroke-draw) → bodies → dimensions → callouts → title block.
 * Pure SVG + CSS. With reduced motion every animation resolves instantly to the finished sheet.
 */

const NODES = HOME.minds.nodes;
const W = 1200;
const H = 780;

type Part = { kind: MascotKind; cx: number; cy: number; h: number };
const EXEC: Part = { kind: "exec", cx: 600, cy: 190, h: 124 };
const LOWER: Part[] = [
  { kind: "play", cx: 300, cy: 470, h: 100 },
  { kind: "track", cx: 600, cy: 470, h: 100 },
  { kind: "funds", cx: 900, cy: 470, h: 100 },
];

/** Outline geometry for each mascot body in its own 120×100 space (mirrors components/brand/Mascot). */
export function Outline({ kind, d }: { kind: MascotKind; d: number }) {
  const p = { className: "bp-draw", pathLength: 1, style: { ["--d" as string]: `${d}s` } };
  if (kind === "exec") return <path {...p} d="M8,64 C8,30 30,6 60,6 C90,6 112,30 112,64 C112,76 104,84 92,84 C84,84 78,80 68,82 C60,84 54,90 44,88 C34,86 30,80 22,82 C12,84 8,76 8,64 Z" />;
  if (kind === "play") return <rect {...p} x="16" y="8" width="88" height="84" rx="22" />;
  if (kind === "track") return <path {...p} d="M22,74 C10,74 4,64 10,55 C6,45 14,36 25,37 C26,24 40,14 54,17 C62,7 80,6 90,15 C102,14 114,23 112,35 C122,37 126,50 116,58 C120,68 112,78 100,78 Z" />;
  return <ellipse {...p} cx="60" cy="50" rx="51" ry="43" />;
}

function Body({ part, d }: { part: Part; d: number }) {
  const w = part.h * 1.2;
  const x = part.cx - w / 2;
  const y = part.cy - part.h / 2;
  const s = part.h / 100;
  return (
    <g>
      {/* bounding box, construction lines */}
      <rect className="bp-draw bp-faint" pathLength={1} x={x - 10} y={y - 10} width={w + 20} height={part.h + 20} style={{ ["--d" as string]: `${d - 0.6}s` }} />
      <g transform={`translate(${x} ${y}) scale(${s})`} className="bp-line" strokeWidth={1.6 / s}>
        <Outline kind={part.kind} d={d} />
      </g>
      <g transform={`translate(${x} ${y})`} className="bp-fade" style={{ ["--d" as string]: `${d + 1.6}s` }}>
        <Mascot kind={part.kind} size={part.h} />
      </g>
    </g>
  );
}

function Reg({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    <g className="bp-line" style={{ ["--d" as string]: `${d}s` }}>
      <circle className="bp-draw" pathLength={1} cx={x} cy={y} r="11" style={{ ["--d" as string]: `${d}s` }} />
      <path className="bp-draw" pathLength={1} d={`M${x - 18} ${y}H${x + 18}M${x} ${y - 18}V${y + 18}`} style={{ ["--d" as string]: `${d + 0.2}s` }} />
    </g>
  );
}

/** Horizontal dimension line with end ticks + label. */
function DimH({ x1, x2, y, label, d }: { x1: number; x2: number; y: number; label: string; d: number }) {
  return (
    <g className="bp-dim">
      <path className="bp-draw" pathLength={1} d={`M${x1} ${y - 14}V${y + 6}M${x2} ${y - 14}V${y + 6}M${x1} ${y}H${x2}`} style={{ ["--d" as string]: `${d}s` }} />
      <path className="bp-fade" d={`M${x1} ${y}l9 -4v8zM${x2} ${y}l-9 -4v8z`} style={{ ["--d" as string]: `${d + 0.6}s` }} />
      <rect className="bp-fade" x={(x1 + x2) / 2 - label.length * 6.4 - 10} y={y - 11} width={label.length * 12.8 + 20} height={22} style={{ ["--d" as string]: `${d + 0.5}s` }} fill="var(--void)" stroke="none" />
      <text className="bp-fade bp-text" x={(x1 + x2) / 2} y={y + 5} textAnchor="middle" style={{ ["--d" as string]: `${d + 0.6}s` }}>
        {label}
      </text>
    </g>
  );
}
function DimV({ x, y1, y2, label, d }: { x: number; y1: number; y2: number; label: string; d: number }) {
  return (
    <g className="bp-dim">
      <path className="bp-draw" pathLength={1} d={`M${x - 6} ${y1}H${x + 14}M${x - 6} ${y2}H${x + 14}M${x} ${y1}V${y2}`} style={{ ["--d" as string]: `${d}s` }} />
      <path className="bp-fade" d={`M${x} ${y1}l-4 9h8zM${x} ${y2}l-4 -9h8z`} style={{ ["--d" as string]: `${d + 0.6}s` }} />
      <text className="bp-fade bp-text" x={x - 12} y={(y1 + y2) / 2} textAnchor="middle" transform={`rotate(-90 ${x - 12} ${(y1 + y2) / 2})`} style={{ ["--d" as string]: `${d + 0.6}s` }}>
        {label}
      </text>
    </g>
  );
}

function Callout({ from, to, code, name, d, anchor = "start" }: { from: [number, number]; to: [number, number]; code: string; name: string; d: number; anchor?: "start" | "end" | "middle" }) {
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dx = anchor === "end" ? -8 : anchor === "start" ? 8 : 0;
  return (
    <g>
      <circle className="bp-fade" cx={fx} cy={fy} r="3.5" fill="var(--signal)" style={{ ["--d" as string]: `${d}s` }} />
      <path className="bp-draw bp-lead" pathLength={1} d={`M${fx} ${fy}L${tx} ${ty}`} style={{ ["--d" as string]: `${d}s` }} />
      <text className="bp-fade bp-code" x={tx + dx} y={ty - 8} textAnchor={anchor} style={{ ["--d" as string]: `${d + 0.5}s` }}>
        {code}
      </text>
      <text className="bp-fade bp-text" x={tx + dx} y={ty + 18} textAnchor={anchor} style={{ ["--d" as string]: `${d + 0.7}s` }}>
        {name.toUpperCase()}
      </text>
    </g>
  );
}

export function Blueprint() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  const motion = useUI((s) => s.motion);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // film timecode, 20 Hz tick, stops when the sheet is complete
  const END = 10.5;
  useEffect(() => {
    if (!on) return;
    if (!motion) {
      setT(END);
      return;
    }
    const t0 = performance.now();
    const id = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      setT(Math.min(s, END));
      if (s >= END) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [on, motion]);

  const tc = `${String(Math.floor(t)).padStart(2, "0")}:${String(Math.floor((t % 1) * 20)).padStart(2, "0")}`;
  const fr = Math.round(t * 20);

  return (
    <div ref={ref} data-on={on ? "" : undefined} className="bp relative w-full">
      <style>{CSS}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Blueprint of a MidEarth agent: the executive mind EXEC above three minds PLAY, TRACK and FUNDS, linked by a command bus. Commands flow down, reports flow up."
      >
        <defs>
          <pattern id="bp-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="var(--agent)" strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
          <pattern id="bp-grid-s" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0H0V6" fill="none" stroke="var(--agent)" strokeOpacity="0.035" strokeWidth="0.6" />
          </pattern>
        </defs>

        {/* sheet */}
        <rect className="bp-fade" style={{ ["--d" as string]: "0s" }} x="0" y="0" width={W} height={H} fill="url(#bp-grid-s)" />
        <rect className="bp-fade" style={{ ["--d" as string]: "0.2s" }} x="0" y="0" width={W} height={H} fill="url(#bp-grid)" />
        <g className="bp-line">
          <rect className="bp-draw" pathLength={1} x="14" y="14" width={W - 28} height={H - 28} style={{ ["--d" as string]: "0.1s", ["--dur" as string]: "2.4s" }} />
          <rect className="bp-draw bp-faint" pathLength={1} x="34" y="34" width={W - 68} height={H - 68} style={{ ["--d" as string]: "0.5s", ["--dur" as string]: "2.4s" }} />
        </g>
        {/* edge scale ticks */}
        <g className="bp-fade bp-tick" style={{ ["--d" as string]: "1.4s" }}>
          {Array.from({ length: 39 }, (_, i) => (
            <path key={i} d={`M${60 + i * 28.4} 14v${i % 5 === 0 ? 14 : 7}M${60 + i * 28.4} ${H - 14}v-${i % 5 === 0 ? 14 : 7}`} />
          ))}
        </g>
        <Reg x={62} y={62} d={0.8} />
        <Reg x={W - 62} y={62} d={0.95} />
        <Reg x={62} y={H - 62} d={1.1} />
        <Reg x={W - 62} y={H - 62} d={1.25} />

        {/* centre lines */}
        <g className="bp-center">
          <path className="bp-draw" pathLength={1} d={`M600 70V${H - 70}`} style={{ ["--d" as string]: "1.5s", ["--dur" as string]: "2s" }} />
          <path className="bp-draw" pathLength={1} d={`M90 470H${W - 90}`} style={{ ["--d" as string]: "1.7s", ["--dur" as string]: "2s" }} />
        </g>

        {/* command bus */}
        <g className="bp-bus">
          <path className="bp-draw" pathLength={1} d="M600 262V340" style={{ ["--d" as string]: "4.2s" }} />
          <path className="bp-draw" pathLength={1} d="M300 340H900" style={{ ["--d" as string]: "4.5s" }} />
          <path className="bp-draw" pathLength={1} d="M300 340V408M600 340V408M900 340V408" style={{ ["--d" as string]: "4.9s" }} />
        </g>
        {/* packets: commands down (left lane), reports up (right lane) */}
        <g className="bp-fade" style={{ ["--d" as string]: "5.6s" }}>
          <circle r="3.5" fill="var(--signal)" className="bp-pk">
            <animateMotion dur="3.2s" repeatCount="indefinite" path="M600 262V340H300V408" />
          </circle>
          <circle r="3.5" fill="var(--agent)" className="bp-pk">
            <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" path="M900 408V340H600V262" />
          </circle>
          <text className="bp-text" x="440" y="328" textAnchor="middle" fill="var(--signal)">
            {HOME.minds.flowDown.toUpperCase()}
          </text>
          <text className="bp-text" x="760" y="328" textAnchor="middle" fill="var(--agent)">
            {HOME.minds.flowUp.toUpperCase()}
          </text>
        </g>

        {/* bodies */}
        <Body part={EXEC} d={2.2} />
        {LOWER.map((p, i) => (
          <Body key={p.kind} part={p} d={2.8 + i * 0.45} />
        ))}

        {/* dimensions */}
        <DimH x1={300} x2={900} y={626} label="3 MINDS · 1 BUS" d={6.0} />
        <DimV x={150} y1={190} y2={470} label="CHAIN OF COMMAND 1 : 3" d={6.4} />

        {/* callouts */}
        <Callout from={[668, 160]} to={[820, 118]} code={NODES[0].code} name={NODES[0].name} d={7.0} />
        <Callout from={[250, 505]} to={[200, 562]} code={NODES[1].code} name={NODES[1].name} d={7.4} anchor="start" />
        <Callout from={[640, 505]} to={[680, 562]} code={NODES[2].code} name={NODES[2].name} d={7.7} />
        <Callout from={[950, 505]} to={[1000, 562]} code={NODES[3].code} name={NODES[3].name} d={8.0} anchor="end" />

        {/* title block */}
        <g className="bp-line">
          <path className="bp-draw" pathLength={1} d={`M790 ${H - 34}V${H - 134}H${W - 34}M790 ${H - 100}H${W - 34}M790 ${H - 67}H${W - 34}M990 ${H - 100}V${H - 34}`} style={{ ["--d" as string]: "8.4s", ["--dur" as string]: "1.4s" }} />
        </g>
        <g className="bp-fade" style={{ ["--d" as string]: "9.2s" }}>
          <text className="bp-title" x="806" y={H - 109}>
            MIDEARTH LABS · FOUR MINDS
          </text>
          <text className="bp-text" x="806" y={H - 78}>
            DWG ME-LABS-001
          </text>
          <text className="bp-text" x="1006" y={H - 78}>
            REV A · ALPHA
          </text>
          <text className="bp-text" x="806" y={H - 45}>
            SCALE 1 : 1
          </text>
          <text className="bp-text" x="1006" y={H - 45} fill="var(--hot)">
            STATUS: NOT LIVE
          </text>
        </g>

        {/* film slate */}
        <g className="bp-fade" style={{ ["--d" as string]: "0.3s" }}>
          <text className="bp-text" x="92" y="104">
            TC {tc}
          </text>
          <text className="bp-text" x="92" y="128" opacity="0.6">
            FR {String(fr).padStart(3, "0")} / 210
          </text>
        </g>
      </svg>
      {/* scanline (film pass) */}
      <span aria-hidden className="bp-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--agent)]" />
    </div>
  );
}

const CSS = `
.bp .bp-line, .bp .bp-dim, .bp .bp-bus, .bp .bp-center, .bp .bp-lead, .bp .bp-tick { fill: none; }
.bp .bp-line { stroke: var(--agent); stroke-width: 1.4; }
.bp .bp-faint { stroke: var(--agent); stroke-opacity: .35; stroke-width: 1; fill: none; stroke-dasharray: 1; }
.bp .bp-dim { stroke: var(--paper-dim); stroke-width: 1; }
.bp .bp-dim path.bp-fade { fill: var(--paper-dim); stroke: none; }
.bp .bp-bus { stroke: var(--signal); stroke-width: 1.4; stroke-opacity: .8; }
.bp .bp-center { stroke: var(--agent); stroke-opacity: .28; stroke-width: 1; }
.bp .bp-lead { stroke: var(--paper-dim); stroke-width: 1; }
.bp .bp-tick { stroke: var(--agent); stroke-opacity: .45; stroke-width: 1; }
.bp .bp-text { font-family: var(--font-mono); font-size: 15px; letter-spacing: .12em; fill: var(--paper-dim); }
.bp .bp-code { font-family: var(--font-display); font-size: 30px; font-weight: 800; letter-spacing: .02em; fill: var(--paper); }
.bp .bp-title { font-family: var(--font-display); font-size: 19px; font-weight: 700; letter-spacing: .06em; fill: var(--paper); }
.bp .bp-draw { stroke-dasharray: 1; stroke-dashoffset: 1; }
.bp .bp-fade { opacity: 0; }
.bp .bp-scan { opacity: 0; }
.bp[data-on] .bp-draw { animation: bp-draw var(--dur, 1.6s) cubic-bezier(.65,0,.35,1) var(--d, 0s) both; }
.bp[data-on] .bp-faint.bp-draw { animation-name: bp-draw-faint; }
.bp[data-on] .bp-fade { animation: bp-fade .9s cubic-bezier(.16,1,.3,1) var(--d, 0s) both; }
.bp[data-on] .bp-scan { animation: bp-scan 10s linear .2s 1 both; }
.bp .bp-center .bp-draw { stroke-dasharray: 1; }
@keyframes bp-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes bp-draw-faint { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes bp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes bp-scan { 0% { opacity: 0; top: 0%; } 5% { opacity: .5; } 95% { opacity: .5; } 100% { opacity: 0; top: 100%; } }
@media (prefers-reduced-motion: reduce) { .bp .bp-scan, .bp .bp-pk { display: none; } .bp * { animation-delay: 0s !important; } }
html[data-motion="off"] .bp .bp-scan, html[data-motion="off"] .bp .bp-pk { display: none; }
html[data-motion="off"] .bp * { animation-delay: 0s !important; }
`;
