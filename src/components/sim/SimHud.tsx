"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";

/** HUD labels (mono). Pure UI chrome derived from BRIEF §7 HUD spec. */
export const SIM_LABELS = {
  match: "MATCH",
  tick: "TICK",
  tiles: "TILES CLAIMED",
  tokens: "TOKENS TAKEN",
  field: "ON FIELD",
  accelerated: "ACCELERATED ×3",
  frozen: "FROZEN",
  final: "FINAL",
  agent: "AGENT",
  rank: "TOP 5",
  sim: "SIMULATION · NOT A LIVE MATCH",
} as const;

export type HudRow = { color: string; label: string; value: number };
export type HudHandle = { set(line: string, rows: HudRow[], badge?: string | null): void };

/**
 * DOM HUD written imperatively (no React re-render per tick).
 * The visual text is mirrored nowhere else, so it is aria-hidden; components provide an sr-only description.
 */
export const SimHud = forwardRef<HudHandle, { accelerated?: boolean }>(function SimHud({ accelerated }, ref) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const rowsRef = useRef<HTMLOListElement>(null);
  const last = useRef("");

  useImperativeHandle(ref, () => ({
    set(line, rows, badge) {
      if (lineRef.current && lineRef.current.textContent !== line) lineRef.current.textContent = line;
      const b = badge ?? (accelerated ? SIM_LABELS.accelerated : "");
      if (badgeRef.current) {
        if (badgeRef.current.textContent !== b) badgeRef.current.textContent = b;
        badgeRef.current.style.display = b ? "" : "none";
      }
      const key = rows.map((r) => `${r.color}${r.label}${r.value}`).join("|");
      if (key === last.current || !rowsRef.current) return;
      last.current = key;
      const lis = rowsRef.current.children;
      rows.slice(0, 5).forEach((r, i) => {
        const li = lis[i] as HTMLLIElement | undefined;
        if (!li) return;
        li.style.opacity = "1";
        (li.children[1] as HTMLElement).style.background = r.color;
        (li.children[1] as HTMLElement).style.boxShadow = `0 0 8px ${r.color}`;
        li.children[2].textContent = r.label;
        li.children[3].textContent = String(r.value);
      });
    },
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper)] md:text-[0.68rem]">
      <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2 md:left-5 md:right-5 md:top-4">
        <span ref={lineRef} className="bg-[color-mix(in_oklab,var(--void)_70%,transparent)] px-2 py-1 backdrop-blur-[2px]" />
        <span
          ref={badgeRef}
          className="border px-2 py-1"
          style={{ color: "var(--value)", borderColor: "color-mix(in oklab, var(--value) 45%, transparent)", display: accelerated ? "" : "none" }}
        >
          {accelerated ? SIM_LABELS.accelerated : ""}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 md:bottom-4 md:left-5">
        <p className="mb-1.5 text-[var(--paper-dim)]">{SIM_LABELS.rank}</p>
        <ol ref={rowsRef} className="grid gap-[3px] bg-[color-mix(in_oklab,var(--void)_70%,transparent)] px-2 py-1.5 backdrop-blur-[2px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="grid grid-cols-[1.4em_8px_7.5em_3.2em] items-center gap-2 opacity-0 transition-opacity duration-300">
              <span className="text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
              <i className="block h-[6px] w-[6px] rounded-full" />
              <span className="truncate" />
              <span className="text-right tabular-nums" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
});
