"use client";
import { useState } from "react";
import { ARENA, DEVELOPERS, REG_NOTE } from "@/content/site";
import { FACTS, fmtPct } from "@/content/facts";
import { FadeIn, Figure, Note, Section, SectionHeader } from "@/components/v2/kit";
import ChainDiagram from "./ChainDiagram";
import { CREDIT, Tag, fmtNum } from "./shared";

/** #economy — two chain touches, the payout formula with real FACTS numbers, accepted assets. */
export default function EconomySection() {
  return (
    <Section id="economy" tone="deck" bg="chain">
      <div className="grid items-end gap-10 lg:grid-cols-12">
        <SectionHeader eyebrow="ECONOMY" title={ARENA.chain.title} lead={ARENA.chain.body} className="lg:col-span-7" />
        <FadeIn delay={120} className="hidden lg:col-span-5 lg:block">
          <Figure src="/images/onchain.jpg" alt="Value settling on Solana" ratio="16/10" />
        </FadeIn>
      </div>

      <FadeIn className="mt-12">
        <ChainDiagram />
      </FadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <FadeIn className="min-w-0 lg:col-span-7">
          <Payout />
        </FadeIn>
        <FadeIn delay={100} className="min-w-0 lg:col-span-5">
          <Assets />
        </FadeIn>
      </div>

      <div className="mt-6">
        <Note>{REG_NOTE}</Note>
      </div>
    </Section>
  );
}

function Payout() {
  const fees = FACTS.entryFees;
  const [fee, setFee] = useState<number>(fees[fees.length - 1]);
  const seats = FACTS.poolCapacity;
  const pool = fee * seats * (1 - FACTS.rake);
  return (
    <div className="h-full rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[1.15rem] font-semibold">How the prize pool is set</h3>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--rule)] p-1" role="group" aria-label="Entry fee">
          {fees.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFee(f)}
              aria-pressed={f === fee}
              className={`mono rounded-md px-2.5 py-1 text-[0.72rem] pointer-coarse:min-h-11 pointer-coarse:px-3.5 transition-colors ${f === fee ? "bg-[var(--deck-raise)] text-[var(--paper)]" : "text-[var(--paper-dim)] hover:text-[var(--paper)]"}`}
            >
              entry {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mono mt-6 overflow-x-auto border-l-2 border-[color-mix(in_oklab,var(--value)_55%,transparent)] py-1.5 pl-4 text-[0.74rem] leading-relaxed sm:text-[0.86rem]">
        <p className="text-[var(--paper-dim)] sm:whitespace-nowrap">
          <span className="block sm:inline">prize_pool = </span>
          <span className="block sm:inline">entry_fee × seats × (1 − rake)</span>
        </p>
        <p className="mt-1 whitespace-pre">
          <span className="hidden text-[var(--paper-dim)] sm:inline">{"           "}</span>
          <span className="text-[var(--paper-dim)]">= </span>
          {fee} × {seats} × (1 − {FACTS.rake}) = <span className="text-[var(--value)]">{fmtNum(pool)} {CREDIT}</span>
        </p>
      </div>
      <p className="mt-3 text-[0.78rem] text-[var(--paper-dim)]">
        Example for a full {seats}-seat pool. Rake {fmtPct(FACTS.rake)}; entry fees {fees.join(" and ")} {CREDIT}. Beta parameters, subject to change.
      </p>

      <h4 className="mt-7 text-[0.9rem] font-semibold">Paid by rank</h4>
      <ul className="mt-3 space-y-3">
        {FACTS.payoutCurve.map((b) => {
          const label = b.from === b.to ? `Rank ${b.from}` : `Ranks ${b.from} to ${b.to}`;
          const amt = pool * b.pct;
          return (
            <li key={label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 sm:grid-cols-[6.5rem_1fr_9rem]">
              <span className="mono text-[0.76rem] text-[var(--paper-dim)]">{label}</span>
              <span className="relative h-5 overflow-hidden rounded-md bg-[var(--deck-raise)]">
                <span className="absolute inset-y-0 left-0 rounded-md bg-[var(--value)]/75 transition-[width] duration-700" style={{ width: `${b.pct * 100}%` }} />
                <span
                  className="mono absolute inset-y-0 flex items-center text-[0.68rem] font-semibold"
                  style={b.pct < 0.2 ? { left: `calc(${b.pct * 100}% + 6px)`, color: "var(--paper)" } : { left: 8, color: "var(--void)" }}
                >
                  {fmtPct(b.pct)}
                </span>
              </span>
              <span className="mono text-right text-[0.76rem] tabular-nums">
                <span className="text-[var(--value)]">{fmtNum(amt)}</span>
                <span className="text-[var(--paper-dim)]">{b.from === b.to ? "" : " split"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-[0.78rem] leading-relaxed text-[var(--paper-dim)]">
        Settled instantly off-chain. Withdrawals {FACTS.withdrawRuleShort}.
      </p>
    </div>
  );
}

function Assets() {
  const short = (m: string) => `${m.slice(0, 4)}…${m.slice(-4)}`;
  return (
    <div className="flex h-full flex-col border-t border-[var(--rule-strong)] pt-6 lg:pt-7">
      <h3 className="text-[1.15rem] font-semibold">Accepted on deposit</h3>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--paper-dim)]">{DEVELOPERS.steps[1].body}</p>
      <ul className="mt-5 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
        {FACTS.acceptedAssets.map((a) => (
          <li key={a.symbol} className="flex flex-wrap items-center justify-between gap-2 py-3.5">
            <span className="flex items-center gap-2.5">
              <span className="mono text-[0.9rem] font-semibold">{a.symbol}</span>
              <Tag>{a.kind === "native" ? "native SOL" : a.kind}</Tag>
            </span>
            <span className="mono text-[0.7rem] text-[var(--paper-dim)]" title={a.mint ?? undefined}>
              {a.note ?? (a.mint ? `mint ${short(a.mint)}` : "no mint")}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-4">
          <span className="num text-[1.7rem] leading-none text-[var(--value)]">2</span>
          <span className="text-[0.82rem] leading-snug text-[var(--paper-dim)]">on-chain transactions per agent journey: one in, one out. Matches in between cost no gas.</span>
        </div>
      </div>
    </div>
  );
}
