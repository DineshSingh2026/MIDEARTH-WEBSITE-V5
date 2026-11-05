"use client";
import { FACTS } from "@/content/facts";
import { HOME } from "@/content/copy/home";
import { Logo } from "@/components/brand/Logo";
import { MONEY_FLOW, MONEY_FLOW_TITLE } from "./models";
import { Rule } from "./shared";
import css from "./later.module.css";

/** Payout curve micro-chart, straight from FACTS.payoutCurve. */
function Curve() {
  const max = Math.max(...FACTS.payoutCurve.map((b) => b.pct));
  return (
    <svg viewBox="0 0 60 26" width="60" height="26" aria-hidden className="mt-3">
      {FACTS.payoutCurve.map((b, i) => {
        const h = (b.pct / max) * 22;
        const w = i === FACTS.payoutCurve.length - 1 ? 30 : 10;
        const x = i === 0 ? 0 : i === 1 ? 13 : 26;
        return <rect key={i} x={x} y={24 - h} width={w} height={h} fill="var(--value)" opacity={1 - i * 0.25} />;
      })}
      <line x1="0" y1="24.5" x2="60" y2="24.5" stroke="var(--rule-strong)" />
    </svg>
  );
}

export default function MoneyFlow({ motion }: { motion: boolean }) {
  return (
    <div className="mt-14 md:mt-20">
      <Rule left={MONEY_FLOW_TITLE} right="gold = value" />
      <ol className="relative mt-8 grid gap-0 lg:grid-cols-7">
        {/* value track: horizontal on lg, vertical below */}
        <div aria-hidden className="pointer-events-none absolute left-[5px] top-0 hidden h-full w-px lg:left-0 lg:top-[5px] lg:block lg:h-px lg:w-full">
          <div className={css.flowTrack} />
          {motion && <div className={css.flowPacket} />}
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-[5px] top-0 w-px bg-[color-mix(in_oklab,var(--value)_40%,transparent)] lg:hidden">
          {motion && <div className={`${css.flowPacket} ${css.flowPacketV} !left-[0.5px]`} />}
        </div>
        {MONEY_FLOW.map((s, i) => {
          const rake = s.k === "rake";
          const on = s.layer === "on";
          return (
            <li key={s.k} className={`relative pb-7 pl-8 lg:pb-0 lg:pl-0 lg:pr-4 ${rake ? "lg:pt-10" : "lg:pt-7"}`}>
              <span
                aria-hidden
                className="absolute left-0 top-1 h-[11px] w-[11px] rotate-45 lg:top-0"
                style={{ background: rake ? "var(--void)" : "var(--value)", border: "1px solid var(--value)" }}
              />
              {rake && <span aria-hidden className="absolute left-[5px] top-[11px] hidden h-8 w-px bg-[var(--value)] opacity-50 lg:block" />}
              <p className="mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: on ? "var(--agent)" : "var(--signal)" }}>
                {String(i + 1).padStart(2, "0")} · {on ? HOME.economy.onchain.split(" ·")[0] : HOME.economy.offchain.split(" ·")[0]}
              </p>
              <p className="display mt-2 text-[1.15rem] md:text-[1.3rem]" style={{ color: rake ? "var(--paper-dim)" : "var(--paper)" }}>
                {s.label}
              </p>
              <p className="mono mt-1.5 text-[0.7rem] leading-snug text-[var(--paper-dim)]">{s.sub}</p>
              {s.k === "payouts" && <Curve />}
              {rake && <Logo size={20} className="mt-3 opacity-80" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
