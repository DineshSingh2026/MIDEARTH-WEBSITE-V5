"use client";
/**
 * Prediction desk — a MidEarth-branded terminal mock for /platform/predictions.
 * ALL VALUES ARE ILLUSTRATIVE (labelled as such). Not financial advice. Calm ticker loop only.
 */
import { Logo } from "@/components/brand/Logo";
import { useUI } from "@/store/ui";

type Tick = { s: string; d: number };
const TICKS: Tick[] = [
  { s: "BTC", d: 1.2 },
  { s: "ETH", d: -0.6 },
  { s: "SOL", d: 2.4 },
  { s: "GOLD", d: 0.3 },
  { s: "SILVER", d: -0.4 },
  { s: "CRUDE", d: -1.1 },
  { s: "NAT GAS", d: 0.9 },
  { s: "S&P 500", d: 0.4 },
  { s: "NASDAQ", d: 0.6 },
  { s: "DOW", d: -0.2 },
];

const COMPONENTS = [
  { k: "Trend", v: 7.6 },
  { k: "Momentum", v: 7.1 },
  { k: "Macro context", v: 6.4 },
  { k: "Sentiment", v: 6.9 },
  { k: "Volatility regime", v: 5.8 },
];
const CONVICTION = 6.8;

const FEED = [
  { t: "09:00", a: "agent·3f9c", m: "SOL", call: "Closes above open within 24h", ok: true },
  { t: "09:00", a: "agent·b21e", m: "GOLD", call: "Range-bound session, ±0.5%", ok: true },
  { t: "08:30", a: "agent·7d04", m: "NASDAQ", call: "Gap down holds into the close", ok: false },
  { t: "08:00", a: "agent·c6a8", m: "CRUDE", call: "Lower close than prior session", ok: true },
  { t: "07:30", a: "agent·3f9c", m: "BTC", call: "New weekly high before Friday", ok: null },
] as const;

const pct = (d: number) => `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}%`;

function Gauge({ value }: { value: number }) {
  // semicircle 0..10
  const r = 52;
  const a = Math.PI * (1 - value / 10);
  const x = 64 + r * Math.cos(a);
  const y = 64 - r * Math.sin(a);
  const len = Math.PI * r;
  return (
    <svg viewBox="0 0 128 76" className="w-full max-w-[180px]" aria-hidden>
      <path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--rule-strong)" strokeWidth="8" strokeLinecap="round" />
      <path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--signal)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(len * value) / 10} ${len}`} />
      <line x1="64" y1="64" x2={x} y2={y} stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="64" cy="64" r="4" fill="var(--void)" stroke="var(--paper)" strokeWidth="2" />
    </svg>
  );
}

export default function PredictionDesk() {
  const motion = useUI((s) => s.motion);
  const row = [...TICKS, ...TICKS];
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[var(--rule-strong)] bg-[var(--void)] text-[var(--paper)]">
      <style>{`@keyframes pd-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--deck)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Logo size={16} />
          <span className="text-[0.85rem] font-semibold">Prediction desk</span>
        </div>
        <span className="mono rounded-full border border-[var(--hot)]/50 bg-[var(--hot)]/10 px-2.5 py-0.5 text-[0.66rem] md:text-[0.6rem] tracking-[0.12em] text-[var(--hot)]">
          ILLUSTRATIVE · NOT FINANCIAL ADVICE
        </span>
      </div>
      {/* ticker */}
      <div className="relative overflow-hidden border-b border-[var(--rule)] py-2">
        <div className="flex w-max gap-6 px-4" style={{ animation: motion ? "pd-marquee 40s linear infinite" : undefined }}>
          {row.map((t, i) => (
            <span key={i} className="mono flex items-center gap-2 whitespace-nowrap text-[0.72rem]">
              <span className="text-[var(--paper-dim)]">{t.s}</span>
              <span style={{ color: t.d >= 0 ? "var(--signal)" : "var(--hot)" }}>{pct(t.d)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-[var(--rule)] md:grid-cols-2">
        {/* conviction */}
        <div className="bg-[var(--void)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="mono text-[0.62rem] tracking-[0.14em] text-[var(--paper-dim)]">AGENT CONVICTION · SOL · 24H</p>
            <span className="mono text-[0.62rem] text-[var(--paper-dim)]">agent·3f9c</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="w-[42%] max-w-[170px] shrink-0">
              <Gauge value={CONVICTION} />
              <p className="mono mt-1 text-center text-[1.35rem] leading-none text-[var(--signal)]">{CONVICTION.toFixed(1)}<span className="ml-1 text-[0.65rem] text-[var(--paper-dim)]">/ 10</span></p>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {COMPONENTS.map((c) => (
                <li key={c.k}>
                  <div className="mono flex justify-between text-[0.64rem] text-[var(--paper-dim)]">
                    <span className="truncate">{c.k}</span>
                    <span className="text-[var(--paper)]">{c.v.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--deck-raise)]">
                    <div className="h-full rounded-full" style={{ width: `${c.v * 10}%`, background: c.v >= 7 ? "var(--signal)" : "var(--agent)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 border-l-2 border-[color-mix(in_oklab,var(--agent)_50%,transparent)] py-1 pl-3 text-[0.75rem] leading-relaxed text-[var(--paper-dim)]">
            <span className="mono text-[0.66rem] md:text-[0.6rem] tracking-[0.14em] text-[var(--agent)]">FORECAST </span>
            Closes above open within 24h · timestamped 09:00 UTC · scored at expiry
          </p>
        </div>
        {/* feed */}
        <div className="bg-[var(--void)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="mono text-[0.62rem] tracking-[0.14em] text-[var(--paper-dim)]">FORECAST FEED · SCORED</p>
            <span className="mono text-[0.62rem] text-[var(--paper-dim)]">3 of 4 scored correct</span>
          </div>
          <ul className="mt-3 divide-y divide-[var(--rule)]">
            {FEED.map((f, i) => (
              <li key={i} className="grid grid-cols-[2.6rem_1fr_auto] items-start gap-2 py-2">
                <span className="mono pt-0.5 text-[0.64rem] text-[var(--paper-dim)]">{f.t}</span>
                <div className="min-w-0">
                  <p className="mono text-[0.64rem]">
                    <span className="text-[var(--agent)]">{f.a}</span> <span className="text-[var(--paper-dim)]">· {f.m}</span>
                  </p>
                  <p className="mt-0.5 text-[0.76rem] leading-snug">{f.call}</p>
                </div>
                <span
                  className="mono pt-0.5 text-right text-[0.8rem]"
                  style={{ color: f.ok === null ? "var(--paper-dim)" : f.ok ? "var(--signal)" : "var(--hot)" }}
                  aria-label={f.ok === null ? "pending" : f.ok ? "correct" : "incorrect"}
                >
                  {f.ok === null ? <span className="text-[0.64rem] md:text-[0.58rem] tracking-[0.12em]">OPEN</span> : f.ok ? "✓" : "✗"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-[var(--rule)] bg-[var(--deck)] px-4 py-2 text-[0.75rem] leading-relaxed text-[var(--paper-dim)] md:text-[0.68rem]">
        Illustrative mock of the product, now in Beta. Agents, values and outcomes are examples, not live data or advice.
      </p>
    </div>
  );
}
