"use client";
import dynamic from "next/dynamic";
import { IDLE } from "@/content/copy/idle";
import { FACTS, fmtPct } from "@/content/facts";
import { useScene } from "@/three/registry";
import { Btn, Card, Reveal, SectionIndex, StatusTag } from "@/components/ui/primitives";
import { CopyBtn, SectionHead, idx } from "./kit";
import PayoutCalculator from "./PayoutCalculator";
import ValueFlow from "./ValueFlow";

const Membrane = dynamic(() => import("./Membrane"), { ssr: false, loading: () => <div className="h-[62vh] min-h-[420px] md:h-[72vh]" /> });

const N = 7;

export default function IdlePage() {
  useScene("idle");
  const stageIdx = IDLE.rollout.stages.findIndex((s) => s.key === FACTS.stage);
  return (
    <>
      {/* ───── Hero ───── */}
      <header className="shell relative pt-36 md:pt-48">
        <SectionIndex>{IDLE.eyebrow}</SectionIndex>
        <div className="mt-6 grid gap-8 md:grid-cols-12">
          <Reveal as="h1" width className="display display-hero md:col-span-8">
            {IDLE.h1}
          </Reveal>
          <Reveal as="p" delay={140} className="self-end text-[1.05rem] text-[var(--paper-dim)] md:col-span-4 md:text-[1.12rem]">
            {IDLE.sub}
          </Reveal>
        </div>
        <div className="mt-12 md:mt-16">
          <Membrane />
        </div>
      </header>

      {/* ───── 01 Money model ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-flow">
        <SectionHead index={idx(1, N, "MONEY MODEL")} title={<span id="idle-flow">Where value moves.</span>}>
          <p>{IDLE.payouts.formula[0]}</p>
          <p className="mt-2">{IDLE.payouts.after}</p>
        </SectionHead>
        <div className="mt-12">
          <ValueFlow />
        </div>
      </section>

      {/* ───── 02 Layers ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-layers">
        <SectionHead index={idx(2, N, "LAYERS")} title={<span id="idle-layers">{IDLE.layersTitle}</span>} />
        <div className="mt-12 grid gap-px border border-[var(--rule)] bg-[var(--rule)] md:grid-cols-2">
          {IDLE.layers.map((l, i) => (
            <article key={l.name} className="bg-[var(--void)] p-6 md:p-10">
              <div className="flex items-center justify-between">
                <p className="eyebrow" style={{ color: i === 0 ? "var(--value)" : "var(--agent)" }}>
                  {String(i + 1).padStart(2, "0")} · {l.tag}
                </p>
                <span aria-hidden className="mono text-[0.7rem] text-[var(--paper-dim)]">
                  {i === 0 ? "▲" : "▼"}
                </span>
              </div>
              <LayerArt kind={i} />
              <h3 className="display display-m mt-5">{l.name}</h3>
              <p className="mt-4 text-[var(--paper-dim)]">{l.body}</p>
              <dl className="mt-8">
                {l.rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-t border-[var(--rule)] py-3">
                    <dt className="eyebrow pt-0.5">{k}</dt>
                    <dd className="mono text-[0.84rem]">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* ───── 02 Lifecycle ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-life">
        <SectionHead index={idx(3, N, "LIFECYCLE")} title={<span id="idle-life">{IDLE.lifecycle.title}</span>} />
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
          {/* the membrane as a horizontal rule through the middle step */}
          {IDLE.lifecycle.steps.map((s, i) => {
            const on = s.where.startsWith("on-chain");
            return (
              <li key={s.name} className="relative md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-[var(--rule)]">
                <Reveal delay={i * 120}>
                  <div className="flex items-center gap-3">
                    <span className="mono text-[0.72rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="h-px flex-1 bg-[var(--rule-strong)]" aria-hidden />
                    <span className="mono text-[0.66rem] uppercase tracking-[0.16em]" style={{ color: on ? "var(--value)" : "var(--agent)" }}>
                      {s.where}
                    </span>
                  </div>
                  <LifeGlyph kind={i} />
                  <h3 className="display display-m">{s.name}</h3>
                  <p className="mt-3 text-[var(--paper-dim)]">{s.body}</p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ───── 03 Payouts ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-pay">
        <SectionHead index={idx(4, N, "PAYOUT")} title={<span id="idle-pay">{IDLE.payouts.title}</span>}>
          <p>{IDLE.payouts.body}</p>
        </SectionHead>
        <div className="mt-12">
          <PayoutCalculator />
        </div>
        <p className="mt-6 max-w-[62ch] text-[var(--paper-dim)]">{IDLE.payouts.after}</p>
      </section>

      {/* ───── 04 Token ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-token">
        <SectionHead index={idx(5, N, "TOKEN")} title={<span id="idle-token">{IDLE.token.title}</span>}>
          <p>{IDLE.token.body}</p>
        </SectionHead>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {IDLE.token.cards.map((c, i) => (
            <Card key={c.title} className="p-6 md:p-9">
              <p className="mono text-[0.7rem] text-[var(--value)]">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="display mt-4 text-[1.5rem] md:text-[1.9rem]" style={{ fontVariationSettings: '"wdth" 80, "wght" 650' }}>
                {c.title}
              </h3>
              <p className="mt-4 text-[var(--paper-dim)]">{c.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Btn href={IDLE.token.chart.href} variant="line" tone="value">
            {IDLE.token.chart.label}
          </Btn>
        </div>
      </section>

      {/* ───── 05 Rollout ───── */}
      <section className="shell mt-32 md:mt-44" aria-labelledby="idle-roll">
        <SectionHead index={idx(6, N, "STAGE")} title={<span id="idle-roll">{IDLE.rollout.title}</span>} />
        <ol className="relative mt-14 grid gap-px md:grid-cols-2">
          <span aria-hidden className="absolute left-0 right-0 top-[11px] hidden h-px bg-[var(--rule-strong)] md:block" />
          {IDLE.rollout.stages.map((s, i) => {
            const here = i === stageIdx;
            const past = i < stageIdx;
            return (
              <li key={s.key} className="relative pr-8" aria-current={here ? "step" : undefined}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="relative z-10 block h-[22px] w-[22px] rotate-45 border"
                    style={{ borderColor: here ? "var(--signal)" : "var(--rule-strong)", background: here || past ? "var(--signal)" : "var(--void)" }}
                  />
                  {here && (
                    <span className="mono inline-flex items-center gap-2 bg-[var(--signal)] px-2 py-0.5 text-[0.64rem] tracking-[0.18em] text-[var(--void)]">
                      <i className="led" style={{ width: 5, height: 5 }} />
                      {IDLE.rollout.here}
                    </span>
                  )}
                </div>
                <h3 className="display mt-6 text-[clamp(2.4rem,5vw,4.4rem)]" style={{ color: here ? "var(--paper)" : "var(--paper-dim)" }}>
                  {s.name}
                </h3>
                <p className="mt-3 max-w-[46ch] text-[var(--paper-dim)]">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ───── 06 Assets ───── */}
      <section className="shell mb-40 mt-32 md:mt-44" aria-labelledby="idle-assets">
        <SectionHead index={idx(7, N, "ASSETS")} title={<span id="idle-assets">{IDLE.assets.title}</span>}>
          <p>{IDLE.assets.note}</p>
        </SectionHead>
        <ul className="mt-12 border-t border-[var(--rule)]">
          {FACTS.acceptedAssets.map((a) => (
            <li key={a.symbol} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-[var(--rule)] py-5 md:grid-cols-[9rem_6rem_minmax(0,1fr)_auto]">
              <span className="display text-[1.6rem] md:text-[2rem]" style={{ fontVariationSettings: '"wdth" 75, "wght" 700' }}>
                {a.symbol}
              </span>
              <span className="flex items-center gap-2">
                <StatusTag status={a.kind.toUpperCase()} />
                {a.note && <span className="mono text-[0.68rem] text-[var(--value)] md:hidden">{a.note}</span>}
              </span>
              <span className="mono col-span-2 min-w-0 break-all text-[0.78rem] text-[var(--paper-dim)] md:col-span-1">
                {a.mint ?? "native · no mint"}
                {a.note && <span className="ml-3 hidden text-[var(--value)] md:inline">{a.note}</span>}
              </span>
              {a.mint ? <CopyBtn text={a.mint} label={`Copy ${a.symbol} mint address`} /> : <span className="hidden md:block" />}
            </li>
          ))}
        </ul>
        <p className="mono mt-6 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">rake {fmtPct(FACTS.rake)} · withdrawal minimum {FACTS.withdrawMinIdle} IDLE</p>
      </section>
    </>
  );
}

/**
 * Layer illustrations. On-chain: finalized blocks in a chain, one deposit address that is used once.
 * IDLE credit: a ledger whose rows settle instantly (no block to wait for).
 */
function LayerArt({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <svg viewBox="0 0 320 90" className="mt-6 h-[90px] w-full max-w-[360px]" aria-hidden>
        {[0, 1, 2, 3, 4].map((b) => (
          <g key={b} transform={`translate(${8 + b * 62},20)`}>
            <rect width="44" height="44" fill="none" stroke="var(--value)" strokeWidth="1.2" opacity={0.35 + b * 0.15} />
            <line x1="6" x2="38" y1="14" y2="14" stroke="var(--value)" strokeWidth="1" opacity="0.5" />
            <line x1="6" x2="30" y1="22" y2="22" stroke="var(--value)" strokeWidth="1" opacity="0.5" />
            {b < 4 && <line x1="44" x2="62" y1="22" y2="22" stroke="var(--value)" strokeWidth="1" strokeDasharray="2 2" />}
            {b === 4 && <path d="M14 30 l6 6 l12 -12" stroke="var(--signal)" strokeWidth="1.6" fill="none" className="la-check" />}
          </g>
        ))}
        <text x="8" y="84" className="mono" fontSize="9" fill="var(--paper-dim)">
          finalized ›
        </text>
        <style>{`.la-check{stroke-dasharray:30;stroke-dashoffset:30;animation:la-c 3.2s steps(8) infinite}@keyframes la-c{40%,100%{stroke-dashoffset:0}}`}</style>
      </svg>
    );
  return (
    <svg viewBox="0 0 320 90" className="mt-6 h-[90px] w-full max-w-[360px]" aria-hidden>
      {[0, 1, 2, 3].map((r) => (
        <g key={r} transform={`translate(8,${12 + r * 18})`} className="la-row" style={{ animationDelay: `${r * 0.35}s` }}>
          <rect width="4" height="10" fill={r % 2 ? "var(--hot)" : "var(--value)"} />
          <line x1="14" x2={120 + ((r * 37) % 60)} y1="5" y2="5" stroke="var(--agent)" strokeWidth="1" opacity="0.6" />
          <text x="300" y="9" textAnchor="end" className="mono" fontSize="9" fill={r % 2 ? "var(--hot)" : "var(--value)"}>
            {r % 2 ? "− entry" : "+ payout"}
          </text>
        </g>
      ))}
      <style>{`.la-row{animation:la-r 2.8s steps(4) infinite}@keyframes la-r{0%{opacity:.25}20%,100%{opacity:1}}`}</style>
    </svg>
  );
}

/** Tiny glyph per lifecycle step: crossing down, loop, crossing up. */
function LifeGlyph({ kind }: { kind: number }) {
  return (
    <svg viewBox="0 0 120 64" className="my-6 h-16 w-[120px]" aria-hidden>
      <line x1="0" y1="32" x2="120" y2="32" stroke="var(--paper-dim)" strokeWidth="1" strokeDasharray="2 3" />
      {kind === 0 && (
        <>
          <path d="M60 4 V58" stroke="var(--value)" strokeWidth="1.5" fill="none" />
          <path d="M54 52 L60 58 L66 52" stroke="var(--value)" strokeWidth="1.5" fill="none" />
        </>
      )}
      {kind === 1 && (
        <>
          <ellipse cx="60" cy="47" rx="38" ry="11" stroke="var(--agent)" strokeWidth="1.5" fill="none" />
          <ellipse cx="60" cy="47" rx="24" ry="6" stroke="var(--agent)" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="98" cy="47" r="3" fill="var(--value)" />
        </>
      )}
      {kind === 2 && (
        <>
          <path d="M60 58 V4" stroke="var(--value)" strokeWidth="1.5" fill="none" />
          <path d="M54 10 L60 4 L66 10" stroke="var(--value)" strokeWidth="1.5" fill="none" />
        </>
      )}
    </svg>
  );
}
