import { PARTNERS } from "@/content/copy/partners";

/** 5×5 glyph: each offer lights a different share of cells (1/5 … 5/5) on hover — the grid motif, quantised. */
function Glyph({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 25 25" width="30" height="30" aria-hidden className="shrink-0">
      {Array.from({ length: 25 }, (_, i) => {
        const x = i % 5;
        const y = Math.floor(i / 5);
        const lit = y >= 5 - n;
        return (
          <rect
            key={i}
            x={x * 5 + 0.6}
            y={y * 5 + 0.6}
            width="3.8"
            height="3.8"
            className={lit ? "fill-[var(--rule-strong)] transition-[fill] duration-300 group-hover:fill-[var(--signal)]" : "fill-[var(--rule)]"}
            style={lit ? { transitionDelay: `${(4 - y) * 50 + x * 20}ms`, transitionTimingFunction: "steps(2)" } : undefined}
          />
        );
      })}
    </svg>
  );
}

export function Offers() {
  const total = PARTNERS.offers.length;
  return (
    <ul className="grid grid-cols-1 border-l border-t border-[var(--rule)] md:grid-cols-6">
      {PARTNERS.offers.map((o, i) => (
        <li
          key={o.title}
          className={`group relative flex min-h-[15rem] flex-col justify-between overflow-hidden border-b border-r border-[var(--rule)] p-6 transition-colors duration-500 hover:bg-[var(--deck)] md:p-8 ${
            i < 2 ? "md:col-span-3 md:min-h-[19rem]" : "md:col-span-2"
          }`}
          tabIndex={0}
        >
          <div className="flex items-start justify-between gap-6">
            <span className="mono text-[0.72rem] tracking-[0.16em] text-[var(--paper-dim)]">
              {String(i + 1).padStart(2, "0")} <span className="opacity-50">/ {String(total).padStart(2, "0")}</span>
            </span>
            <Glyph n={i + 1} />
          </div>
          <div className="mt-10">
            <h3
              className="display text-[clamp(1.6rem,2.6vw,2.6rem)] transition-[font-variation-settings] duration-700 ease-[var(--ease-expo)] group-hover:[font-variation-settings:'wdth'_118,'wght'_760] group-focus-visible:[font-variation-settings:'wdth'_118,'wght'_760]"
              style={{ fontVariationSettings: '"wdth" 82, "wght" 680' }}
            >
              {o.title}
            </h3>
            <p className="mt-4 max-w-[34ch] text-[var(--paper-dim)]">{o.body}</p>
          </div>
          <span
            aria-hidden
            className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[var(--signal)] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
          />
        </li>
      ))}
      <li className="relative hidden flex-col justify-end border-b border-r border-[var(--rule)] p-8 md:col-span-6 md:flex md:min-h-0 md:flex-row md:items-center md:justify-between">
        <span className="eyebrow">Something else in mind?</span>
        <a href="#contact" className="mono text-[0.78rem] uppercase tracking-[0.14em] text-[var(--signal)] underline-offset-4 hover:underline">
          Start a conversation →
        </a>
      </li>
    </ul>
  );
}
