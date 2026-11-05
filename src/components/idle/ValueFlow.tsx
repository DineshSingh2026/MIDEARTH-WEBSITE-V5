"use client";
/**
 * The money model as one value-flow diagram. Stroke widths are proportional to value for one example pool
 * (entry fee and seats from FACTS, rake from FACTS, split by FACTS.payoutCurve). Gold = value.
 */
import { FACTS, fmtPct } from "@/content/facts";
import { IDLE } from "@/content/copy/idle";
import { HOME } from "@/content/copy/home";
import { CREDIT, useMotionOK, useSeen } from "./kit";

const fee = FACTS.entryFees[0];
const seats = FACTS.poolCapacity;
const gross = fee * seats;
const rake = gross * FACTS.rake;
const prize = gross - rake;
const brackets = FACTS.payoutCurve.map((b) => ({
  label: b.from === b.to ? `R${b.from}` : `R${b.from}–${Math.min(b.to, seats)}`,
  amt: prize * b.pct,
}));

const W = 1200;
const H = 470;
const M = 150; // membrane y
const ROW = 300;
const k = 34 / gross; // px per credit (max stroke 34)
const sw = (v: number) => Math.max(1.5, v * k);
const n = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

type Node = { x: number; y: number; label: string; sub: string; tone?: string };
const NODES: Record<string, Node> = {
  dep: { x: 70, y: 70, label: IDLE.lifecycle.steps[0].name, sub: "USDC · USDT · SOL · IDLEMINE" },
  bal: { x: 250, y: ROW, label: "IDLE credit", sub: "per agent" },
  fees: { x: 450, y: ROW, label: "Entry fees", sub: `${fee} × ${seats} seats` },
  gross: { x: 650, y: ROW, label: "Gross pool", sub: `${n(gross)} ${CREDIT}` },
  rake: { x: 650, y: 430, label: IDLE.payouts.calc.rake, sub: `${fmtPct(FACTS.rake)} · ${n(rake)} ${CREDIT}`, tone: "var(--hot)" },
  prize: { x: 850, y: ROW, label: IDLE.payouts.calc.pool, sub: `${n(prize)} ${CREDIT}` },
  wd: { x: 1130, y: 70, label: IDLE.lifecycle.steps[2].name, sub: "any Solana wallet" },
};

const PATHS = (() => {
  const P: { id: string; d: string; v: number; tone: string; dash?: boolean }[] = [];
  const { dep, bal, fees, gross: g, rake: r, prize: p, wd } = NODES;
  P.push({ id: "p-dep", d: `M${dep.x},${dep.y} C${dep.x},${M + 40} ${bal.x - 120},${bal.y} ${bal.x},${bal.y}`, v: gross, tone: "var(--value)" });
  P.push({ id: "p-fee", d: `M${bal.x},${bal.y} L${fees.x},${fees.y}`, v: gross, tone: "var(--value)" });
  P.push({ id: "p-gross", d: `M${fees.x},${fees.y} L${g.x},${g.y}`, v: gross, tone: "var(--value)" });
  P.push({ id: "p-rake", d: `M${g.x},${g.y} L${r.x},${r.y}`, v: rake, tone: "var(--hot)" });
  P.push({ id: "p-prize", d: `M${g.x},${g.y} L${p.x},${p.y}`, v: prize, tone: "var(--value)" });
  brackets.forEach((b, i) => {
    const y = ROW - 80 + i * 80;
    P.push({ id: `p-b${i}`, d: `M${p.x},${p.y} C${p.x + 80},${p.y} ${p.x + 60},${y} ${1010},${y}`, v: b.amt, tone: "var(--value)" });
  });
  // payouts re-enter the balance (the off-chain loop) …
  P.push({ id: "p-loop", d: `M1010,${ROW + 80} C1080,${H - 10} ${bal.x + 40},${H - 10} ${bal.x},${bal.y}`, v: prize * 0.6, tone: "var(--value)", dash: true });
  // … or leave once, through the membrane
  P.push({ id: "p-wd", d: `M1010,${ROW - 80} C${wd.x},${ROW - 80} ${wd.x},${M + 20} ${wd.x},${wd.y}`, v: prize * 0.4, tone: "var(--value)" });
  return P;
})();

export default function ValueFlow() {
  const motion = useMotionOK();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const anim = motion && seen;
  return (
    <figure ref={ref}>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[860px]" role="img" aria-labelledby="vf-title">
          <title id="vf-title">
            {`Value flow for one pool: ${seats} seats at ${fee} ${CREDIT} make a gross pool of ${n(gross)}. The rake of ${fmtPct(FACTS.rake)} (${n(rake)}) leaves the pool; ${n(prize)} is paid by rank: ${brackets.map((b) => `${b.label} ${n(b.amt)}`).join(", ")}. Payouts return to the IDLE credit balance or are withdrawn on-chain.`}
          </title>
          {/* membrane */}
          <rect x="0" y="0" width={W} height={M} fill="color-mix(in oklab, var(--value) 4%, transparent)" />
          <line x1="0" x2={W} y1={M} y2={M} stroke="var(--value)" strokeWidth="1" opacity="0.6" />
          <text x="12" y="22" className="mono" fontSize="11" letterSpacing="2" fill="var(--value)">
            {HOME.economy.onchain}
          </text>
          <text x="12" y={M + 22} className="mono" fontSize="11" letterSpacing="2" fill="var(--agent)">
            {HOME.economy.offchain}
          </text>

          {/* flows: width ∝ value */}
          {PATHS.map((p, i) => (
            <path
              key={p.id}
              id={p.id}
              d={p.d}
              fill="none"
              stroke={p.tone}
              strokeWidth={sw(p.v)}
              strokeOpacity={p.dash ? 0.22 : 0.32}
              strokeDasharray={p.dash ? "6 6" : undefined}
              strokeLinecap="butt"
              className={motion && !p.dash ? (anim ? "vf-draw" : "vf-hide") : undefined}
              style={anim ? { animationDelay: `${i * 120}ms` } : undefined}
            />
          ))}
          {/* moving value packets */}
          {anim &&
            PATHS.map((p, i) => (
              <circle key={`d-${p.id}`} r={p.id === "p-rake" ? 3.5 : 3} fill={p.tone}>
                <animateMotion dur={`${2.2 + (i % 3) * 0.4}s`} begin={`${0.8 + i * 0.25}s`} repeatCount="indefinite">
                  <mpath href={`#${p.id}`} />
                </animateMotion>
              </circle>
            ))}

          {/* nodes */}
          {Object.entries(NODES).map(([key, nd]) => (
            <g key={key} transform={`translate(${nd.x},${nd.y})`}>
              <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" fill="var(--void)" stroke={nd.tone ?? "var(--value)"} strokeWidth="1.5" />
              <text y={key === "rake" ? 30 : -22} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--paper)">
                {nd.label}
              </text>
              <text y={key === "rake" ? 48 : -40} textAnchor="middle" className="mono" fontSize="10.5" fill="var(--paper-dim)">
                {nd.sub}
              </text>
            </g>
          ))}
          {/* bracket labels */}
          {brackets.map((b, i) => (
            <g key={b.label} transform={`translate(1010,${ROW - 80 + i * 80})`}>
              <line x1="0" x2="0" y1={-sw(b.amt) / 2 - 2} y2={sw(b.amt) / 2 + 2} stroke="var(--value)" strokeWidth="2" />
              <text x="10" y="-4" className="mono" fontSize="12" fill="var(--paper)">
                {b.label}
              </text>
              <text x="10" y="12" className="mono" fontSize="11" fill="var(--value)">
                {n(b.amt)} {CREDIT}
              </text>
            </g>
          ))}
          <text x={(NODES.bal.x + 1010) / 2} y={H - 18} textAnchor="middle" className="mono" fontSize="10.5" fill="var(--paper-dim)">
            ↺ payouts land back in IDLE credit · next entry fee, no gas
          </text>
          <text x={NODES.rake.x + 70} y={NODES.rake.y + 4} className="mono" fontSize="10.5" fill="var(--hot)">
            → platform
          </text>
        </svg>
      </div>
      <figcaption className="mono mt-4 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        Worked example · {seats} seats × {fee} {CREDIT} · line width ∝ value · split per published curve · return/withdraw split is illustrative
      </figcaption>
      <style>{`
        .vf-hide{stroke-dasharray:2000;stroke-dashoffset:2000}
        .vf-draw{stroke-dasharray:2000;stroke-dashoffset:2000;animation:vf-draw 1.8s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes vf-draw{to{stroke-dashoffset:0}}
      `}</style>
    </figure>
  );
}
