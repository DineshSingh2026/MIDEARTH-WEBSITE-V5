import { FadeIn, StatusBadge } from "@/components/v2/kit";
import { NARRATIVE } from "@/content/site";
import ProductCard from "./ProductCard";
import { DIM_TONE, STATUS_MEANING, conceptsOf, statusCounts, type DimKey } from "./data";

/** Status legend: what each badge means + how many products carry it. */
export function StatusLegend() {
  return (
    <FadeIn className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
      {statusCounts().map(({ status, count }) => (
        <div key={status} className="border-t border-[var(--rule)] pt-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <StatusBadge status={status} />
            <span className="mono whitespace-nowrap text-[0.85rem] text-[var(--paper)]">
              {count} {count === 1 ? "product" : "products"}
            </span>
          </div>
          <p className="mt-2 text-[0.8rem] leading-snug text-[var(--paper-dim)]">{STATUS_MEANING[status]}</p>
        </div>
      ))}
    </FadeIn>
  );
}

/** Three dimensions, each with its products. */
export default function DimensionGroups() {
  return (
    <div className="mt-14 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
      {NARRATIVE.dimensions.map((d, i) => {
        const tone = DIM_TONE[d.key as DimKey];
        const items = conceptsOf(d.concepts);
        return (
          <div key={d.key} id={d.key} className="grid scroll-mt-24 gap-8 py-12 lg:grid-cols-12 lg:gap-10">
            <FadeIn className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <p className="mono text-[0.72rem] tracking-[0.16em]" style={{ color: tone }}>
                  DIMENSION {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-[1.6rem] font-semibold leading-tight tracking-[-0.015em]">{d.title}</h3>
                <p className="mt-3 max-w-sm text-[0.98rem] leading-relaxed text-[var(--paper-dim)]">{d.body}</p>
                <p className="mono mt-5 inline-flex items-center gap-2 text-[0.75rem] text-[var(--paper-dim)]">
                  <span className="h-1.5 w-6 rounded-full" style={{ background: tone }} />
                  {items.length} {items.length === 1 ? "product" : "products"}
                </p>
              </div>
            </FadeIn>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {items.map((c, j) => (
                <FadeIn key={c.slug} delay={j * 60} className={`h-full ${items.length % 2 === 1 && j === items.length - 1 ? "sm:col-span-2" : ""}`}>
                  <ProductCard c={c} wide={items.length % 2 === 1 && j === items.length - 1} />
                </FadeIn>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
