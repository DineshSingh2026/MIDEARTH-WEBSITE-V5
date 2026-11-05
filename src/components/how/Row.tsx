"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CallChip, Reveal } from "@/components/ui/primitives";
import { useUI } from "@/store/ui";
import { HOW } from "@/content/copy/howItWorks";
import { GlassRule } from "./GlassSeam";
import { AgentIllo, OwnerIllo } from "./Illustrations";
import { SCRIPT, type LineKind, type OwnerKind, type RowScript } from "./script";
import s from "./how.module.css";

gsap.registerPlugin(ScrollTrigger);

type RowCopy = (typeof HOW.rows)[number];
const pad = (n: number) => String(n).padStart(2, "0");
const GRID_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--paper) calc(var(--grid-alpha) * 100%), transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--paper) calc(var(--grid-alpha) * 100%), transparent) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

const GLYPH: Record<LineKind, string> = { cmd: "$", ok: "←", key: "◆", wait: "…", hot: "✕", note: "~" };
const LINE_COLOR: Record<LineKind, string> = {
  cmd: "var(--paper)",
  ok: "var(--signal)",
  key: "var(--agent)",
  wait: "var(--paper-dim)",
  hot: "var(--hot)",
  note: "var(--paper-dim)",
};

export function HowRow({ index, row, total }: { index: number; row: RowCopy; total: number }) {
  const root = useRef<HTMLElement>(null);
  const motion = useUI((st) => st.motion);
  const script = SCRIPT[index];
  const [frost, setFrost] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const frostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseFrost = (ms = 1700) => {
    setFrost(true);
    if (frostTimer.current) clearTimeout(frostTimer.current);
    frostTimer.current = setTimeout(() => setFrost(false), ms);
  };
  useEffect(() => () => {
    if (frostTimer.current) clearTimeout(frostTimer.current);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !motion) return;
    const isFreeze = script.owner === "freeze";
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const lines = q("[data-line]") as HTMLElement[];
      const chips = q("[data-chip]");
      const orows = q("[data-o]");
      const rules = q("[data-rule]");
      gsap.set(lines, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(chips, { autoAlpha: 0, y: 8 });
      gsap.set(orows, { autoAlpha: 0, y: 14 });
      gsap.set(rules, { scaleX: 0, transformOrigin: "0 50%" });
      const tl = gsap.timeline({ paused: true });
      let at = 0.2;
      let hotAt = -1;
      lines.forEach((l) => {
        const n = Math.max(8, (l.textContent || "").length);
        const d = n * 0.017;
        if (l.dataset.kind === "hot") hotAt = at;
        tl.to(l, { clipPath: "inset(0 0% 0 0)", duration: d, ease: `steps(${n})` }, at);
        at += d + (l.dataset.kind === "wait" ? 0.45 : 0.14);
      });
      tl.to(chips, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "expo.out" }, 0.35);
      tl.to(rules, { scaleX: 1, duration: 1.3, stagger: 0.12, ease: "expo.inOut" }, 0.1);
      tl.to(orows, { autoAlpha: 1, y: 0, duration: 1.2, stagger: Math.min(0.32, at / Math.max(1, orows.length) * 0.7), ease: "expo.out" }, 0.3);
      if (isFreeze && hotAt >= 0) tl.call(() => pulseFrost(1900), [], hotAt);
      ScrollTrigger.create({ trigger: el, start: "top 70%", once: true, onEnter: () => tl.play() });
      if (isFreeze) {
        ScrollTrigger.create({ trigger: el, start: "top 70%", onEnterBack: () => pulseFrost(1400) });
      }
    }, el);
    return () => ctx.revert();
  }, [motion, script]);

  const n = index + 1;
  const agentEmpty = !row.agent.title;

  return (
    <article ref={root} className="relative grid md:grid-cols-2" aria-labelledby={`how-row-${n}`}>
      <h2 id={`how-row-${n}`} className="sr-only">
        Step {n} of {total}: {row.agent.title || "Agent keeps playing"} and {row.owner.title}
      </h2>

      {/* giant index numeral straddling the seam — refracted by the glass */}
      <div
        aria-hidden
        className="display pointer-events-none absolute left-1/2 top-10 z-[1] hidden -translate-x-1/2 select-none text-white mix-blend-difference md:block"
        style={{ fontSize: "clamp(7rem, 15vw, 15rem)", opacity: 0.09, fontVariationSettings: '"wdth" 125, "wght" 800', lineHeight: 0.8 }}
      >
        {pad(n)}
      </div>

      {/* ── FIELD · agent ── */}
      <div data-mode="field" className="relative min-w-0 bg-[var(--void)] text-[var(--paper)]" style={GRID_BG}>
        <div className="mx-auto flex h-full max-w-[640px] flex-col px-4 pb-14 pt-14 sm:px-6 md:ml-auto md:mr-0 md:px-0 md:pb-28 md:pl-10 md:pr-[clamp(56px,6vw,110px)] md:pt-28">
          <Meta n={n} total={total} side="Field" hint={HOW.heads.agent} />
          {agentEmpty ? (
            <p className="mono mt-6 text-[0.95rem] text-[var(--paper-dim)]">{row.agent.body}</p>
          ) : (
            <>
              <Reveal as="h3" width className="display display-l mt-6">
                {row.agent.title}
              </Reveal>
              <Reveal as="p" delay={100} className="mt-5 max-w-[46ch] text-[var(--paper-dim)]">
                {row.agent.body}
              </Reveal>
            </>
          )}
          <AgentIllo step={index} />
          <Terminal script={script} n={n} />
          <div className="mt-4 flex flex-wrap gap-2">
            {script.chips.map((c) => (
              <span key={c.path} data-chip className="max-w-full">
                <CallChip method={c.method} path={c.path} />
              </span>
            ))}
          </div>
          {script.keys && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Credentials returned">
              {script.keys.map((k) => (
                <li key={k.label} data-chip className="mono flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: `var(--${k.tone})` }}>
                  <KeyGlyph />
                  {k.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── STANDS · owner ── */}
      <div data-mode="stands" className="relative min-w-0 bg-[var(--void)] text-[var(--paper)]" style={GRID_BG}>
        <GlassRule />
        <div className="relative mx-auto flex h-full max-w-[640px] flex-col px-4 pb-14 pt-14 sm:px-6 md:ml-0 md:mr-auto md:px-0 md:pb-28 md:pl-[clamp(56px,6vw,110px)] md:pr-10 md:pt-28">
          <Meta n={n} total={total} side="Stands" hint={HOW.heads.owner} />
          <Reveal as="h3" width className="display display-l mt-6">
            {row.owner.title}
          </Reveal>
          <Reveal as="p" delay={100} className="mt-5 max-w-[46ch] text-[var(--paper-dim)]">
            {row.owner.body}
          </Reveal>
          <OwnerIllo step={index} />
          <OwnerPanel
            kind={script.owner}
            frozen={frozen}
            onFreeze={() => {
              const next = !frozen;
              setFrozen(next);
              if (next) pulseFrost(motion ? 1600 : 1200);
            }}
          />
        </div>
        <div className={s.frost} data-on={frost ? "true" : "false"} aria-hidden />
      </div>
    </article>
  );
}

function Meta({ n, total, side, hint }: { n: number; total: number; side: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="mono text-[0.72rem] tracking-[0.18em] text-[var(--paper-dim)]">
        {pad(n)} / {pad(total)}
      </p>
      <p className="mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--paper-dim)] md:hidden">{hint}</p>
      <p className="mono hidden text-[0.68rem] uppercase tracking-[0.18em] text-[var(--paper-dim)] md:block" aria-hidden>
        {side}
      </p>
    </div>
  );
}

function KeyGlyph() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden>
      <circle cx="5" cy="5" r="3.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.6 5H17M14 5v3M16.4 5v2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function Terminal({ script, n }: { script: RowScript; n: number }) {
  return (
    <figure className="mt-8 border border-[var(--rule-strong)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)]">
      <figcaption className="mono flex items-center justify-between border-b border-[var(--rule-strong)] px-3 py-2 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        <span className="flex items-center gap-2">
          <i className="led" style={{ width: 5, height: 5, color: "var(--signal)" }} aria-hidden />
          agent · tty{pad(n)}
        </span>
        <span>by api key</span>
      </figcaption>
      <ol className="mono space-y-1.5 overflow-hidden px-3 py-4 text-[0.74rem] leading-relaxed sm:text-[0.8rem]">
        {script.lines.map((l, i) => (
          <li key={i} data-line data-kind={l.k} className="flex min-w-0 gap-3 whitespace-pre" style={{ color: l.tone ? `var(--${l.tone})` : LINE_COLOR[l.k] }}>
            <span aria-hidden className="w-3 shrink-0 text-center opacity-70">
              {GLYPH[l.k]}
            </span>
            <span className="min-w-0 truncate">{l.t}</span>
          </li>
        ))}
        <li aria-hidden className="pl-6">
          <span className={s.cursor} />
        </li>
      </ol>
    </figure>
  );
}

/* ───────────────────────── Owner side: calm ledger surfaces ───────────────────────── */

function Panel({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-8 border border-[var(--rule)] bg-[var(--deck)]">
      <div className="mono flex items-center justify-between px-4 py-2.5 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        <span>{label}</span>
        {right}
      </div>
      <div data-rule className="h-px bg-[var(--rule-strong)]" />
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LedgerRow({ k, v, strike, vColor }: { k: string; v: ReactNode; strike?: boolean; vColor?: string }) {
  return (
    <div data-o className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-2.5 last:border-b-0">
      <span className={`text-[0.95rem] ${strike ? "text-[var(--paper-dim)] line-through decoration-[var(--paper-dim)]" : ""}`}>{k}</span>
      <span className="mono text-right text-[0.74rem] uppercase tracking-[0.12em]" style={{ color: vColor ?? "var(--paper-dim)" }}>
        {v}
      </span>
    </div>
  );
}

const ReadOnly = () => (
  <span className="flex items-center gap-1.5">
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden>
      <rect x="0.6" y="4.6" width="7.8" height="5.8" stroke="currentColor" strokeWidth="1.1" />
      <path d="M2.2 4.6V3a2.3 2.3 0 0 1 4.6 0v1.6" stroke="currentColor" strokeWidth="1.1" />
    </svg>
    read-only
  </span>
);

/** Deterministic tile pattern for the illustrative live grid. */
const TILES = Array.from({ length: 20 * 10 }, (_, i) => {
  const h = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const r = h - Math.floor(h);
  return { t: r < 0.12 ? "a" : r < 0.22 ? "b" : r < 0.27 ? "c" : "", d: `${-((r * 37) % 4).toFixed(2)}s` };
});

function OwnerPanel({ kind, frozen, onFreeze }: { kind: OwnerKind; frozen: boolean; onFreeze: () => void }) {
  switch (kind) {
    case "none":
      return (
        <Panel label="Your seat" right={<span>empty</span>}>
          <LedgerRow k="Human account" v="none" />
          <LedgerRow k="Sign-up form" v="does not exist" strike />
          <LedgerRow k="Rows in ledger" v="0" />
        </Panel>
      );
    case "link":
      return (
        <Panel label="Redeem claim code" right={<span>one-time</span>}>
          <div data-o className="flex items-center gap-1.5 py-2" aria-label="Claim code, masked">
            {"••••-••••".split("").map((c, i) =>
              c === "-" ? (
                <span key={i} className="mono px-1 text-[var(--paper-dim)]" aria-hidden>
                  –
                </span>
              ) : (
                <span key={i} aria-hidden className="mono grid h-9 w-7 place-items-center border border-[var(--rule-strong)] bg-[var(--void)] text-[0.9rem]">
                  •
                </span>
              ),
            )}
          </div>
          <LedgerRow k="Seat" v={<span className="flex items-center gap-2"><i className="led" style={{ width: 5, height: 5 }} aria-hidden />linked</span>} vColor="var(--signal)" />
          <LedgerRow k="Order" v="any time after register" />
        </Panel>
      );
    case "observe":
      return (
        <Panel label="Scope" right={<span>read · write</span>}>
          {["Balance", "Lifetime earnings", "Full ledger"].map((k) => (
            <LedgerRow
              key={k}
              k={k}
              v={
                <span className="flex gap-4">
                  <span style={{ color: "var(--signal)" }}>✓ read</span>
                  <span className="line-through">write</span>
                </span>
              }
            />
          ))}
        </Panel>
      );
    case "watch":
      return (
        <Panel label="Live · streamed state" right={<ReadOnly />}>
          <div data-o className={`${s.liveGrid} py-2`} aria-hidden>
            {TILES.map((t, i) => (
              <i key={i} data-t={t.t || undefined} style={{ "--d": t.d } as CSSProperties} />
            ))}
          </div>
          <p data-o className="mono pt-2 text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
            Illustrative · the real view streams the running match
          </p>
        </Panel>
      );
    case "read":
      return (
        <Panel label="Ledger" right={<span>with references</span>}>
          <LedgerRow k="Payout · rank-based" v="ref ••••  + IDLE" vColor="var(--value)" />
          <LedgerRow k="Withdrawal · Solana" v="ref ••••  − IDLE" />
          <LedgerRow k="Your action" v="none required" />
        </Panel>
      );
    case "freeze":
      return (
        <Panel label="The one lever" right={<span style={{ color: frozen ? "var(--frost)" : undefined }}>{frozen ? "frozen" : "active"}</span>}>
          <div data-o className="flex flex-wrap items-center justify-between gap-4 py-2">
            <button
              type="button"
              aria-pressed={frozen}
              onClick={onFreeze}
              className="mono inline-flex items-center gap-3 border px-5 py-3 text-[0.78rem] uppercase tracking-[0.14em] transition-colors duration-300"
              style={
                frozen
                  ? { background: "var(--frost)", color: "var(--void)", borderColor: "var(--frost)" }
                  : { color: "var(--frost)", borderColor: "var(--frost)" }
              }
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M7 0v14M0 7h14M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              {frozen ? "Agent frozen (demo)" : "Freeze agent (demo)"}
            </button>
            <span className="mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">stops · never starts</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {frozen ? "Demo: agent frozen. Reactivation requires a fresh claim code and new keys." : ""}
          </p>
          <LedgerRow k="Available" v="from the moment you link" />
          <LedgerRow k="Reactivation" v="fresh code · new keys" />
        </Panel>
      );
  }
}
