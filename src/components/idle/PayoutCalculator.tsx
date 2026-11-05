"use client";
import { useId, useMemo, useState } from "react";
import { FACTS, fmtPct } from "@/content/facts";
import { IDLE } from "@/content/copy/idle";
import { useArenaStore } from "@/lib/arena/client";
import { Card } from "@/components/ui/primitives";
import { CREDIT } from "./kit";

type Bracket = { from: number; to: number; pct: number };

/** Per-rank weight: each bracket's share split evenly across the ranks that exist in a pool of `seats`. */
function weights(curve: readonly Bracket[], seats: number) {
  const w = new Array<number>(seats).fill(0);
  for (const b of curve) {
    const lo = Math.max(1, b.from);
    const hi = Math.min(seats, b.to);
    if (hi < lo) continue;
    const share = b.pct / (hi - lo + 1);
    for (let r = lo; r <= hi; r++) w[r - 1] += share;
  }
  return w;
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function PayoutCalculator() {
  const games = useArenaStore((s) => s.games);
  const liveCurves = games.filter((g) => g.prize_brackets && g.prize_brackets.length);
  const [gameId, setGameId] = useState<string>("facts");
  const curve: readonly Bracket[] = useMemo(() => {
    const g = liveCurves.find((x) => x.game_id === gameId);
    if (!g?.prize_brackets) return FACTS.payoutCurve;
    // normalise percentages expressed 0..100
    const tot = g.prize_brackets.reduce((a, b) => a + b.pct, 0);
    return tot > 1.5 ? g.prize_brackets.map((b) => ({ ...b, pct: b.pct / 100 })) : g.prize_brackets;
  }, [liveCurves, gameId]);

  const lastTo = Math.max(...FACTS.payoutCurve.map((b) => b.to));
  const minSeats = Math.max(...curve.map((b) => b.from)) + 1;
  const maxSeats = Math.max(FACTS.poolCapacity, Math.min(lastTo, 200));
  const [fee, setFee] = useState<number>(FACTS.entryFees[0]);
  const [seats, setSeats] = useState<number>(FACTS.poolCapacity);
  const [rank, setRank] = useState(1);
  const [log, setLog] = useState(false);
  const r = Math.min(rank, seats);
  const pool = fee * seats * (1 - FACTS.rake);
  const w = useMemo(() => weights(curve, seats), [curve, seats]);
  const wMax = Math.max(...w);
  const earn = pool * w[r - 1];
  const distributed = w.reduce((a, b) => a + b, 0);
  let breakEven = 0;
  w.forEach((x, i) => {
    if (pool * x >= fee) breakEven = i + 1;
  });
  const ids = { fee: useId(), seats: useId(), rank: useId() };
  const C = IDLE.payouts.calc;

  // chart geometry
  const W = 720;
  const H = 240;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bw = iw / seats;
  const lmin = Math.log10(Math.max(1e-4, Math.min(...w.filter((x) => x > 0))) / 2);
  const yOf = (x: number) => {
    if (x <= 0) return 0;
    if (!log) return (x / wMax) * ih;
    const lmax = Math.log10(wMax);
    return ((Math.log10(x) - lmin) / (lmax - lmin)) * ih;
  };
  const ticks = log
    ? [wMax, Math.pow(10, (Math.log10(wMax) + lmin) / 2), Math.pow(10, lmin)]
    : [wMax, wMax / 2, 0];

  return (
    <Card className="p-5 md:p-8">
      <div className="grid gap-10 lg:grid-cols-12">
        {/* controls */}
        <div className="lg:col-span-4">
          {liveCurves.length > 0 && (
            <label className="mb-6 block">
              <span className="eyebrow">Curve</span>
              <select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="mono mt-2 w-full border border-[var(--rule-strong)] bg-[var(--deck)] px-3 py-2 text-sm"
              >
                <option value="facts">Published default</option>
                {liveCurves.map((g) => (
                  <option key={g.game_id} value={g.game_id}>
                    {g.name} · live
                  </option>
                ))}
              </select>
            </label>
          )}
          <Slider id={ids.fee} label={C.fee} value={fee} min={1} max={100} onChange={setFee} unit={CREDIT} presets={FACTS.entryFees} />
          <Slider id={ids.seats} label={C.seats} value={seats} min={minSeats} max={maxSeats} onChange={(v) => setSeats(v)} presets={FACTS.poolTiers} />
          <div className="mt-6 flex items-baseline justify-between border-t border-[var(--rule)] pt-4">
            <span className="eyebrow">{C.rake}</span>
            <span className="mono text-[var(--paper)]">{fmtPct(FACTS.rake)}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-[var(--rule)] pt-4">
            <span className="eyebrow">{C.pool}</span>
            <span className="mono text-xl text-[var(--value)]">
              {fmt(pool)} <span className="text-xs">{CREDIT}</span>
            </span>
          </div>
          <Slider id={ids.rank} label={C.rank} value={r} min={1} max={seats} onChange={setRank} />
        </div>

        {/* formula + chart */}
        <div className="lg:col-span-8">
          <pre className="mono overflow-x-auto whitespace-pre border-l border-[var(--value)] bg-[var(--void)] p-4 text-[0.76rem] leading-[1.9] text-[var(--paper-dim)] md:text-[0.84rem]">
            <span className="text-[var(--paper)]">prize_pool</span> = {fee} × {seats} × (1 − {FACTS.rake}) ={" "}
            <span className="text-[var(--value)]">{fmt(pool)}</span>
            {"\n"}
            <span className="text-[var(--paper)]">payout_{r}</span> = {fmt(pool)} × w({r}) = {fmt(pool)} × {w[r - 1].toFixed(5)} ={" "}
            <span className="text-[var(--value)]">{fmt(earn)}</span>
            {"\n"}
            <span className="opacity-70">{IDLE.payouts.formula[2]}</span>
            {"\n"}
            <span className="opacity-70">{IDLE.payouts.formula[3]}</span>
          </pre>

          <p className="mt-6 text-[clamp(1.6rem,3.4vw,2.6rem)] leading-tight" aria-live="polite">
            <span className="mono text-[var(--paper-dim)]">
              {C.rank} {r}
            </span>{" "}
            <span className="dim">{C.earns}</span>{" "}
            <span className="mono text-[var(--value)]">{fmt(earn)}</span> <span className="mono text-[0.5em] text-[var(--value)]">{CREDIT}</span>
          </p>
          <p className="mono mt-2 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
            {earn >= fee ? `+${fmt(earn - fee)} net of entry` : `${fmt(earn - fee)} net of entry`} · ranks 1–{breakEven} recover the entry fee
            {distributed < 0.999 && ` · ${fmtPct(1 - distributed)} of curve unassigned at ${seats} seats`}
          </p>

          <figure className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <figcaption className="eyebrow">w(rank) · {seats} paid positions</figcaption>
              <div className="mono flex text-[0.62rem] uppercase tracking-[0.14em]" role="group" aria-label="Scale">
                {(["linear", "log"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={log === (s === "log")}
                    onClick={() => setLog(s === "log")}
                    className={`border border-[var(--rule-strong)] px-2 py-1 ${log === (s === "log") ? "bg-[var(--paper)] text-[var(--void)]" : "text-[var(--paper-dim)]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Payout weight per rank for ${seats} seats. Rank ${r} weight ${(w[r - 1] * 100).toFixed(3)} percent.`}>
              {ticks.map((tv, i) => {
                const y = pad.t + ih - yOf(tv);
                return (
                  <g key={i}>
                    <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--rule)" strokeWidth={1} />
                    <text x={pad.l - 6} y={y} textAnchor="end" dominantBaseline="middle" className="mono" fontSize={10} fill="var(--paper-dim)">
                      {tv > 0 ? `${(tv * 100).toFixed(tv < 0.01 ? 2 : 0)}%` : "0"}
                    </text>
                  </g>
                );
              })}
              {w.map((x, i) => {
                const h = Math.max(x > 0 ? 1 : 0, yOf(x));
                const sel = i + 1 === r;
                return (
                  <g key={i} onClick={() => setRank(i + 1)} className="cursor-pointer">
                    <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
                    <rect
                      x={pad.l + i * bw + (bw > 4 ? 1 : 0)}
                      y={pad.t + ih - h}
                      width={Math.max(0.6, bw - (bw > 4 ? 2 : 0.4))}
                      height={h}
                      rx={bw > 6 ? 2 : 0}
                      fill={sel ? "var(--value)" : "color-mix(in oklab, var(--value) 45%, transparent)"}
                      style={{ transition: "height .5s var(--ease-expo), y .5s var(--ease-expo)" }}
                    >
                      <title>{`Rank ${i + 1}: ${(x * 100).toFixed(3)}% → ${fmt(pool * x)} ${CREDIT}`}</title>
                    </rect>
                  </g>
                );
              })}
              <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--paper-dim)" strokeWidth={1} />
              {[1, ...curve.map((b) => b.from).filter((f) => f > 1 && f <= seats), seats].map((rk, i) => (
                <text key={`${rk}-${i}`} x={pad.l + (rk - 0.5) * bw} y={H - 8} textAnchor="middle" className="mono" fontSize={10} fill="var(--paper-dim)">
                  {rk}
                </text>
              ))}
            </svg>
          </figure>

          <table className="sr-only">
            <caption>Payout brackets</caption>
            <thead>
              <tr>
                <th>Ranks</th>
                <th>Share of pool</th>
                <th>Each rank earns ({CREDIT})</th>
              </tr>
            </thead>
            <tbody>
              {curve.map((b) => {
                const hi = Math.min(b.to, seats);
                return hi >= b.from ? (
                  <tr key={b.from}>
                    <td>{b.from === hi ? b.from : `${b.from}–${hi}`}</td>
                    <td>{fmtPct(b.pct)}</td>
                    <td>{fmt(pool * w[b.from - 1])}</td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  onChange,
  unit,
  presets,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
  presets?: readonly number[];
}) {
  const pct = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <div className="mt-6 first:mt-0">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
        <span className="mono text-xl text-[var(--paper)]">
          {value}
          {unit && <span className="ml-1 text-xs text-[var(--paper-dim)]">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="me-range mt-3 w-full"
        style={{ "--p": `${pct}%` } as React.CSSProperties}
      />
      {presets && presets.length > 0 && (
        <div className="mt-2 flex gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-pressed={value === p}
              className={`mono border px-2 py-0.5 text-[0.66rem] tracking-[0.12em] ${value === p ? "border-[var(--value)] text-[var(--value)]" : "border-[var(--rule-strong)] text-[var(--paper-dim)]"}`}
            >
              {p}
            </button>
          ))}
          <span className="mono self-center text-[0.6rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">live tiers</span>
        </div>
      )}
      <style>{`
        .me-range{-webkit-appearance:none;appearance:none;height:18px;background:transparent}
        .me-range::-webkit-slider-runnable-track{height:1px;background:linear-gradient(to right,var(--value) var(--p),var(--rule-strong) var(--p))}
        .me-range::-moz-range-track{height:1px;background:var(--rule-strong)}
        .me-range::-moz-range-progress{height:1px;background:var(--value)}
        .me-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-7px;background:var(--void);border:1.5px solid var(--value);transform:rotate(45deg)}
        .me-range::-moz-range-thumb{width:12px;height:12px;background:var(--void);border:1.5px solid var(--value);border-radius:0;transform:rotate(45deg)}
      `}</style>
    </div>
  );
}
