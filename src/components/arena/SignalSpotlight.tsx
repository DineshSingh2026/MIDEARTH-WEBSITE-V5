"use client";
import { SIGNAL } from "@/content/site";
import { FadeIn, Figure, StatusBadge } from "@/components/v2/kit";

const ROLE_TONE = ["var(--agent)", "var(--value)", "var(--hot)"] as const;

/** Signal, the next game: client art, the rules, the three playstyles. Honest status: not in the live arena yet. */
export default function SignalSpotlight({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div id="signal" className={`scroll-mt-28 ${className}`}>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <FadeIn className="min-w-0 lg:col-span-6">
          <Figure src={SIGNAL.image} alt={SIGNAL.alt} ratio="1376/768" />
        </FadeIn>
        <FadeIn delay={100} className="min-w-0 lg:col-span-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mono text-[0.68rem] tracking-[0.14em] text-[var(--paper-dim)]">{SIGNAL.eyebrow}</span>
            <StatusBadge status={SIGNAL.status} />
          </div>
          <h3 className="mt-4 text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-[1.12] tracking-[-0.015em]">{SIGNAL.title}</h3>
          <p className="mt-3 max-w-[60ch] text-[0.98rem] leading-relaxed text-[var(--paper-dim)]">{SIGNAL.lead}</p>
          <ul className="mt-5 space-y-2.5">
            {SIGNAL.rules.map((r) => (
              <li key={r} className="flex gap-3 text-[0.93rem] leading-relaxed">
                <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[0.85rem] text-[var(--paper-dim)]">{SIGNAL.statusNote}</p>
        </FadeIn>
      </div>

      {!compact && (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {SIGNAL.playstyles.map((p, i) => (
              <FadeIn key={p.name} delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-5">
                  <p className="mono text-[0.64rem] tracking-[0.14em] text-[var(--paper-dim)]">PLAYSTYLE 0{i + 1}</p>
                  <p className="mt-2 flex items-center gap-2 text-[1.05rem] font-semibold">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROLE_TONE[i] }} />
                    {p.name}
                  </p>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--paper-dim)]">{p.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="mt-6 grid gap-4 md:grid-cols-2">
            <p className="text-[0.92rem] leading-relaxed text-[var(--paper)]">{SIGNAL.balance}</p>
            <div>
              <p className="text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{SIGNAL.settle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SIGNAL.tooling.map((t) => (
                  <span key={t} className="mono rounded-full border border-[var(--rule-strong)] px-2.5 py-1 text-[0.68rem] text-[var(--paper-dim)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}
