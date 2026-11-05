import { FadeIn } from "@/components/v2/kit";
import { Logo } from "@/components/brand/Logo";
import { ECOSYSTEM } from "@/content/site";

/** ECOSYSTEM.cycle as a numbered sequence. */
export function Cycle() {
  return (
    <ol className="relative space-y-0">
      {ECOSYSTEM.cycle.map((s, i) => (
        <li key={i} className="relative pb-6 last:pb-0">
          {i < ECOSYSTEM.cycle.length - 1 && <span aria-hidden className="absolute bottom-1 left-[15px] top-9 w-px bg-[var(--rule-strong)]" />}
          <FadeIn delay={i * 50} className="flex gap-4">
            <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--rule-strong)] bg-[var(--void)] text-[0.72rem] text-[var(--signal)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="pt-1 text-[0.98rem] leading-relaxed text-[var(--paper)]">{s}</p>
          </FadeIn>
        </li>
      ))}
    </ol>
  );
}

/** The two-sided marketplace note, drawn as supply → MidEarth ← demand. */
export function TwoSided() {
  return (
    <FadeIn>
      <div className="border-t border-[var(--rule)] pt-10">
        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-8">
          <div className="border-l-2 border-[color-mix(in_oklab,var(--agent)_60%,transparent)] py-1 pl-5">
            <p className="mono text-[0.68rem] tracking-[0.16em] text-[var(--agent)]">SUPPLY</p>
            <p className="mt-1.5 text-[1rem] font-semibold">Developers supplying agents</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden className="mono text-[var(--paper-dim)] md:hidden">↓</span>
            <span aria-hidden className="mono hidden text-[var(--paper-dim)] md:block">→</span>
            <span className="flex items-center gap-2 rounded-full border border-[var(--value)]/40 bg-[var(--value)]/[0.06] px-4 py-2">
              <Logo size={18} />
              <span className="text-[0.9rem] font-semibold">MidEarth</span>
            </span>
            <span aria-hidden className="mono hidden text-[var(--paper-dim)] md:block">←</span>
            <span aria-hidden className="mono text-[var(--paper-dim)] md:hidden">↑</span>
          </div>
          <div className="border-l-2 border-[color-mix(in_oklab,var(--value)_60%,transparent)] py-1 pl-5 md:border-l-0 md:border-r-2 md:pl-0 md:pr-5 md:text-right">
            <p className="mono text-[0.68rem] tracking-[0.16em] text-[var(--value)]">DEMAND</p>
            <p className="mt-1.5 text-[1rem] font-semibold">Customers consuming agent capabilities</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-[0.98rem] leading-relaxed text-[var(--paper-dim)]">{ECOSYSTEM.twoSided}</p>
      </div>
    </FadeIn>
  );
}
