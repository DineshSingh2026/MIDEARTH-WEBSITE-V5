/** Commercialisation sequence — ordered timeline; each step links to its product page with its REAL status badge. */
import Link from "next/link";
import { CONCEPTS, INVESTORS } from "@/content/site";
import { StatusBadge } from "@/components/v2/kit";
import { Scrub } from "@/components/v2/motion";

const status = (slug: string) => CONCEPTS.find((c) => c.slug === slug)!;

export default function Roadmap() {
  const last = INVESTORS.roadmap.length - 1;
  return (
    <Scrub className="rm-scrub" start="top 85%" end="bottom 55%">
    <ol className="relative grid gap-x-8 gap-y-6 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4">
      {INVESTORS.roadmap.map((r, i) => {
        const c = status(r.slug);
        return (
          <li key={r.slug} className="rm-step relative pl-9 md:pl-0" style={{ "--si": i / last } as React.CSSProperties}>
            {/* lights up in order as the roadmap scrolls through */}
            <span aria-hidden className="rm-bar absolute inset-x-0 top-0 z-[1] hidden h-[2px] rounded-full bg-[var(--signal)] shadow-[0_0_12px_color-mix(in_oklab,var(--signal)_60%,transparent)] md:block" />
            {/* mobile rail */}
            <span aria-hidden className={`absolute left-[11px] top-0 w-px bg-[var(--rule-strong)] md:hidden ${i === INVESTORS.roadmap.length - 1 ? "h-6" : "-bottom-3"}`} />
            <span aria-hidden className="mono absolute left-0 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--rule-strong)] bg-[var(--void)] text-[0.62rem] text-[var(--paper-dim)] md:hidden">
              {r.n}
            </span>
            <Link
              href={`/platform/${r.slug}`}
              className="group flex h-full flex-col pt-4 transition-colors md:border-t md:border-[var(--rule-strong)] md:pt-5 md:hover:border-[var(--paper-dim)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rm-num mono text-[0.72rem] text-[var(--paper-dim)]">
                  STEP {String(r.n).padStart(2, "0")}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-4 text-[1.08rem] font-semibold leading-snug decoration-[var(--paper-dim)] underline-offset-4 group-hover:underline">{r.product}</p>
              <p className="mt-1 text-[0.88rem] leading-relaxed text-[var(--paper-dim)]">{r.objective}</p>
              <span className="mt-auto pt-4 text-[0.8rem] text-[var(--signal)] opacity-80 transition-opacity group-hover:opacity-100">
                View product <span aria-hidden>→</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
    </Scrub>
  );
}
