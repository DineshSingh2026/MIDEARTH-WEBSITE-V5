"use client";
/**
 * PillarExplorer — the five pillars are the PRIMARY structure; the streams inside each are supporting detail.
 * Desktop: vertical tablist (WAI-ARIA tabs, arrow keys / Home / End). Mobile: accordion.
 */
import { useRef, type KeyboardEvent } from "react";
import { PILLARS, type Pillar, type Stream } from "@/content/site";
import { keyFigureOf, pad2, pillarColor, streamsOf } from "./shared";

type Props = { active: string; onChange: (k: string) => void };

export default function PillarExplorer({ active, onChange }: Props) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, PILLARS.findIndex((p) => p.key === active));
  const cur = PILLARS[idx];

  const onKey = (e: KeyboardEvent) => {
    const last = PILLARS.length - 1;
    let n = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") n = idx === last ? 0 : idx + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = idx === 0 ? last : idx - 1;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = last;
    if (n < 0) return;
    e.preventDefault();
    onChange(PILLARS[n].key);
    tabs.current[n]?.focus();
  };

  return (
    <>
      {/* ── Desktop: tabs ── */}
      <div className="hidden gap-8 lg:grid lg:grid-cols-12">
        <div role="tablist" aria-orientation="vertical" aria-label="Revenue pillars" className="flex flex-col gap-2 lg:col-span-4" onKeyDown={onKey}>
          {PILLARS.map((p, i) => {
            const on = p.key === cur.key;
            return (
              <button
                key={p.key}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`pt-${p.key}`}
                role="tab"
                aria-selected={on}
                aria-controls={`pp-${p.key}`}
                tabIndex={on ? 0 : -1}
                onClick={() => onChange(p.key)}
                className={`group relative flex items-start gap-4 rounded-r-xl py-4 pl-6 pr-4 text-left transition-colors ${
                  on ? "bg-[color-mix(in_oklab,var(--paper)_4%,transparent)]" : "hover:bg-[color-mix(in_oklab,var(--paper)_2.5%,transparent)]"
                }`}
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] transition-opacity" style={{ background: on ? pillarColor(p) : "var(--rule-strong)", opacity: on ? 1 : 0.9 }} />
                <span className="mono pt-0.5 text-[0.78rem]" style={{ color: pillarColor(p) }}>
                  {p.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{p.name}</span>
                  <span className="mono mt-1.5 block text-[0.66rem] tracking-[0.1em] text-[var(--paper-dim)]">
                    {p.type.toUpperCase()} · {p.streams.length} STREAMS
                  </span>
                </span>
                <span aria-hidden className={`mt-1 text-[var(--paper-dim)] transition-transform ${on ? "translate-x-0.5 text-[var(--paper)]" : ""}`}>
                  →
                </span>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-8">
          {PILLARS.map((p) => (
            <div key={p.key} id={`pp-${p.key}`} role="tabpanel" aria-labelledby={`pt-${p.key}`} hidden={p.key !== cur.key} tabIndex={0} className="outline-none">
              <PillarPanel p={p} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: accordion ── */}
      <div className="divide-y divide-[var(--rule)] border-y border-[var(--rule)] lg:hidden">
        {PILLARS.map((p) => {
          const on = p.key === active;
          return (
            <div key={p.key}>
              <h3>
                <button
                  type="button"
                  id={`pa-${p.key}`}
                  aria-expanded={on}
                  aria-controls={`pm-${p.key}`}
                  onClick={() => onChange(on ? "" : p.key)}
                  className="relative flex w-full scroll-mt-20 items-start gap-3 py-5 pl-4 pr-1 text-left"
                >
                  <span aria-hidden className="absolute inset-y-4 left-0 w-[2px]" style={{ background: pillarColor(p), opacity: on ? 1 : 0.35 }} />
                  <span className="mono pt-0.5 text-[0.74rem]" style={{ color: pillarColor(p) }}>
                    {p.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">{p.name}</span>
                    <span className="mono mt-1.5 block text-[0.64rem] tracking-[0.08em] text-[var(--paper-dim)]">
                      {p.type.toUpperCase()} · {p.streams.length} STREAMS
                    </span>
                  </span>
                  <span aria-hidden className={`mono mt-0.5 text-lg leading-none text-[var(--paper-dim)] transition-transform ${on ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
              </h3>
              <div id={`pm-${p.key}`} role="region" aria-labelledby={`pa-${p.key}`} hidden={!on} className="pb-6 pl-4">
                <PillarPanel p={p} compact />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PillarPanel({ p, compact = false }: { p: Pillar; compact?: boolean }) {
  const kf = keyFigureOf(p);
  const streams = streamsOf(p);
  const c = pillarColor(p);
  return (
    <div
      className={compact ? "" : "relative overflow-hidden rounded-2xl border border-[var(--rule)] p-7 md:p-9"}
      style={compact ? undefined : { background: `linear-gradient(135deg, color-mix(in oklab, ${c} 8%, var(--deck)) 0%, var(--deck) 55%)` }}
    >
      {/* pillar header */}
      <div>
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            {!compact && (
              <>
                <p className="mono text-[0.7rem] tracking-[0.16em]" style={{ color: c }}>
                  PILLAR {p.n} · {p.type.toUpperCase()}
                </p>
                <h3 className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-[-0.015em]">{p.name}</h3>
              </>
            )}
            <p className={`${compact ? "" : "mt-3"} max-w-[56ch] leading-relaxed text-[var(--paper-dim)]`}>{p.summary}</p>
          </div>
          {kf && (
            <div className="md:text-right">
              <p className="mono text-[0.64rem] tracking-[0.14em] text-[var(--paper-dim)]">KEY FIGURE</p>
              <p className={`num mt-1.5 leading-tight text-[var(--value)] ${compact ? "text-[1.2rem]" : "text-[1.5rem]"}`}>{kf.figure}</p>
              <p className="mt-1 text-[0.78rem] text-[var(--paper-dim)]">{shortName(kf.stream)}</p>
            </div>
          )}
        </div>
      </div>

      {/* supporting streams */}
      <p className={`mono mb-4 text-[0.66rem] tracking-[0.16em] text-[var(--paper-dim)] ${compact ? "mt-6" : "mt-10"}`}>
        SUPPORTING REVENUE STREAMS · {streams.length}
      </p>
      <ul className={`grid gap-x-8 gap-y-8 ${compact ? "" : streams.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {streams.map((s) => (
          <li key={s.n} className="flex flex-col border-t border-[var(--rule-strong)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="mono text-[0.7rem] text-[var(--paper-dim)]">STREAM {pad2(s.n)}</span>
              {s.regulated && (
                <a href="#reg-note" className="mono -my-3 inline-flex min-h-11 min-w-11 items-center justify-end text-[0.66rem] md:text-[0.6rem] tracking-[0.1em] text-[var(--hot)] hover:underline">
                  <span className="rounded-full border border-[color-mix(in_oklab,var(--hot)_40%,transparent)] px-2 py-0.5">REGULATED*</span>
                </a>
              )}
            </div>
            <h4 className="mt-3 font-semibold leading-snug">{s.name}</h4>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--paper-dim)]">{s.body}</p>
            <div className="mt-auto pt-5">
              <div className="border-t border-[var(--rule)] pt-4">
                <p className="mono text-[0.66rem] md:text-[0.6rem] tracking-[0.14em] text-[var(--paper-dim)]">COMMERCIAL MODEL</p>
                <p className="mt-1 text-[0.86rem] leading-snug">{s.model}</p>
                {s.figure && <p className="mono mt-3 inline-block rounded-md bg-[color-mix(in_oklab,var(--value)_12%,transparent)] px-2 py-1 text-[0.82rem] text-[var(--value)]">{s.figure}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const shortName = (s: Stream) => s.name.split(": ").pop() ?? s.name;
