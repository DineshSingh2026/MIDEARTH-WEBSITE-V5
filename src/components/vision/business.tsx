"use client";
/**
 * Business models showpiece: a stream selector + one animated value-flow diagram per revenue stream.
 * Diagram grammar (identical for every stream so they compare): payer → MIDEARTH → recipient, and a gold
 * "take" line dropping into the MidEarth vault. Gold = value, green = what reaches the recipient.
 */
import { useId, useState } from "react";
import { Mascot } from "@/components/brand/Mascot";
import { StatusTag } from "@/components/ui/primitives";
import { useMotionOK } from "./kit";
import { VISION_UI, type Glyph } from "./data";

const B = VISION_UI.business;
type Stream = (typeof B.streams)[number];

/* ───────── bespoke glyphs (drawn at 0,0, ~56px box) ───────── */
function GlyphArt({ g }: { g: Glyph }) {
  const s = { fill: "none", stroke: "var(--paper)", strokeWidth: 1.4 } as const;
  switch (g) {
    case "agent":
      return (
        <foreignObject x={-30} y={-24} width={60} height={50}>
          <Mascot kind="play" size={42} />
        </foreignObject>
      );
    case "pool-prize":
      return (
        <g {...s}>
          <rect x={-8} y={-10} width={16} height={32} stroke="var(--value)" />
          <rect x={-24} y={0} width={16} height={22} />
          <rect x={8} y={8} width={16} height={14} />
          <text x={0} y={6} textAnchor="middle" fontSize="10" fill="var(--value)" stroke="none" className="mono">1</text>
          <path d="M-4,-22 l4,-6 l4,6 z" fill="var(--value)" stroke="none" />
        </g>
      );
    case "user":
      return (
        <g {...s}>
          <circle cx={0} cy={-10} r={8} />
          <path d="M-16,18 C-16,4 16,4 16,18" />
          <line x1={-24} y1={22} x2={24} y2={22} strokeDasharray="2 3" />
        </g>
      );
    case "brand":
      return (
        <g {...s}>
          <line x1={-14} y1={22} x2={-14} y2={-22} />
          <path d="M-14,-22 L18,-14 L-14,-4 Z" fill="color-mix(in oklab, var(--value) 25%, transparent)" stroke="var(--value)" />
          <circle cx={-14} cy={22} r={2} fill="var(--paper)" />
        </g>
      );
    case "enterprise":
      return (
        <g {...s}>
          <rect x={-18} y={-20} width={22} height={42} />
          <rect x={4} y={-6} width={16} height={28} />
          {[-12, -4, 4, 12].map((y) => (
            <line key={y} x1={-13} y1={y} x2={-1} y2={y} strokeOpacity={0.6} />
          ))}
        </g>
      );
    case "dev":
      return (
        <g {...s}>
          <rect x={-22} y={-16} width={44} height={32} />
          <path d="M-8,-5 l-6,5 l6,5 M8,-5 l6,5 l-6,5 M3,-8 l-6,16" stroke="var(--agent)" />
        </g>
      );
    case "chain":
      return (
        <g {...s}>
          {[-14, 0, 14].map((x, i) => (
            <path key={x} d={`M${x},${-14 + (i % 2) * 10} l7,4 v8 l-7,4 l-7,-4 v-8 z`} stroke={i === 1 ? "var(--agent)" : "var(--paper)"} />
          ))}
        </g>
      );
    case "pool":
      return (
        <g {...s}>
          {[20, 13, 6].map((r) => (
            <ellipse key={r} cx={0} cy={0} rx={r} ry={r * 0.45} strokeOpacity={r === 6 ? 1 : 0.55} />
          ))}
          <circle cx={0} cy={0} r={2} fill="var(--signal)" stroke="none" />
        </g>
      );
  }
}

/* ───────── value-flow diagram ───────── */
function FlowDiagram({ st }: { st: Stream }) {
  const motion = useMotionOK();
  const id = useId().replace(/:/g, "");
  const pIn = `M120,150 C190,150 220,150 290,150`;
  const pOut = `M350,150 C420,150 450,150 520,150`;
  const pTake = `M320,180 C320,215 320,225 320,250`;
  const packets = (path: string, color: string, n: number, dur: number, r = 3.2) =>
    Array.from({ length: n }, (_, i) =>
      motion ? (
        <circle key={i} r={r} fill={color}>
          <animateMotion dur={`${dur}s`} begin={`${-(i * dur) / n}s`} repeatCount="indefinite" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
        </circle>
      ) : (
        <circle key={i} r={r} fill={color} cx={0} cy={0} style={{ offsetPath: `path("${path}")`, offsetDistance: `${((i + 0.5) / n) * 100}%` }} />
      ),
    );
  return (
    <svg viewBox="0 0 640 320" className="block h-auto w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`}>
          <stop offset="0%" stopColor="var(--value)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--value)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-grid`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16,0 V16 H0" fill="none" stroke="var(--rule)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="640" height="320" fill={`url(#${id}-grid)`} opacity="0.7" />
      {/* rails */}
      <path d={pIn} fill="none" stroke="var(--value)" strokeOpacity="0.5" strokeWidth="1.2" />
      <path d={pOut} fill="none" stroke="var(--signal)" strokeOpacity="0.5" strokeWidth="1.2" />
      <path d={pTake} fill="none" stroke="var(--value)" strokeWidth="1.6" strokeDasharray="3 3" />
      {packets(pIn, "var(--value)", 5, 2.6)}
      {packets(pOut, "var(--signal)", 4, 2.6)}
      {packets(pTake, "var(--value)", 2, 2.6, 2.6)}
      {/* labels on rails */}
      <text x="205" y="136" textAnchor="middle" className="mono" fontSize="10" letterSpacing="1.4" fill="var(--value)">{st.inL}</text>
      <text x="435" y="136" textAnchor="middle" className="mono" fontSize="10" letterSpacing="1.4" fill="var(--signal)">{st.outL}</text>
      {/* payer */}
      <g transform="translate(70,150)">
        <circle r="44" fill="var(--void)" stroke="var(--rule-strong)" />
        <GlyphArt g={st.from.g} />
        <text y="66" textAnchor="middle" className="mono" fontSize="10.5" letterSpacing="1.2" fill="var(--paper)">{st.from.l.toUpperCase()}</text>
      </g>
      {/* recipient */}
      <g transform="translate(570,150)">
        <circle r="44" fill="var(--void)" stroke="var(--rule-strong)" />
        <GlyphArt g={st.to.g} />
        <text y="66" textAnchor="middle" className="mono" fontSize="10.5" letterSpacing="1.2" fill="var(--paper)">{st.to.l.toUpperCase()}</text>
      </g>
      {/* midearth node */}
      <g transform="translate(320,150)">
        <circle r="70" fill={`url(#${id}-g)`} />
        <rect x="-30" y="-30" width="60" height="60" fill="var(--void)" stroke="var(--signal)" strokeWidth="1.2" transform="rotate(45)" />
        <text y="-46" textAnchor="middle" className="mono" fontSize="9.5" letterSpacing="2" fill="var(--paper-dim)">{B.me}</text>
      </g>
      {/* vault */}
      <g transform="translate(320,272)">
        <rect x="-74" y="-20" width="148" height="40" fill="var(--void)" stroke="var(--value)" strokeWidth="1.2" />
        <text y="4" textAnchor="middle" className="mono" fontSize="10.5" letterSpacing="1.4" fill="var(--value)" fontWeight="600">{st.takeL}</text>
      </g>
    </svg>
  );
}

export function BusinessModels() {
  const [sel, setSel] = useState(0);
  const uid = useId();
  const st = B.streams[sel];
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + B.streams.length) % B.streams.length;
    setSel(n);
    document.getElementById(`${uid}-s${n}`)?.focus();
  };
  return (
    <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-12">
      <div role="tablist" aria-orientation="vertical" aria-label={B.index} className="flex overflow-x-auto bg-[var(--void)] lg:col-span-4 lg:flex-col lg:overflow-visible">
        {B.streams.map((s, i) => (
          <button
            key={s.key}
            id={`${uid}-s${i}`}
            role="tab"
            type="button"
            aria-selected={sel === i}
            aria-controls={`${uid}-panel`}
            tabIndex={sel === i ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => setSel(i)}
            className={`group relative flex min-w-[13rem] shrink-0 items-start gap-4 border-r border-[var(--rule)] px-5 py-4 text-left transition-colors lg:min-w-0 lg:border-b lg:border-r-0 ${
              sel === i ? "bg-[var(--deck)]" : "hover:bg-[var(--deck)]"
            }`}
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] transition-colors" style={{ background: sel === i ? "var(--value)" : "transparent" }} />
            <span className="mono pt-1 text-[0.62rem] text-[var(--paper-dim)]">B{i + 1}</span>
            <span className="flex-1">
              <span className={`block text-[0.95rem] leading-snug ${sel === i ? "text-[var(--paper)]" : "text-[var(--paper-dim)] group-hover:text-[var(--paper)]"}`}>{s.title}</span>
              <span className="mt-2 block">
                <StatusTag status={s.status} />
              </span>
            </span>
          </button>
        ))}
      </div>
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-s${sel}`} className="bg-[var(--void)] p-5 md:p-8 lg:col-span-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono text-[0.64rem] tracking-[0.18em] text-[var(--paper-dim)]">
            B{sel + 1} / {String(B.streams.length).padStart(2, "0")}
          </span>
          <StatusTag status={st.status} />
          {"note" in st && st.note && <span className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{st.note}</span>}
        </div>
        <h3 className="display display-m mt-4" style={{ fontVariationSettings: '"wdth" 84, "wght" 700' }}>
          {st.title}
        </h3>
        <div key={st.key} className="vb-in mt-6">
          <FlowDiagram st={st} />
        </div>
        {"chips" in st && st.chips && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Pricing models">
            {st.chips.map((c) => (
              <li key={c} className="mono border border-[var(--value)] px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.14em] text-[var(--value)]">
                {c}
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] md:grid-cols-3">
          {(
            [
              [B.cols.pays, st.pays, "var(--paper-dim)"],
              [B.cols.flows, st.flows, "var(--signal)"],
              [B.cols.earns, st.earns, "var(--value)"],
            ] as const
          ).map(([k, v, c]) => (
            <div key={k} className="bg-[var(--void)] p-4">
              <dt className="mono text-[0.6rem] tracking-[0.18em]" style={{ color: c }}>
                {k}
              </dt>
              <dd className="mt-2 text-[0.9rem] leading-[1.5]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <style>{`
        @keyframes vb-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        [data-motion="on"] .vb-in { animation: vb-in 0.8s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
    </div>
  );
}

/* ───────── pillar "how it works": 3 steps, a signal travels through them ───────── */
export function HowSteps({ k }: { k: keyof typeof VISION_UI.how.steps }) {
  const steps = VISION_UI.how.steps[k];
  return (
    <div className="mt-10">
      <p className="eyebrow mb-4">{VISION_UI.how.label}</p>
      <ol className="vh relative grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.t} className="vh-step relative bg-[var(--void)] p-4" style={{ animationDelay: `${i * 1.6}s` }}>
            <span aria-hidden className="vh-bar absolute inset-x-0 top-0 h-[2px] origin-left bg-[var(--signal)]" style={{ animationDelay: `${i * 1.6}s` }} />
            <span className="mono text-[0.62rem] tracking-[0.16em] text-[var(--paper-dim)]">
              {String(i + 1).padStart(2, "0")} · <span className="text-[var(--paper)]">{s.t.toUpperCase()}</span>
            </span>
            <p className="mt-2 text-[0.86rem] leading-[1.5] text-[var(--paper-dim)]">{s.d}</p>
          </li>
        ))}
      </ol>
      <style>{`
        .vh-bar { transform: scaleX(1); opacity: 0.35; }
        @keyframes vh-bar { 0% { transform: scaleX(0); opacity: 1; } 30% { transform: scaleX(1); opacity: 1; } 60%,100% { transform: scaleX(1); opacity: 0.25; } }
        [data-motion="on"] .vh-bar { animation: vh-bar 4.8s cubic-bezier(0.16,1,0.3,1) infinite; }
      `}</style>
    </div>
  );
}
