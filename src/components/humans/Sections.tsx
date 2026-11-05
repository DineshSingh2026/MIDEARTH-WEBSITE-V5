"use client";
import { useState } from "react";
import { HUMANS } from "@/content/copy/humans";
import { Mascot } from "@/components/brand/Mascot";
import { useInView, useMotionOK, useTicks } from "@/components/agents/hooks";

/* ───────── Placeholder tokens stay visibly placeholders ───────── */
export function Placeholder({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{\{[A-Z_]+\}\})/g).map((s, i) =>
        /^\{\{/.test(s) ? (
          <span key={i} className="mx-px border border-dashed border-[var(--rule-strong)] px-1 text-[var(--paper-dim)]">
            {s}
          </span>
        ) : (
          <span key={i}>{s}</span>
        ),
      )}
    </>
  );
}

/* ───────── 01 Linking: code types in → Link agent → Agent linked ───────── */
const CODE = HUMANS.linking.steps[0].chip;
const [LINK_BTN, LINK_DONE] = HUMANS.linking.steps[1].chip.split(" → ");

export function Linking() {
  const [run, setRun] = useState(0);
  return <LinkingInner key={run} onReplay={() => setRun((r) => r + 1)} />;
}

function LinkingInner({ onReplay }: { onReplay: () => void }) {
  const motion = useMotionOK();
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "0px 0px -25% 0px" });
  // timeline in 20Hz ticks: 10 wait · type code (1 char / 2 ticks) · 12 wait · press · 10 · linked
  const typeEnd = 10 + CODE.length * 2;
  const press = typeEnd + 12;
  const linked = press + 10;
  const total = linked + 4;
  const [t] = useTicks(motion && inView, total);
  const tk = motion ? t : total;
  const chars = Math.max(0, Math.min(CODE.length, Math.floor((tk - 10) / 2)));
  const step = tk >= linked ? 2 : tk >= typeEnd ? 1 : 0;
  const pressed = tk >= press && tk < press + 4;

  return (
    <div ref={ref} className="grid gap-10 lg:grid-cols-12">
      <ol className="grid gap-px self-start border border-[var(--rule)] bg-[var(--rule)] lg:col-span-6">
        {HUMANS.linking.steps.map((s, i) => (
          <li key={s.n} className="relative bg-[var(--void)] p-6 transition-colors duration-500 md:p-8" style={{ background: i === step ? "var(--deck)" : undefined }}>
            <span
              aria-hidden
              className="absolute bottom-0 left-0 top-0 w-[2px] origin-top bg-[var(--signal)] transition-transform duration-700 ease-[var(--ease-expo)]"
              style={{ transform: `scaleY(${i <= step ? 1 : 0})` }}
            />
            <div className="flex items-baseline gap-5">
              <span className="mono text-[0.72rem] text-[var(--paper-dim)]">
                {s.n} / {String(HUMANS.linking.steps.length).padStart(2, "0")}
              </span>
              <h3 className="display text-[1.5rem] md:text-[1.8rem]">{s.title}</h3>
            </div>
            <p className="mt-3 max-w-[50ch] text-[var(--paper-dim)]">{s.body}</p>
            <p className="mono mt-4 inline-block border border-[var(--rule-strong)] px-2 py-1 text-[0.7rem]">{s.chip}</p>
          </li>
        ))}
      </ol>

      {/* Mock redeem panel — animated; aria-hidden, the list on the left is the text equivalent */}
      <div aria-hidden className="ticks relative self-start border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-10 lg:col-span-6 lg:mt-16">
        <div className="mono flex items-center justify-between text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">
          <span>owner dashboard · link an agent</span>
          <span>{step === 2 ? "linked" : step === 1 ? "ready" : "awaiting code"}</span>
        </div>
        <div className="mt-8 flex items-stretch border border-[var(--rule-strong)] bg-[var(--void)]">
          <span className="mono flex items-center border-r border-[var(--rule)] px-3 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">code</span>
          <span className="mono flex-1 px-4 py-4 text-[1.3rem] tracking-[0.12em] md:text-[1.6rem]">
            {CODE.slice(0, chars)}
            <span className="text-[var(--rule-strong)]">{CODE.slice(chars).replace(/[^-]/g, "·")}</span>
            {chars < CODE.length && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-[var(--paper)]" style={{ animation: "caret 1s steps(1) infinite" }} />}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <span
            className="mono inline-flex items-center gap-3 px-5 py-3 text-[0.78rem] uppercase tracking-[0.14em] transition-all duration-200"
            style={{
              background: step >= 1 ? "var(--paper)" : "transparent",
              color: step >= 1 ? "var(--void)" : "var(--paper-dim)",
              border: "1px solid var(--rule-strong)",
              transform: pressed ? "scale(0.97)" : "none",
            }}
          >
            {LINK_BTN} →
          </span>
          <span className="mono flex items-center gap-2.5 text-[0.82rem] transition-opacity duration-500" style={{ opacity: step === 2 ? 1 : 0, color: "var(--signal)" }}>
            <i className="led" style={{ width: 6, height: 6 }} />
            {LINK_DONE}
          </span>
        </div>
        <div className="mt-10 flex items-end justify-between gap-6 border-t border-[var(--rule)] pt-6">
          <p className="mono text-[0.7rem] text-[var(--paper-dim)]">{HUMANS.linking.steps[2].chip}</p>
          <div className="transition-transform duration-700 ease-[var(--ease-expo)]" style={{ transform: step === 2 ? "translateY(0)" : "translateY(8px)", opacity: step === 2 ? 1 : 0.35 }}>
            <Mascot kind="play" size={40} />
          </div>
        </div>
      </div>
      {motion && (
        <button
          type="button"
          onClick={onReplay}
          className="mono justify-self-start text-[0.66rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] underline-offset-4 hover:underline lg:col-span-12 lg:justify-self-end"
        >
          ↺ replay linking
        </button>
      )}
    </div>
  );
}

/* ───────── 02 Dashboard ledger — placeholder rows type in ───────── */
export function Ledger() {
  const motion = useMotionOK();
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "0px 0px -20% 0px" });
  const rows = HUMANS.dashboard.rows;
  const rowLen = (r: (typeof rows)[number]) => r.kind.length + r.amount.length + r.ref.length;
  const CPT = 2;
  const costs = rows.map((r) => Math.ceil(rowLen(r) / CPT) + 4);
  const total = costs.reduce((a, b) => a + b, 0);
  const [t] = useTicks(motion && inView, total);
  const tk = motion ? t : total;

  let budget = tk;
  return (
    <div ref={ref} className="ticks border border-[var(--rule)] bg-[var(--void)]">
      <div className="mono grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--rule-strong)] px-5 py-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)] md:grid-cols-[10rem_1fr_1fr] md:px-8">
        <span>kind</span>
        <span className="text-right md:text-left">amount</span>
        <span className="hidden md:block">reference</span>
      </div>
      <table className="sr-only">
        <caption>Ledger sample with placeholder values</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kind}>
              <td>{r.kind}</td>
              <td>{r.amount}</td>
              <td>{r.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol aria-hidden>
        {rows.map((r, i) => {
          const avail = Math.max(0, budget) * CPT;
          budget -= costs[i];
          const shown = Math.min(avail, rowLen(r));
          const a = Math.min(r.kind.length, shown);
          const b = Math.min(r.amount.length, Math.max(0, shown - r.kind.length));
          const c = Math.min(r.ref.length, Math.max(0, shown - r.kind.length - r.amount.length));
          const on = shown > 0;
          return (
            <li
              key={r.kind}
              className="mono relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-[var(--rule)] px-5 py-5 text-[0.82rem] transition-opacity duration-300 last:border-b-0 md:grid-cols-[10rem_1fr_1fr] md:px-8"
              style={{ opacity: on ? 1 : 0.18 }}
            >
              <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[2px]" style={{ background: `var(--${r.tone})`, opacity: on ? 1 : 0 }} />
              <span className="uppercase tracking-[0.1em] text-[var(--paper-dim)]">{r.kind.slice(0, a) || " "}</span>
              <span className="text-right md:text-left" style={{ color: `var(--${r.tone})` }}>
                <Placeholder text={r.amount.slice(0, b)} />
              </span>
              <span className="col-span-2 truncate text-[var(--paper-dim)] md:col-span-1">
                <Placeholder text={r.ref.slice(0, c)} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────── 03 Observe-only: the owner scope as a permissions manifest ───────── */
export function Manifest() {
  const o = HUMANS.observe;
  return (
    <div className="ticks border border-[var(--rule)] bg-[var(--deck)]">
      <div className="mono flex items-center justify-between border-b border-[var(--rule)] px-5 py-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)] md:px-8">
        <span>owner_scope.manifest</span>
        <span>{o.scope.length} capabilities</span>
      </div>
      <ul className="mono text-[0.86rem]">
        {o.scope.map((s, i) => {
          const [verb, ...rest] = s.split(" ");
          const write = verb === "write";
          return (
            <li key={s} className="grid grid-cols-[2.5rem_4.5rem_1fr_auto] items-center border-b border-[var(--rule)] px-5 py-4 md:grid-cols-[3rem_5rem_1fr_auto] md:px-8">
              <span className="text-[0.7rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
              <span
                className="justify-self-start border px-1.5 py-0.5 text-[0.62rem] uppercase tracking-[0.14em]"
                style={{ color: write ? "var(--frost)" : "var(--agent)", borderColor: `color-mix(in oklab, ${write ? "var(--frost)" : "var(--agent)"} 45%, transparent)` }}
              >
                {verb}
              </span>
              <span>{rest.join(" ")}</span>
              <span className="text-[0.66rem] text-[var(--paper-dim)]">{write ? "stops only" : "view"}</span>
            </li>
          );
        })}
        {/* the struck-out empty row */}
        <li className="relative grid grid-cols-[2.5rem_1fr] items-center px-5 py-5 md:grid-cols-[3rem_1fr] md:px-8">
          <span className="text-[0.7rem] text-[var(--paper-dim)]">{String(o.scope.length + 1).padStart(2, "0")}</span>
          <span className="relative block">
            <span aria-hidden className="absolute left-0 right-0 top-1/2 h-px bg-[var(--hot)] opacity-70" />
            <span aria-hidden className="relative inline-block h-5 w-[min(60%,16rem)] border border-dashed border-[var(--rule-strong)] bg-[var(--deck)]" />
          </span>
          <span className="col-span-2 mt-3 text-[0.74rem] italic text-[var(--paper-dim)]">— {o.missing}</span>
        </li>
      </ul>
      <p className="mono border-t border-[var(--rule)] px-5 py-4 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--paper-dim)] md:px-8">{o.oneOwner}</p>
    </div>
  );
}

/* ───────── Observe-only illustration: data flows out to you; value cannot ───────── */
const SCOPE_CSS = `
@keyframes sc-flow{to{stroke-dashoffset:-24}}
@keyframes sc-bounce{0%,20%{transform:translateX(0);opacity:0}30%{opacity:1}60%{transform:translateX(62px);opacity:1}75%,100%{transform:translateX(48px);opacity:0}}
.sc-flow{stroke-dasharray:4 8;animation:sc-flow 1.2s linear infinite}
.sc-bounce{animation:sc-bounce 3.6s cubic-bezier(.16,1,.3,1) infinite}
`;
export function ScopeArt() {
  const mono = { fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: ".1em" } as const;
  return (
    <svg viewBox="0 0 280 120" className="h-auto w-full" aria-hidden>
      <style>{SCOPE_CSS}</style>
      {/* the agent's account */}
      <rect x="10" y="26" width="72" height="68" fill="none" stroke="var(--paper)" strokeWidth=".8" />
      <text x="46" y="20" textAnchor="middle" fill="var(--paper-dim)" {...mono}>AGENT ACCOUNT</text>
      <circle cx="46" cy="60" r="16" fill="none" stroke="var(--value)" strokeWidth="1" />
      <text x="46" y="63" textAnchor="middle" fill="var(--value)" {...mono}>IDLE</text>
      {/* the glass */}
      <line x1="150" y1="10" x2="150" y2="110" stroke="var(--paper-dim)" strokeWidth="2" opacity=".35" />
      {/* read: data passes through */}
      <path className="sc-flow" d="M82 40 H230" stroke="var(--agent)" strokeWidth="1.2" fill="none" />
      <text x="116" y="34" textAnchor="middle" fill="var(--agent)" {...mono}>READ ↦</text>
      {/* value: stopped at the glass */}
      <g className="sc-bounce">
        <rect x="84" y="74" width="16" height="10" fill="var(--value)" />
      </g>
      <path d="M144 72l12 12M156 72l-12 12" stroke="var(--hot)" strokeWidth="1.4" />
      <text x="116" y="98" textAnchor="middle" fill="var(--paper-dim)" {...mono}>VALUE ✕</text>
      {/* you */}
      <ellipse cx="248" cy="40" rx="18" ry="10" fill="none" stroke="var(--paper)" strokeWidth=".9" />
      <circle cx="248" cy="40" r="4.5" fill="var(--paper)" />
      <text x="248" y="64" textAnchor="middle" fill="var(--paper-dim)" {...mono}>YOU</text>
      <circle cx="248" cy="84" r="9" fill="none" stroke="var(--frost)" strokeWidth=".9" />
      <path d="M248 77v14M241 84h14M243 79l10 10M253 79l-10 10" stroke="var(--frost)" strokeWidth=".8" />
      <text x="248" y="106" textAnchor="middle" fill="var(--frost)" {...mono}>FREEZE</text>
      <path d="M236 84 H160" stroke="var(--frost)" strokeWidth=".8" strokeDasharray="2 3" />
    </svg>
  );
}

/* ───────── Reactivation: old pair struck, fresh code redeemed, new pair forged ───────── */
const RE_CSS = `
@keyframes re-strike{0%,15%{transform:scaleX(0)}35%,100%{transform:scaleX(1)}}
@keyframes re-old{0%,30%{opacity:1}45%,100%{opacity:.35}}
@keyframes re-code{0%,40%{opacity:0;transform:translateY(6px)}55%,100%{opacity:1;transform:none}}
@keyframes re-new{0%,60%{opacity:0;transform:translateX(-10px)}78%,100%{opacity:1;transform:none}}
.re-strike{transform-origin:left;animation:re-strike 6s cubic-bezier(.16,1,.3,1) infinite}
.re-old{animation:re-old 6s steps(6) infinite}
.re-code{animation:re-code 6s cubic-bezier(.16,1,.3,1) infinite}
.re-new{animation:re-new 6s cubic-bezier(.16,1,.3,1) infinite}
`;
export function Reactivation({ code }: { code: string }) {
  const Row = ({ name, pre, tone, old }: { name: string; pre: string; tone: string; old?: boolean }) => (
    <p className={`relative flex items-center justify-between gap-4 ${old ? "re-old text-[var(--paper-dim)]" : "re-new"}`} style={old ? undefined : { color: `var(--${tone})` }}>
      <span>
        {name} {pre}…
      </span>
      <span className="text-[0.62rem] uppercase tracking-[0.16em]">{old ? "revoked" : "new"}</span>
      {old && <span className="re-strike absolute left-0 right-0 top-1/2 h-px bg-[var(--hot)]" />}
    </p>
  );
  return (
    <div aria-hidden className="mono grid gap-3 text-[0.82rem]">
      <style>{RE_CSS}</style>
      <Row name="gameplay_key" pre="gp_" tone="agent" old />
      <Row name="financial_key" pre="fk_" tone="value" old />
      <p className="re-code my-2 flex items-center gap-3 text-[var(--paper-dim)]">
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
        <span className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper)]">redeem · {code}</span>
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
      </p>
      <Row name="gameplay_key" pre="gp_" tone="agent" />
      <Row name="financial_key" pre="fk_" tone="value" />
    </div>
  );
}
