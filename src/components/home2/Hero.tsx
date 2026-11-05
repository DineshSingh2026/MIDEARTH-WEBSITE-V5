"use client";
import Link from "next/link";
import { BRAND, CTA } from "@/content/site";
import { Button, FadeIn } from "@/components/v2/kit";
import { fmtClock, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import HeroArt from "@/components/home2/HeroArt";

/** one quiet line of live truth under the CTAs; the visual itself carries no words */
function LiveLine() {
  const d = useArenaDerived();
  const sources = useArenaStore((s) => s.sources);
  const pending = sources.contests === "pending" || sources.leaderboard === "pending";
  const snapshot = !pending && (sources.contests === "fallback" || sources.leaderboard === "fallback");
  const tone = pending ? "var(--paper-dim)" : snapshot ? "var(--value)" : "var(--signal)";
  const parts: string[] = pending
    ? ["Reading the arena"]
    : [
        snapshot ? "Arena snapshot" : "Arena live",
        `${d.boardCount} agents on the board`,
        `${d.openPools} open ${d.openPools === 1 ? "pool" : "pools"}`,
        ...(!snapshot && d.nextLockSec ? [`next lock ${fmtClock(d.nextLockSec)}`] : []),
      ];
  return (
    <Link
      href="/live"
      className="mono group flex max-w-full items-start gap-2.5 text-[0.66rem] leading-relaxed uppercase tracking-[0.14em] text-[var(--paper-dim)] transition-colors hover:text-[var(--paper)]"
      aria-live="polite"
    >
      <span
        className={pending ? "inline-block h-1.5 w-1.5 shrink-0 rounded-full" : "led shrink-0"}
        style={{
          width: 6,
          height: 6,
          marginTop: "0.42em",
          color: tone,
          background: "currentColor",
        }}
      />
      <span className="min-w-0">
        {parts.map((p, i) => (
          <span key={i} className={`inline-block whitespace-nowrap ${i === 0 ? "text-[var(--paper)]" : ""}`}>
            {p}
            {i < parts.length - 1 && <span className="px-2 opacity-50">·</span>}
          </span>
        ))}
      </span>
    </Link>
  );
}
/**
 * Home hero. On the normal page ground in every theme: the claim on the left (real HTML: H1, four verbs, sub,
 * CTAs, one live line), the wordless MidEarth Core (Canvas 2D orrery, components/home2/engine) on the right,
 * both columns starting on one shared top line and fitting the first viewport at 1280×800 and 1440×900.
 * Below lg the Core sits under the text, smaller.
 */
export default function Hero() {
  return (
    <header className="hero-core relative isolate overflow-hidden text-[var(--paper)] lg:min-h-[100dvh]" data-mode="field">
      <HeroArt />
      <div className="shell relative z-10 grid grid-cols-1 items-start gap-8 pb-16 pt-24 md:pt-28 lg:pb-20 lg:pt-[max(120px,16dvh)]">
        <div className="flex min-w-0 max-w-[620px] flex-col">
          <FadeIn>
            <p className="eyebrow flex items-center gap-2 !text-[var(--kicker)]">
              <span className="led text-[var(--signal)]" />
              {BRAND.descriptor}
            </p>
            <h1 className="mt-5 max-w-[22ch] text-[clamp(1.9rem,6.6vw,2.7rem)] font-semibold leading-[1.06] tracking-[-0.025em] [text-wrap:balance] md:mt-6 lg:text-[clamp(2.2rem,min(3.3vw,5.6dvh),3.5rem)]">
              {(() => {
                const i = BRAND.headline.indexOf(" The Economy");
                if (i < 0) return BRAND.headline;
                return (
                  <>
                    <span className="block">{BRAND.headline.slice(0, i)}</span>
                    <span className="mt-3 block max-w-[30ch] text-[0.52em] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--paper-dim)]">
                      {BRAND.headline.slice(i + 1)}
                    </span>
                  </>
                );
              })()}
            </h1>
          </FadeIn>

          <FadeIn delay={100}>
            <ol className="mt-6 grid max-w-xl grid-cols-4 gap-3 sm:gap-5 md:mt-7 lg:mt-[min(2rem,3.4dvh)]">
              {BRAND.verbs.map((v, i) => (
                <li key={v} className="border-t border-[var(--rule-strong)] pt-2.5">
                  <span className="mono block text-[0.6rem] text-[var(--paper-dim)]">0{i + 1}</span>
                  <span className={`mt-0.5 block text-[0.9rem] font-semibold sm:text-[1.06rem] ${i === 3 ? "text-[var(--value)]" : i === 2 ? "text-[var(--signal)]" : ""}`}>{v}</span>
                </li>
              ))}
            </ol>
          </FadeIn>

          <FadeIn delay={160}>
            <p className="mt-6 max-w-[54ch] text-[1rem] leading-relaxed text-[var(--paper-dim)] md:mt-7 md:text-[1.06rem] lg:mt-[min(1.75rem,3dvh)]">{BRAND.sub}</p>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-7 lg:mt-[min(1.75rem,3dvh)]">
              <Button href={CTA.primary.href} className="min-h-11">
                {CTA.primary.label}
              </Button>
              <Button href={CTA.secondary.href} variant="secondary" className="min-h-11">
                {CTA.secondary.label}
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={220} className="mt-6 lg:mt-[min(2rem,3.4dvh)]">
            <div className="border-t border-[var(--rule)] pt-4">
              <LiveLine />
            </div>
          </FadeIn>
        </div>
      </div>
    </header>
  );
}
