"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { LIVE } from "@/content/copy/live";
import { useArenaStore } from "@/lib/arena/client";
import { CREDIT, useMotionOK } from "@/components/idle/kit";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Standings with FLIP reordering: when the board re-sorts, rows glide to their new rank. */
export default function Standings() {
  const leaders = useArenaStore((s) => s.leaders);
  const src = useArenaStore((s) => s.sources.leaderboard);
  const motion = useMotionOK();
  const [all, setAll] = useState(false);
  const rows = all ? leaders.slice(0, 50) : leaders.slice(0, 10);
  const top = leaders[0]?.earned || 1;
  const prev = useRef(new Map<string, number>());
  const refs = useRef(new Map<string, HTMLLIElement>());

  useLayoutEffect(() => {
    const next = new Map<string, number>();
    refs.current.forEach((el, id) => {
      const y = el.getBoundingClientRect().top + window.scrollY;
      next.set(id, y);
      const was = prev.current.get(id);
      if (!motion) return;
      if (was === undefined) {
        if (prev.current.size) el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: "cubic-bezier(.16,1,.3,1)" });
      } else if (Math.abs(was - y) > 1) {
        el.animate([{ transform: `translateY(${was - y}px)`, background: "color-mix(in oklab, var(--value) 12%, transparent)" }, { transform: "none", background: "transparent" }], {
          duration: 900,
          easing: "cubic-bezier(.16,1,.3,1)",
        });
      }
    });
    prev.current = next;
  }, [rows, motion]);

  if (!leaders.length) {
    return (
      <div className="border border-dashed border-[var(--rule-strong)] p-8">
        <p className="display display-m">{src === "pending" ? "…" : LIVE.standings.empty}</p>
        <p className="mt-3 text-[var(--paper-dim)]">{LIVE.standings.emptyBody}</p>
      </div>
    );
  }

  const C = LIVE.standings.cols;
  return (
    <div>
      <div className="mono grid grid-cols-[2.2rem_minmax(0,1fr)_7.5rem_4.5rem] gap-3 border-b border-[var(--paper-dim)] pb-2 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] md:grid-cols-[2.6rem_minmax(0,1fr)_10rem_5.5rem]" aria-hidden>
        <span>{C.rank}</span>
        <span>{C.agent}</span>
        <span className="text-right">{C.earned}</span>
        <span className="text-right">{C.matches}</span>
      </div>
      <ol aria-label={LIVE.standings.title}>
        {rows.map((l, i) => (
          <li
            key={l.agent_id}
            ref={(el) => {
              if (el) refs.current.set(l.agent_id, el);
              else refs.current.delete(l.agent_id);
            }}
            className="relative grid grid-cols-[2.2rem_minmax(0,1fr)_7.5rem_4.5rem] items-center gap-3 border-b border-[var(--rule)] py-3 md:grid-cols-[2.6rem_minmax(0,1fr)_10rem_5.5rem]"
          >
            {/* share of leader's earnings, as a hairline under the row */}
            <span aria-hidden className="absolute bottom-[-1px] left-0 h-px bg-[var(--value)]" style={{ width: `${(l.earned / top) * 100}%`, opacity: 0.8 }} />
            <span className="mono text-[0.9rem]" style={{ color: i < 3 ? "var(--value)" : "var(--paper-dim)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="block h-3 w-3 shrink-0 rotate-45" style={{ background: l.color }} />
              <span className="mono truncate text-[0.92rem]">{l.name}</span>
            </span>
            <span className="mono text-right text-[0.92rem]">
              {fmt(l.earned)} <span className="text-[0.62rem] text-[var(--paper-dim)]">{CREDIT}</span>
            </span>
            <span className="mono text-right text-[0.86rem] text-[var(--paper-dim)]">{fmt(l.matches)}</span>
            <span className="sr-only">
              {C.earned} {fmt(l.earned)} {CREDIT}, {C.matches} {l.matches}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{LIVE.standings.note}</p>
        {leaders.length > 10 && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="mono border border-[var(--rule-strong)] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.14em] hover:border-[var(--paper-dim)]"
          >
            {all ? "Top 10" : `All ${Math.min(50, leaders.length)}`}
          </button>
        )}
      </div>
    </div>
  );
}
