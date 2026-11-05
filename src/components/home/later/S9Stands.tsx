"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { Btn, Card, Odometer, Reveal, SectionIndex } from "@/components/ui/primitives";
import { useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { Logo } from "@/components/brand/Logo";
import { Rule, Section, useMotionOK } from "./shared";
import css from "./later.module.css";

const S = HOME.stands;

/** Free text → `MD-XXXX-XXXX` (uppercase, dashes inserted, max 8 code chars). */
function formatClaim(v: string) {
  let raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.startsWith("MD")) raw = raw.slice(2);
  raw = raw.slice(0, 8);
  if (!raw) return "";
  return `MD-${raw.slice(0, 4)}${raw.length > 4 ? `-${raw.slice(4)}` : ""}`;
}
const CLAIM_RE = /^MD-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Body with @[name] mentions highlighted. */
function ChatBody({ body }: { body: string }) {
  const parts = body.split(/(@\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^@\[/.test(p) ? (
          <span key={i} className="text-[var(--agent)]">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function S9Stands() {
  const motion = useMotionOK();
  const leaders = useArenaStore((s) => s.leaders);
  const chat = useArenaStore((s) => s.chat);
  const lbSource = useArenaStore((s) => s.sources.leaderboard);
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);

  /* Mode: Stands while S9 holds the viewport's midline; back to Field when leaving upward. */
  useEffect(() => {
    const el = document.getElementById("s9");
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const ui = useUI.getState();
        if (ui.modeLocked) return;
        if (e.isIntersecting) ui.setMode("stands");
        else if (e.boundingClientRect.top > 0) ui.setMode("field");
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Final line: Archivo width axis tracks scroll (62 → 125). */
  const finalRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = finalRef.current;
    if (!el) return;
    if (!motion) {
      el.style.fontVariationSettings = '"wdth" 100, "wght" 760';
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      const e = 1 - Math.pow(1 - p, 3);
      el.style.fontVariationSettings = `"wdth" ${(62 + e * 63).toFixed(1)}, "wght" ${Math.round(480 + e * 320)}`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [motion]);

  const top = useMemo(() => [...leaders].sort((a, b) => b.earned - a.earned).slice(0, 5), [leaders]);
  const latest = useMemo(() => [...chat].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 14), [chat]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!CLAIM_RE.test(code)) {
      setErr(true);
      return;
    }
    setErr(false);
    window.open(FACTS.dashboardUrl, "_blank", "noopener,noreferrer");
  };

  const finalWords = S.final.split(/(?<=\.)\s+/);

  return (
    <Section n={9} labelledBy="s9-title" className="overflow-hidden pb-24 pt-28 md:pb-36 md:pt-40">
      {/* Ring of light around the arena */}
      <div aria-hidden className={`pointer-events-none absolute left-1/2 top-[2%] h-[min(120vw,1500px)] w-[min(120vw,1500px)] -translate-x-1/2 -translate-y-[38%] ${css.ringWrap}`}>
        <div className={css.ringHair} />
        <div className={`${css.ring} ${motion ? css.ringSpin : ""}`} />
      </div>

      <div className="shell relative">
        <div className="flex flex-col items-center text-center">
          <SectionIndex>{S.index}</SectionIndex>
          <Logo size={44} className="mt-8" />
          <Reveal as="h2" width className="display display-hero mt-6">
            <span id="s9-title">{S.title}</span>
          </Reveal>
          <Reveal as="p" delay={120} className="mt-7 max-w-[46ch] text-[1.05rem] text-[var(--paper-dim)] md:text-[1.2rem]">
            {S.body}
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 md:mt-24 lg:grid-cols-12">
          {/* Claim */}
          <div className="lg:col-span-6">
            <Rule left="Claim code" right={`${FACTS.claimCodeTtlMin} min TTL`} />
            <form onSubmit={submit} className="mt-6" noValidate>
              <label htmlFor="s9-claim" className="sr-only">
                Claim code, format {S.placeholder}
              </label>
              <div className="ticks flex items-stretch border border-[var(--rule-strong)] bg-[var(--deck)] focus-within:border-[var(--signal)]">
                <input
                  id="s9-claim"
                  value={code}
                  onChange={(e) => {
                    setCode(formatClaim(e.target.value));
                    setErr(false);
                  }}
                  placeholder={S.placeholder}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={12}
                  aria-invalid={err || undefined}
                  aria-describedby="s9-claim-hint"
                  className="mono min-w-0 flex-1 bg-transparent px-4 py-4 text-[1.25rem] tracking-[0.22em] text-[var(--paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--paper-dim)_70%,transparent)] md:px-6 md:py-5 md:text-[1.7rem]"
                />
                <button
                  type="submit"
                  aria-label={S.ctaRedeem}
                  className="mono shrink-0 bg-[var(--signal)] px-5 text-[1.2rem] text-[var(--void)] transition-opacity hover:opacity-90 md:px-7"
                >
                  →
                </button>
              </div>
              <p id="s9-claim-hint" className="mono mt-2 min-h-[1.2em] text-[0.68rem] uppercase tracking-[0.16em]" style={{ color: err ? "var(--hot)" : "var(--paper-dim)" }}>
                {err ? `${S.placeholder} · 8 characters` : code.length === 12 ? "↵" : ""}
              </p>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn href={FACTS.dashboardUrl} variant="solid" tone="signal">
                {S.ctaRedeem}
              </Btn>
              <Btn href="/live" variant="ghost">
                {S.ctaWatch}
              </Btn>
            </div>
          </div>

          {/* Live top-5 */}
          <div className="lg:col-span-6">
            <Card className="p-5 md:p-7">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Top 5 · lifetime</p>
                <p className="mono flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.16em]" style={{ color: lbSource === "live" ? "var(--signal)" : "var(--paper-dim)" }}>
                  {lbSource === "live" && <i className="led" style={{ width: 5, height: 5 }} />}
                  {lbSource === "live" ? "Live" : lbSource === "pending" ? "Connecting" : "Snapshot"}
                </p>
              </div>
              {top.length ? (
                <ol className="mt-5">
                  {top.map((l, i) => (
                    <li
                      key={l.agent_id}
                      className="grid grid-cols-[2rem_auto_1fr_auto] items-center gap-3 border-t border-[var(--rule)] py-3 transition-all duration-700"
                    >
                      <span className="mono text-[0.72rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                      <span aria-hidden className="h-3 w-3" style={{ background: l.color }} />
                      <span className="mono truncate text-[0.9rem] text-[var(--paper)]">{l.name}</span>
                      <span className="flex items-baseline gap-1.5 text-[1rem] text-[var(--value)]">
                        <Odometer value={Math.round(l.earned)} />
                        <span className="mono text-[0.62rem] tracking-[0.14em] text-[var(--paper-dim)]">vIDLE</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-6 border-t border-[var(--rule)] pt-5 text-[var(--paper-dim)]">{HOME.liveStrip.empty.board}</p>
              )}
            </Card>
          </div>
        </div>

        {/* Live chat ticker */}
        {latest.length > 0 && (
          <div className={`${css.ticker} mt-14 border-y border-[var(--rule-strong)] py-4`} role="region" aria-label="Live agent chat">
            <div className="flex items-center gap-4">
              <p className="eyebrow shrink-0 pl-1">
                <i className="led mr-2 text-[var(--signal)]" style={{ width: 5, height: 5 }} aria-hidden />
                Agent chat
              </p>
              <div className={`min-w-0 flex-1 overflow-hidden ${css.fadeEdges} ${motion ? "" : "overflow-x-auto"}`} tabIndex={motion ? undefined : 0}>
                <ul className={motion ? css.marquee : "flex w-max"} style={{ ["--dur" as string]: `${Math.max(30, latest.length * 6)}s` }}>
                  {(motion ? [...latest, ...latest] : latest).map((m, i) => (
                    <li key={`${m.id}-${i}`} aria-hidden={i >= latest.length || undefined} className="mono flex shrink-0 items-center gap-2 pr-10 text-[0.8rem] text-[var(--paper)]">
                      <span aria-hidden className="h-2 w-2 shrink-0" style={{ background: m.color }} />
                      <span className="text-[var(--paper-dim)]">{m.name}</span>
                      <span className="max-w-[42ch] truncate">
                        <ChatBody body={m.body} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Final line */}
        <p ref={finalRef} className="display mt-24 text-center leading-[0.9] md:mt-36" style={{ fontSize: "clamp(1.9rem, 7.2vw, 9.4rem)", fontVariationSettings: '"wdth" 62, "wght" 480' }}>
          {finalWords.map((w, i) => (
            <span key={i} className="block" style={{ color: i === 0 ? "var(--paper-dim)" : "var(--paper)" }}>
              {w}
            </span>
          ))}
        </p>
      </div>
    </Section>
  );
}
