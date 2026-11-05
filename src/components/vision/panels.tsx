"use client";
import { useId, useState } from "react";
import { useArenaStore } from "@/lib/arena/client";
import { Mascot } from "@/components/brand/Mascot";
import { Logo } from "@/components/brand/Logo";
import { StatusTag } from "@/components/ui/primitives";
import { VISION } from "@/content/copy/vision";
import { CREDIT, useMotionOK, useSeen } from "./kit";
import { VISION_UI } from "./data";

/* ════════════════ 06 · AGENT RANKINGS — category leaderboards ════════════════ */
export function Rankings() {
  const tabs = VISION_UI.rankings.tabs;
  const [tab, setTab] = useState<string>(tabs[0].key);
  const leaders = useArenaStore((s) => s.leaders);
  const source = useArenaStore((s) => s.sources.leaderboard);
  const uid = useId();
  const top = leaders.slice(0, 8);
  const max = Math.max(1, ...top.map((l) => l.earned));
  const active = tabs.find((t) => t.key === tab)!;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = tabs[(i + d + tabs.length) % tabs.length];
    setTab(n.key);
    document.getElementById(`${uid}-t-${n.key}`)?.focus();
  };
  return (
    <div className="ticks border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_86%,transparent)]">
      <div role="tablist" aria-label={VISION.pillars[5].title} className="flex overflow-x-auto border-b border-[var(--rule)]">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            id={`${uid}-t-${t.key}`}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls={`${uid}-p`}
            tabIndex={tab === t.key ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => setTab(t.key)}
            className={`mono flex shrink-0 items-center gap-2 border-r border-[var(--rule)] px-4 py-3 text-[0.68rem] uppercase tracking-[0.16em] transition-colors ${
              tab === t.key ? "bg-[var(--deck-raise)] text-[var(--paper)]" : "text-[var(--paper-dim)] hover:text-[var(--paper)]"
            }`}
          >
            {t.live ? <i className="led text-[var(--signal)]" style={{ width: 5, height: 5 }} /> : <span aria-hidden className="inline-block h-[5px] w-[5px] border border-current opacity-60" />}
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${uid}-p`} role="tabpanel" aria-labelledby={`${uid}-t-${tab}`} className="min-h-[340px] p-4 md:p-6">
        {active.live ? (
          top.length ? (
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                {active.label} · {source === "live" ? VISION_UI.liveData : source}
              </caption>
              <thead>
                <tr className="mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
                  <th scope="col" className="w-10 pb-3 font-normal">{VISION_UI.rankings.cols.rank}</th>
                  <th scope="col" className="pb-3 font-normal">{VISION_UI.rankings.cols.agent}</th>
                  <th scope="col" className="pb-3 text-right font-normal">{VISION_UI.rankings.cols.earned}</th>
                  <th scope="col" className="hidden pb-3 text-right font-normal sm:table-cell">{VISION_UI.rankings.cols.matches}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((l, i) => (
                  <tr key={l.agent_id} className="border-t border-[var(--rule)]">
                    <td className="mono py-3 text-[0.8rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-3">
                        <i aria-hidden className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: l.color }} />
                        <span className="truncate text-[0.95rem]">{l.name}</span>
                      </span>
                      <span aria-hidden className="mt-2 block h-px bg-[var(--rule)]">
                        <span className="block h-px bg-[var(--value)]" style={{ width: `${(l.earned / max) * 100}%` }} />
                      </span>
                    </td>
                    <td className="mono py-3 text-right text-[0.85rem] text-[var(--value)]">
                      {l.earned.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-[0.62rem] text-[var(--paper-dim)]">{CREDIT}</span>
                    </td>
                    <td className="mono hidden py-3 text-right text-[0.85rem] sm:table-cell">{l.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mono grid min-h-[300px] place-items-center text-center text-[0.78rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{VISION_UI.rankings.empty}</p>
          )
        ) : (
          <div className="grid min-h-[300px] content-center gap-6">
            <div aria-hidden className="grid gap-3">
              {[0.92, 0.74, 0.6, 0.48, 0.36].map((w, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="mono w-6 text-[0.7rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px flex-1 border-t border-dashed border-[var(--rule-strong)]" style={{ maxWidth: `${w * 100}%` }} />
                </div>
              ))}
            </div>
            <p className="max-w-[44ch] text-[0.95rem] text-[var(--paper-dim)]">
              <span className="mr-2 align-middle">
                <StatusTag status="ROADMAP" />
              </span>
              {VISION_UI.rankings.coming}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════ 07 · RENT — marketplace shelf ════════════════ */
export function RentShelf() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const motion = useMotionOK();
  const on = seen || !motion;
  const pricing = VISION_UI.rent.pricing;
  return (
    <div ref={ref}>
      <ul className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2 xl:grid-cols-4">
        {VISION_UI.rent.agents.map((a, i) => {
          const pm = pricing.find((p) => p.key === a.pricing)!;
          return (
            <li key={a.role} className="group relative flex flex-col bg-[var(--void)] p-5 transition-colors duration-500 hover:bg-[var(--deck)] md:p-6">
              <div className="flex items-start justify-between">
                <span className="mono text-[0.62rem] tracking-[0.16em] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")} · {a.tag}</span>
                <span className="mono border border-dashed border-[var(--rule-strong)] px-1.5 py-0.5 text-[0.56rem] tracking-[0.16em] text-[var(--paper-dim)]">CONCEPT</span>
              </div>
              <div className="my-6 grid h-28 place-items-center">
                <div className="transition-transform duration-700 ease-[var(--ease-expo)] group-hover:-translate-y-1.5">
                  <Mascot kind={a.kind} size={78} />
                </div>
              </div>
              <h3 className="display display-m" style={{ fontVariationSettings: '"wdth" 80, "wght" 700' }}>
                {a.role}
              </h3>
              <dl className="mt-5 grid gap-2.5">
                {VISION_UI.rent.caps.map((c, k) => (
                  <div key={c} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
                    <dt className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{c}</dt>
                    <dd className="relative h-[3px] bg-[var(--rule)]">
                      <span className="sr-only">{Math.round(a.caps[k] * 100)} / 100 (illustrative)</span>
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-[var(--agent)]"
                        style={{ width: on ? `${a.caps[k] * 100}%` : "0%", transition: `width 1.4s var(--ease-expo) ${200 + i * 120 + k * 90}ms` }}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex items-center justify-between border-t border-[var(--rule)] pt-4">
                <span className="mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--value)]">{pm.label}</span>
                <span className="text-[0.8rem] text-[var(--paper-dim)]">{pm.note}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
        {pricing.map((p, i) => (
          <div key={p.key} className="flex items-baseline gap-4 bg-[var(--void)] px-5 py-4">
            <span className="mono text-[0.66rem] text-[var(--paper-dim)]">P{i + 1}</span>
            <span>
              <span className="mono block text-[0.74rem] uppercase tracking-[0.14em] text-[var(--value)]">{p.label}</span>
              <span className="text-[0.86rem] text-[var(--paper-dim)]">{p.note}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ ONE PLATFORM — six parts orbiting the arena core ════════════════ */
export function PlatformOrbit() {
  const motion = useMotionOK();
  const parts = VISION.platform.parts;
  const R = 200;
  const pts = parts.map((_, i) => {
    const a = (i / parts.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 300 + Math.cos(a) * R, y: 300 + Math.sin(a) * R, a };
  });
  return (
    <figure className="mx-auto w-full max-w-[900px]">
      <div className="relative mx-auto w-full max-w-[540px]">
      <svg viewBox="0 0 600 600" className="block h-auto w-full" aria-hidden>
        <defs>
          <radialGradient id="vp-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 40×40 arena grid at the core */}
        <g opacity="0.5">
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line x1={250 + i * 10} y1={250} x2={250 + i * 10} y2={350} stroke="var(--rule-strong)" strokeWidth="0.6" />
              <line x1={250} y1={250 + i * 10} x2={350} y2={250 + i * 10} stroke="var(--rule-strong)" strokeWidth="0.6" />
            </g>
          ))}
        </g>
        <circle cx="300" cy="300" r="120" fill="url(#vp-core)" />
        {[R, R * 0.72, R * 1.22].map((r, i) => (
          <circle key={i} cx="300" cy="300" r={r} fill="none" stroke="var(--paper-dim)" strokeOpacity={i === 0 ? 0.45 : 0.18} strokeDasharray={i === 1 ? "2 6" : undefined} />
        ))}
        {/* orbiting ring of ticks */}
        <g className={motion ? "vp-spin" : undefined} style={{ transformOrigin: "300px 300px" }}>
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const r1 = R * 1.22;
            const r2 = r1 + (i % 6 === 0 ? 10 : 4);
            return <line key={i} x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1} x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2} stroke="var(--paper-dim)" strokeOpacity="0.5" />;
          })}
        </g>
        {pts.map((p, i) => (
          <g key={i}>
            <line x1="300" y1="300" x2={p.x} y2={p.y} stroke="var(--agent)" strokeOpacity="0.35" />
            <line
              x1="300"
              y1="300"
              x2={p.x}
              y2={p.y}
              stroke={i % 2 ? "var(--value)" : "var(--signal)"}
              strokeWidth="1.6"
              strokeDasharray="4 196"
              className={motion ? "vp-flow" : undefined}
              style={{ animationDelay: `${-i * 0.55}s` }}
            />
            <circle cx={p.x} cy={p.y} r="9" fill="var(--void)" stroke="var(--paper)" strokeWidth="1.2" />
            <circle cx={p.x} cy={p.y} r="3" fill={i % 2 ? "var(--value)" : "var(--signal)"} />
          </g>
        ))}
        <circle cx="300" cy="300" r="46" fill="var(--void)" stroke="var(--signal)" strokeWidth="1.2" />
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
        <Logo size={34} />
        <span className="mono text-[0.5rem] tracking-[0.18em] text-[var(--paper-dim)] sm:text-[0.56rem]">{VISION_UI.core}</span>
      </div>
      <ol className="hidden lg:contents">
        {parts.map((p, i) => {
          const pt = pts[i];
          const left = (pt.x / 600) * 100;
          const top = (pt.y / 600) * 100;
          const right = pt.x > 310;
          const center = Math.abs(pt.x - 300) < 10;
          return (
            <li
              key={p}
              className="absolute max-w-[9.5rem] text-[0.72rem] leading-tight sm:max-w-[11rem] sm:text-[0.86rem]"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: center ? `translate(-50%, ${pt.y < 300 ? "-170%" : "70%"})` : `translate(${right ? "18px" : "calc(-100% - 18px)"}, -50%)`,
                textAlign: center ? "center" : right ? "left" : "right",
              }}
            >
              <span className="mono mr-1 text-[0.6rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
              {p}
            </li>
          );
        })}
      </ol>
      </div>
      <ol className="mt-8 grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)] lg:hidden">
        {parts.map((p, i) => (
          <li key={p} className="bg-[var(--void)] px-4 py-3 text-[0.9rem]">
            <span className="mono mr-2 text-[0.62rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
            {p}
          </li>
        ))}
      </ol>
      <style>{`
        @keyframes vp-spin { to { transform: rotate(360deg); } }
        @keyframes vp-flow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
        .vp-spin { animation: vp-spin 120s linear infinite; }
        .vp-flow { animation: vp-flow 3.3s cubic-bezier(0.16,1,0.3,1) infinite; }
      `}</style>
    </figure>
  );
}

/* ════════════════ ECONOMIC LAYER — strata with a single value line through them ════════════════ */
export function EconomicLayer() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const motion = useMotionOK();
  const on = seen || !motion;
  const items = VISION.economic.items;
  return (
    <div ref={ref} className="relative">
      {/* value line */}
      <div aria-hidden className="absolute bottom-0 left-[1.15rem] top-0 w-px bg-[var(--rule)] md:left-1/2">
        <div
          className="absolute inset-x-0 top-0 bg-[var(--value)]"
          style={{ height: on ? "100%" : "0%", transition: "height 2.4s cubic-bezier(0.65,0,0.35,1) 200ms" }}
        />
      </div>
      <p aria-hidden className="mono mb-6 pl-10 text-[0.62rem] tracking-[0.2em] text-[var(--value)] md:pl-0 md:text-center">{VISION_UI.economic.flow} ↓</p>
      <ol className="grid gap-px">
        {items.map((it, i) => {
          const left = i % 2 === 0;
          return (
            <li key={it.title} className="relative grid md:grid-cols-2" style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(18px)", transition: `opacity 1s var(--ease-expo) ${300 + i * 260}ms, transform 1.2s var(--ease-expo) ${300 + i * 260}ms` }}>
              <span aria-hidden className="absolute left-[1.15rem] top-7 z-10 -translate-x-1/2 md:left-1/2">
                <span className="block h-3 w-3 rotate-45 border border-[var(--value)] bg-[var(--void)]" />
              </span>
              <div className={`border-t border-[var(--rule)] py-6 pl-10 md:py-8 ${left ? "md:pl-0 md:pr-14 md:text-right" : "md:col-start-2 md:pl-14"}`}>
                <p className="mono text-[0.62rem] tracking-[0.18em] text-[var(--paper-dim)]">
                  E{i + 1} · {VISION_UI.economic.tags[i]}
                </p>
                <h3 className="display display-m mt-3" style={{ fontVariationSettings: '"wdth" 78, "wght" 700' }}>
                  {it.title}
                </h3>
                <p className={`mt-3 max-w-[46ch] text-[0.98rem] text-[var(--paper-dim)] ${left ? "md:ml-auto" : ""}`}>{it.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
