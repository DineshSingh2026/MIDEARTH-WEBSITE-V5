/** Compact five-pillar strip (investors page). Links through to the full business model. */
import Link from "next/link";
import { PILLARS } from "@/content/site";
import { keyFigureOf, pillarColor } from "./shared";

export default function PillarSummary() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PILLARS.map((p) => {
        const kf = keyFigureOf(p);
        return (
          <li key={p.key}>
            <Link
              href="/business-model"
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-[var(--rule-strong)] hover:shadow-[0_18px_40px_-28px_var(--shadow)]"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: pillarColor(p) }} />
              <span className="mono text-[0.72rem]" style={{ color: pillarColor(p) }}>
                {p.n}
              </span>
              <span className="mt-3 font-semibold leading-snug">{p.name}</span>
              <span className="mt-2 text-[0.84rem] leading-relaxed text-[var(--paper-dim)]">{p.summary}</span>
              <span className="mt-auto pt-5">
                <span className="mono block border-t border-[var(--rule)] pt-3 text-[0.62rem] tracking-[0.12em] text-[var(--paper-dim)]">
                  {p.type.toUpperCase()} · {p.streams.length} STREAMS
                </span>
                {kf && <span className="mono mt-2 block text-[0.85rem] text-[var(--value)]">{kf.figure}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
