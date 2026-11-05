"use client";
/**
 * TwoSided — the marketplace on both sides of the platform.
 * Agents (cyan) flow developers → platform → customers; payments (gold) flow back;
 * the platform keeps a commission (gold ring). Horizontal on desktop, vertical on phones.
 */
import { BUSINESS, ECOSYSTEM, STREAMS } from "@/content/site";
import { useUI } from "@/store/ui";

const MARKET = STREAMS.find((s) => s.slug === "marketplace")!;
const MARKET_FIG = MARKET.figure ?? "";
const DEV = BUSINESS.extras.find((e) => e.name === "Developer economy")!;
const AAS = BUSINESS.extras.find((e) => e.name === "Agent-as-a-Service")!;

type Pt = { x: number; y: number };
type Geo = { w: number; h: number; dev: Pt; mid: Pt; cus: Pt; r: number; R: number; lane: number; vertical: boolean };

const H_GEO: Geo = { w: 1000, h: 300, dev: { x: 130, y: 150 }, mid: { x: 500, y: 150 }, cus: { x: 870, y: 150 }, r: 62, R: 92, lane: 34, vertical: false };
const V_GEO: Geo = { w: 340, h: 660, dev: { x: 170, y: 92 }, mid: { x: 170, y: 330 }, cus: { x: 170, y: 568 }, r: 58, R: 82, lane: 30, vertical: true };

function Diagram({ g }: { g: Geo }) {
  const motion = useUI((s) => s.motion);
  const off = (p: Pt, d: number, side: number): Pt => (g.vertical ? { x: p.x + side * g.lane, y: p.y + d } : { x: p.x + d, y: p.y + side * g.lane });
  // agent lane (side -1), payment lane (side +1)
  const a1 = `M${off(g.dev, g.r, -1).x},${off(g.dev, g.r, -1).y} L${off(g.mid, -g.R, -1).x},${off(g.mid, -g.R, -1).y}`;
  const a2 = `M${off(g.mid, g.R, -1).x},${off(g.mid, g.R, -1).y} L${off(g.cus, -g.r, -1).x},${off(g.cus, -g.r, -1).y}`;
  const p1 = `M${off(g.cus, -g.r, 1).x},${off(g.cus, -g.r, 1).y} L${off(g.mid, g.R, 1).x},${off(g.mid, g.R, 1).y}`;
  const p2 = `M${off(g.mid, -g.R, 1).x},${off(g.mid, -g.R, 1).y} L${off(g.dev, g.r, 1).x},${off(g.dev, g.r, 1).y}`;

  const lbl = (a: Pt, b: Pt, side: number, text: string, color: string) => {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const o = off(m, 0, side * 1.9);
    return (
      <text x={o.x} y={o.y + 4} textAnchor="middle" className="mono" fontSize={g.vertical ? 12 : 13} letterSpacing="1.2" fill={color} transform={g.vertical ? `rotate(-90 ${o.x} ${o.y + 4})` : undefined}>
        {text}
      </text>
    );
  };

  const dots = (d: string, color: string, n: number, dur: number, r: number) =>
    motion &&
    Array.from({ length: n }, (_, i) => (
      <circle key={i} r={r} fill={color}>
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(-i * dur) / n}s`} path={d} />
      </circle>
    ));

  const node = (p: Pt, title: string, sub: string, color: string) => (
    <g>
      <circle cx={p.x} cy={p.y} r={g.r} fill="var(--deck)" stroke={`color-mix(in oklab, ${color} 55%, transparent)`} strokeWidth="1.5" />
      <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--paper)">
        {title}
      </text>
      <text x={p.x} y={p.y + 20} textAnchor="middle" className="mono" fontSize="12" letterSpacing="1.2" fill={color}>
        {sub}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} className="h-auto w-full" role="img" aria-label="Two-sided marketplace: developers supply agents to the platform, customers consume them, payments flow back and the platform keeps a commission.">
      <style>{`@keyframes ts-ring { 0%,100% { opacity:.25; } 50% { opacity:.7; } }`}</style>
      {/* lanes */}
      {[a1, a2].map((d) => (
        <path key={d} d={d} stroke="color-mix(in oklab, var(--agent) 35%, transparent)" strokeWidth="1.5" strokeDasharray="3 5" fill="none" />
      ))}
      {[p1, p2].map((d) => (
        <path key={d} d={d} stroke="color-mix(in oklab, var(--value) 35%, transparent)" strokeWidth="1.5" strokeDasharray="3 5" fill="none" />
      ))}
      {dots(a1, "var(--agent)", 3, 3.6, 4)}
      {dots(a2, "var(--agent)", 3, 3.6, 4)}
      {dots(p1, "var(--value)", 3, 3.6, 4.5)}
      {dots(p2, "var(--value)", 2, 3.6, 3.2)}

      {lbl(g.dev, g.mid, -1, "AGENTS SUPPLIED", "var(--agent)")}
      {lbl(g.mid, g.cus, -1, "CAPABILITIES USED", "var(--agent)")}
      {lbl(g.cus, g.mid, 1, "CUSTOMER PAYS", "var(--value)")}
      {lbl(g.mid, g.dev, 1, "DEVELOPER EARNS", "var(--value)")}

      {node(g.dev, "Developers", "SUPPLY", "var(--agent)")}
      {node(g.cus, "Customers", "DEMAND", "var(--agent)")}

      {/* platform */}
      <circle cx={g.mid.x} cy={g.mid.y} r={g.R + 10} fill="none" stroke="var(--value)" strokeWidth="1" style={{ animation: motion ? "ts-ring 3.6s ease-in-out infinite" : undefined, opacity: 0.45 }} />
      <circle cx={g.mid.x} cy={g.mid.y} r={g.R} fill="color-mix(in oklab, var(--value) 8%, var(--deck))" stroke="var(--value)" strokeWidth="1.5" />
      <text x={g.mid.x} y={g.mid.y - 24} textAnchor="middle" className="mono" fontSize="12" letterSpacing="1.6" fill="var(--paper-dim)">
        PLATFORM
      </text>
      <text x={g.mid.x} y={g.mid.y + 2} textAnchor="middle" fontSize="19" fontWeight="600" fill="var(--paper)">
        MidEarth
      </text>
      <text x={g.mid.x} y={g.mid.y + 26} textAnchor="middle" className="mono" fontSize="12.5" fill="var(--value)">
        {MARKET_FIG}
      </text>
    </svg>
  );
}

export default function TwoSided() {
  return (
    <div>
      <div className="mx-auto hidden max-w-[1040px] py-4 md:block">
        <Diagram g={H_GEO} />
      </div>
      <div className="mx-auto max-w-[360px] pb-4 md:hidden">
        <Diagram g={V_GEO} />
      </div>
      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-3">
        <Cell tone="var(--agent)" label="SUPPLY SIDE" title={DEV.name} body={DEV.body} />
        <Cell tone="var(--value)" label="PLATFORM" title={`${MARKET_FIG.replace(" commission", "")} marketplace commission`} body={ECOSYSTEM.twoSided} mid />
        <Cell tone="var(--agent)" label="DEMAND SIDE" title={AAS.name} body={AAS.body} />
      </div>
    </div>
  );
}

function Cell({ tone, label, title, body, mid }: { tone: string; label: string; title: string; body: string; mid?: boolean }) {
  return (
    <div className="relative border-t border-[var(--rule)] pt-5">
      <span aria-hidden className="absolute -top-px left-0 h-px w-12" style={{ background: tone, opacity: mid ? 1 : 0.8 }} />
      <p className="mono text-[0.64rem] tracking-[0.16em]" style={{ color: tone }}>
        {label}
      </p>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--paper-dim)]">{body}</p>
    </div>
  );
}
