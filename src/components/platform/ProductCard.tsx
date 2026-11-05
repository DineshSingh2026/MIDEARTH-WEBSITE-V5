import { Card, Figure, StatusBadge, type CardSurface } from "@/components/v2/kit";
import type { Concept } from "@/content/site";
import { DIM_TONE } from "./data";

/**
 * Standard product tile used on /platform and in "Connects to".
 * Image-led card: art bleeds to the card edge on top, text below. `wide` lays it out side by
 * side for a full-row tile; `compact` drops the art (used in "Connects to").
 */
export default function ProductCard({ c, compact = false, wide = false, label, surface = "deck" }: { c: Concept; compact?: boolean; wide?: boolean; label?: string; surface?: CardSurface }) {
  const tone = DIM_TONE[c.dimension];
  return (
    <Card href={`/platform/${c.slug}`} surface={surface} className={`flex h-full !p-0 ${wide ? "flex-col sm:flex-row" : "flex-col"}`}>
      {!compact && (
        <div className={`relative overflow-hidden border-[var(--rule)] ${wide ? "border-b sm:w-1/2 sm:shrink-0 sm:border-b-0 sm:border-r" : "border-b"}`}>
          <Figure src={c.image} alt="" ratio="16/10" bare className="h-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="absolute right-3 top-3" data-mode="field">
            <StatusBadge status={c.status} className="bg-[var(--void)]/80 backdrop-blur" />
          </span>
        </div>
      )}
      <div className={`flex flex-1 flex-col ${compact ? "p-5" : wide ? "p-6 sm:justify-center md:p-8" : "p-6"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="mono text-[0.72rem] tracking-[0.12em]" style={{ color: tone }}>
            {label ?? c.n}
          </span>
          {compact && <StatusBadge status={c.status} />}
        </div>
        <h3 className={`mt-3 font-semibold leading-snug tracking-[-0.01em] ${compact ? "text-[1.05rem]" : "text-[1.25rem]"}`}>{c.name}</h3>
        <p className="mt-1.5 text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{c.short}</p>
        {!compact && c.statusNote && <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--paper-dim)]/80">{c.statusNote}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[0.85rem] font-semibold text-[var(--paper)] transition-colors group-hover:text-[var(--signal)]">
          Explore <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Card>
  );
}
