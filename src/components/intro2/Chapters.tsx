"use client";
import Image from "next/image";
import { useId, type CSSProperties, type ReactNode } from "react";
import { BRAND, CONCEPTS, INVESTORS, NARRATIVE, PILLARS, STREAMS, ARENA, type Status } from "@/content/site";
import { DOME_EYES, DOME_PATH } from "@/components/brand/Logo";
import { CHAPTERS, type ChapterId } from "./timeline";

/*
 * Chapter views of the opening film. All copy comes from site.ts; short neutral UI labels only
 * where site.ts has none. No dashes in visible text.
 * Layout system: IntroFilm puts every view inside a safe-area "fit" box (between the top bar and
 * the progress rail) and scales it down when it would not fit, so nothing is ever clipped.
 * Story chapters use <Slide> (eyebrow, headline and body always in the same place); the two brand
 * bookends (logo, enter) and the vision are centred. Full-bleed imagery lives in a separate
 * background layer (the *Bg exports) so it is never scaled with the content.
 * Dense layouts switch at `lg` (1024px): below that (phones, portrait tablets) they stack.
 * Timing: `--d` is the delay (ms from chapter start) of each element's entrance.
 */

const d = (ms: number, extra?: CSSProperties) => ({ "--d": `${ms}ms`, ...extra }) as CSSProperties;

/* ───────── primitives ───────── */

function Frame({ src, sizes, className = "", dur = 6000, eager, pos }: { src: string; sizes: string; className?: string; dur?: number; eager?: boolean; pos?: string }) {
  return (
    <div className={`i2-img ${className}`} style={pos ? ({ "--pos": pos } as CSSProperties) : undefined}>
      <div className="i2-kb" style={d(0, { "--dur": `${dur}ms` } as CSSProperties)}>
        <Image src={src} alt="" fill sizes={sizes} loading="eager" fetchPriority={eager ? "high" : "auto"} />
      </div>
    </div>
  );
}

const STATUS_C: Record<Status, string> = { LIVE: "var(--signal)", BETA: "var(--agent)", BUILDING: "var(--value)", ROADMAP: "var(--paper-dim)" };
function Badge({ status }: { status: Status }) {
  const c = STATUS_C[status];
  return (
    <span className="i2-badge mono" style={{ color: c, borderColor: `color-mix(in oklab, ${c} 42%, transparent)`, background: `color-mix(in oklab, ${c} 9%, transparent)` }}>
      {status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />}
      {status}
    </span>
  );
}

/** The shared slide grid: eyebrow, headline and optional sub always sit in the same place. */
function Slide({ id, title, sub, children, accent = "var(--signal)", grow }: { id: ChapterId; title: ReactNode | ReactNode[]; sub?: ReactNode; children: ReactNode; accent?: string; grow?: boolean }) {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return (
    <div className="i2-slide">
      <header className="i2-head">
        <p className="i2-eyebrow i2-rise" style={d(40)}>
          <span style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</span>
          <span className="i2-liney i2-eyebrow-rule" style={d(140, { background: accent })} />
          <span>{CHAPTERS[i].label}</span>
        </p>
        <h2 className="i2-h i2-rise" style={d(130)}>
          {Array.isArray(title)
            ? title.map((t, k) => (
                <span key={k} className="i2-ln">
                  {t}
                </span>
              ))
            : title}
        </h2>
        {sub && (
          <p className="i2-sub i2-rise" style={d(320)}>
            {sub}
          </p>
        )}
      </header>
      <div className="i2-body" data-grow={grow ? "true" : undefined}>
        {children}
      </div>
    </div>
  );
}

/** animated dome mascot: outline draws, gradient fills, eyes open */
export function Dome({ size, at = 0, still }: { size: number; at?: number; still?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 240 200" width={size * 1.2} height={size} aria-hidden="true" className="block overflow-visible">
      <defs>
        <radialGradient id={`ig-${id}`} cx="0.6" cy="0.42" r="0.78">
          <stop offset="0" stopColor="#57FF5E" />
          <stop offset="0.42" stopColor="#3EDB8E" />
          <stop offset="0.78" stopColor="#36BFB0" />
          <stop offset="1" stopColor="#2A9BF0" />
        </radialGradient>
        <linearGradient id={`il-${id}`} x1="0" y1="1" x2="0.6" y2="0.3">
          <stop offset="0" stopColor="#2A8DF5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2A8DF5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`is-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2A9BF0" />
          <stop offset="1" stopColor="#57FF5E" />
        </linearGradient>
      </defs>
      <g className={still ? "" : "i2-fade"} style={d(at + 420, { animationDuration: "0.9s" })}>
        <path d={DOME_PATH} fill={`url(#ig-${id})`} />
        <path d={DOME_PATH} fill={`url(#il-${id})`} />
      </g>
      {!still && <path d={DOME_PATH} fill="none" stroke={`url(#is-${id})`} strokeWidth="2.5" pathLength={1} className="i2-draw" style={d(at, { "--dur": "0.9s" } as CSSProperties)} />}
      {DOME_EYES.map((e, i) => (
        <g key={i} className={still ? "" : "i2-blink i2-eye"} style={d(at + 900 + i * 60)}>
          <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="#fff" transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} />
        </g>
      ))}
    </svg>
  );
}

function Wordmark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`i2-wordmark ${className}`} style={style}>
      MIDEARTH
    </span>
  );
}

/* ───────── 01 · What MidEarth is ───────── */
export function ChLogo() {
  const letters = "MIDEARTH".split("");
  return (
    <div className="i2-center i2-lockup">
      <div className="i2-lockup-dome relative">
        <div
          className="i2-glow pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full md:h-[340px] md:w-[420px]"
          style={d(150, { background: "radial-gradient(closest-side, color-mix(in oklab, var(--signal) 24%, transparent), color-mix(in oklab, var(--agent) 9%, transparent) 55%, transparent)", filter: "blur(20px)" })}
        />
        <div className="relative hidden md:block">
          <Dome size={132} at={100} />
        </div>
        <div className="relative md:hidden">
          <Dome size={92} at={100} />
        </div>
      </div>
      <div className="i2-lockup-text flex flex-col items-center">
      <h1 className="i2-wordmark i2-logo-word mt-8 md:mt-10" aria-label={BRAND.name}>
        {letters.map((l, i) => (
          <span key={i} className="i2-letter" style={d(380 + i * 50)} aria-hidden="true">
            {l}
          </span>
        ))}
      </h1>
      <div className="i2-line mt-7 h-px w-44 md:w-72" style={d(820, { background: "linear-gradient(90deg, transparent, var(--signal), transparent)", transformOrigin: "center" })} />
      <p className="i2-rise mono mt-5 text-[0.78rem] uppercase tracking-[0.28em] text-[var(--paper)] md:text-[1rem]" style={d(920)}>
        {BRAND.descriptor}
      </p>
      </div>
    </div>
  );
}

/* ───────── 02 · Why now: the world is going agentic ───────── */
/* BRAND.altHeadlines[1], set in sentence case */
const SHIFT_A = "The world is going agentic.";
const SHIFT_B = "MidEarth is building its infrastructure.";
const SHIFT = [
  { k: "Then", t: "Isolated AI tools", s: "Software that waits for a person", c: "var(--paper-dim)" },
  { k: "Now", t: "Autonomous agents", s: "Learning, competing and collaborating", c: "var(--agent)" },
  { k: "Next", t: "Economic participants", s: "Agents that deliver measurable value", c: "var(--signal)" },
];
/** full-bleed backdrop of the shift chapter (outside the fit box, never scaled) */
export function ShiftBg() {
  return (
    <>
      <Frame src="/images/hero.jpg" sizes="100vw" className="i2-shiftimg absolute inset-0" dur={4200} eager />
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 80% at 70% 40%, color-mix(in oklab, var(--void) 45%, transparent), var(--void) 85%)" }} />
    </>
  );
}
export function ChShift() {
  return (
    <Slide id="shift" title={SHIFT_A} sub={SHIFT_B}>
      <ol className="i2-shift">
        {SHIFT.map((s, i) => {
          const at = 560 + i * 170;
          const last = i === SHIFT.length - 1;
          return (
            <li key={s.k} className="contents">
              {i > 0 && (
                <span className="i2-arrow i2-fade" style={d(at - 60)} aria-hidden="true">
                  <svg viewBox="0 0 40 12" className="i2-only-wide h-3 w-10">
                    <path d="M0 6h36M31 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <svg viewBox="0 0 12 22" className="i2-only-narrow h-[16px] w-3">
                    <path d="M6 0v19M1 14l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </span>
              )}
              <div className="i2-card i2-rise" data-hl={last} style={d(at, { "--c": s.c } as CSSProperties)}>
                <p className="mono text-[0.7rem] uppercase tracking-[0.2em] md:text-[0.78rem]" style={{ color: s.c }}>
                  {s.k}
                </p>
                <p className="mt-1 text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] md:text-[1.4rem] lg:mt-2 lg:text-[1.6rem]">{s.t}</p>
                <p className="mt-1 text-balance text-[0.92rem] leading-snug text-[var(--paper-dim)] md:text-[1rem] lg:mt-2 lg:text-[1.05rem]">{s.s}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Slide>
  );
}

/* ───────── 03 · The platform: eight products, three dimensions ───────── */
const DIM_C: Record<string, string> = { intelligence: "var(--agent)", economy: "var(--signal)", infrastructure: "var(--value)" };
const DIM_IMG: Record<string, string> = { intelligence: "/images/context-pools.jpg", economy: "/images/arena.jpg", infrastructure: "/images/onchain.jpg" };
/* focal point of each artwork: the cube and pods, the glass arena, the chain and its two streams */
const DIM_POS: Record<string, string> = { intelligence: "50% 58%", economy: "46% 42%", infrastructure: "50% 40%" };
export function ChPlatform() {
  const bySlug = Object.fromEntries(CONCEPTS.map((c) => [c.slug, c]));
  return (
    <Slide id="platform" title={["One platform.", "An entire agent economy."]} sub="Eight products, organised in three dimensions.">
      <div className="i2-dims">
        {NARRATIVE.dimensions.map((dim, i) => {
          const c = DIM_C[dim.key];
          const at = 500 + i * 150;
          const items = dim.concepts.map((s) => bySlug[s]).filter(Boolean);
          return (
            <div key={dim.key} className="i2-rise i2-panel" style={d(at)}>
              <div className="i2-line absolute inset-x-0 top-0 z-[1] h-[2px]" style={d(at + 120, { background: c })} />
              <div className="i2-dimhero">
                <Frame src={DIM_IMG[dim.key]} sizes="(min-width: 1024px) 34vw, 120px" className="i2-dimimg" dur={5200} pos={DIM_POS[dim.key]} />
              </div>
              <div className="i2-panel-in">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
                  <p className="min-w-0 text-[1.05rem] font-semibold leading-tight tracking-[-0.01em] md:text-[1.2rem] xl:text-[1.3rem]">{dim.title}</p>
                  <span className="mono ml-auto flex-none whitespace-nowrap text-[0.68rem] uppercase tracking-[0.14em] text-[var(--paper-dim)] md:text-[0.74rem]">
                    {items.length} {items.length === 1 ? "product" : "products"}
                  </span>
                </div>
                <p className="i2-dimbody mt-2 text-balance text-[0.95rem] leading-snug text-[var(--paper-dim)]">{dim.body}</p>
                <ul className="i2-prows">
                  {items.map((p) => (
                    <li key={p.slug} className="i2-prow">
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="mono flex-none text-[0.68rem] text-[var(--paper-dim)] md:text-[0.74rem]">{p.n}</span>
                        <span className="min-w-0 text-[0.95rem] font-medium leading-snug md:text-[1.02rem] xl:text-[1.06rem]">{p.name}</span>
                      </span>
                      <Badge status={p.status} />
                    </li>
                  ))}
                </ul>
                {items.length === 1 && (
                  <p className="i2-dimnote mt-4 border-l-2 pl-4 text-[1.02rem] font-medium leading-snug text-[var(--paper)]" style={{ borderColor: c }}>
                    {items[0].positioning}
                    <span className="mt-1 block text-[0.92rem] font-normal text-[var(--paper-dim)]">{items[0].short}: one layer that monetises all eight products.</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Slide>
  );
}

/* ───────── 04 · How it works: six steps, one loop ───────── */
const STEPS = [
  { k: "Build", s: "Developers create and deploy agents", c: "var(--frost)" },
  { k: "Learn", s: "Agents tap shared context pools", c: "var(--agent)" },
  { k: "Compete", s: "Games, predictions and debates", c: "var(--agent)" },
  { k: "Prove", s: "Results become measurable reputation", c: "var(--signal)" },
  { k: "Rent", s: "Top agents become discoverable and rentable", c: "var(--signal)" },
  { k: "Earn", s: "Developers and the platform earn from usage", c: "var(--value)" },
];
const ST_AT = 540;
const ST_GAP = 240;
export const stepAt = (i: number) => ST_AT + i * ST_GAP;
export function ChCycle() {
  const n = STEPS.length;
  const loopAt = stepAt(n - 1) + 300;
  const lineBg = "linear-gradient(90deg, var(--frost), var(--agent) 30%, var(--signal) 65%, var(--value))";
  return (
    <Slide id="cycle" title="Every feature reinforces the others.">
      {/* wide screens: horizontal process */}
      <div className="i2-only-wide relative w-full">
        <div className="relative mx-[calc(100%/12)]">
          <div className="h-[2px] rounded bg-[var(--rule-strong)]" />
          <div className="i2-line absolute inset-0 h-[2px] rounded" style={d(ST_AT, { background: lineBg, "--dur": `${(n - 1) * ST_GAP}ms`, animationTimingFunction: "linear" } as CSSProperties)} />
        </div>
        <ol className="relative -mt-[20px] grid grid-cols-6 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.k} className="flex flex-col items-center text-center">
              <span className="i2-node mono" style={d(stepAt(i), { "--c": s.c } as CSSProperties)}>
                {i + 1}
              </span>
              <div className="i2-step mt-5" style={d(stepAt(i))}>
                <p className="text-[1.45rem] font-semibold leading-tight tracking-[-0.015em] xl:text-[1.7rem]" style={{ color: "var(--paper)" }}>
                  {s.k}
                </p>
                <p className="mx-auto mt-1.5 max-w-[17ch] text-balance text-[0.96rem] leading-snug text-[var(--paper-dim)] xl:text-[1.05rem]">{s.s}</p>
              </div>
            </li>
          ))}
        </ol>
        {/* the loop closes: earnings fund the next agents */}
        <div className="i2-fade relative mx-[calc(100%/12)] mt-8 h-10" style={d(loopAt)}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40" aria-hidden="true">
            <path d="M100 0 V22 Q100 38 92 38 H8 Q0 38 0 22 V2" fill="none" stroke="color-mix(in oklab, var(--value) 55%, transparent)" strokeWidth="1.2" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          </svg>
          <svg className="absolute -left-[5px] -top-[6px] h-[10px] w-[10px]" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 7l4-5 4 5" fill="none" stroke="var(--value)" strokeWidth="1.4" />
          </svg>
          <span className="mono absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 whitespace-nowrap bg-[var(--void)] px-4 text-[0.78rem] uppercase tracking-[0.18em] text-[var(--value)]">The cycle repeats</span>
        </div>
      </div>

      {/* phones and portrait tablets: vertical process */}
      <div className="i2-only-narrow relative w-full">
        <div className="absolute bottom-[16px] left-[15px] top-[16px] w-[2px] bg-[var(--rule-strong)] md:left-[18px] md:top-[19px] md:bottom-[19px]" />
        <div
          className="i2-liney absolute bottom-[16px] left-[15px] top-[16px] w-[2px] md:left-[18px] md:top-[19px] md:bottom-[19px]"
          style={d(ST_AT, { background: "linear-gradient(180deg, var(--frost), var(--agent) 30%, var(--signal) 65%, var(--value))", "--dur": `${(n - 1) * ST_GAP}ms`, animationTimingFunction: "linear" } as CSSProperties)}
        />
        <ol className="relative space-y-3 md:space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.k} className="flex items-center gap-4 md:gap-6">
              <span className="i2-node mono shrink-0" style={d(stepAt(i), { "--c": s.c } as CSSProperties)}>
                {i + 1}
              </span>
              <div className="i2-step min-w-0" style={d(stepAt(i))}>
                <p className="text-[1.12rem] font-semibold leading-tight md:text-[1.5rem]">{s.k}</p>
                <p className="text-[0.88rem] leading-snug text-[var(--paper-dim)] md:mt-0.5 md:text-[1.05rem]">{s.s}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="i2-fade mono mt-4 pl-12 text-[0.72rem] uppercase tracking-[0.18em] text-[var(--value)] md:mt-6 md:pl-16 md:text-[0.8rem]" style={d(loopAt)}>
          ↻ The cycle repeats
        </p>
      </div>
    </Slide>
  );
}

/* ───────── 05 · Business model: five pillars, each with the streams that feed it ───────── */
const PILLAR_C: Record<string, string> = { signal: "var(--signal)", value: "var(--value)", agent: "var(--agent)", hot: "var(--hot)", frost: "var(--frost)" };
const shortPillar = (name: string) => name.replace(/ Economy$/, "");
const shortStream = (name: string) => name.replace(/^MidEarth Labs: /, "");
export function ChBusiness() {
  return (
    <Slide id="business" accent="var(--value)" title={["The economic engine", "of the agent economy."]} sub="Every pillar is fed by its own revenue streams.">
      <ol className="i2-pillars">
        {PILLARS.map((p, i) => {
          const c = PILLAR_C[p.color];
          const at = 440 + i * 110;
          return (
            <li key={p.key} className="i2-rise i2-pillar" style={d(at, { "--c": c } as CSSProperties)}>
              <div className="i2-line absolute inset-x-0 top-0 h-[2px]" style={d(at + 100, { background: c })} />
              <span aria-hidden className="i2-pl-glow" />
              <div className="i2-pl-top">
                <span className="i2-pl-n mono flex-none" style={{ color: c }}>
                  {p.n}
                </span>
                <p className="i2-pl-name min-w-0 font-semibold leading-tight tracking-[-0.01em]">{shortPillar(p.name)}</p>
              </div>
              <p className="i2-pl-type mono uppercase" style={{ color: c }}>
                {p.type}
              </p>
              <ul className="i2-pl-streams">
                {p.streams.map((n, k) => {
                  const s = STREAMS.find((x) => x.n === n)!;
                  return (
                    <li key={n} className="i2-rise i2-pl-stream" style={d(at + 380 + k * 140)}>
                      <span className="i2-pl-dot" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                      <span className="min-w-0">{shortStream(s.name)}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </Slide>
  );
}

/* ───────── 06 · Proof: the Arena is live ───────── */
export function ChArena() {
  const live = INVESTORS.why.find((w) => w.title === "Live product today");
  return (
    <Slide
      id="arena"
      grow
      title={
        <>
          Live today: <span className="i2-grad-text">the Arena.</span>
        </>
      }
      sub={live?.body}
    >
      <div className="i2-rise i2-arena" style={d(480)}>
        <Frame src="/images/arena.jpg" sizes="(min-width: 768px) 1400px, 100vw" className="absolute inset-0" dur={4400} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, color-mix(in oklab, var(--void) 88%, transparent) 0%, transparent 55%)" }} />
        <span className="i2-fade i2-live mono" style={d(720)}>
          <span className="led text-[var(--signal)]" />
          {ARENA.eyebrow.split(" · ")[1]}
        </span>
        <div className="i2-games">
          {ARENA.games.map((g, i) => (
            <span key={g.name} className="i2-fade i2-game" style={d(800 + i * 120)}>
              <span className="mono text-[0.66rem] md:text-[0.72rem]" style={{ color: g.status === "LIVE" ? "var(--signal)" : "var(--paper-dim)" }}>
                {g.status === "LIVE" ? "LIVE" : "NEXT"}
              </span>
              {g.name}
            </span>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ───────── 07 · The vision ───────── */
export function ChVision() {
  const lines = BRAND.closing.sign.split(". ").map((s, i, a) => (i < a.length - 1 ? `${s}.` : s));
  const i = CHAPTERS.findIndex((c) => c.id === "vision");
  return (
    <div className="i2-center">
      <p className="i2-eyebrow i2-rise justify-center" style={d(40)}>
        <span className="text-[var(--signal)]">{String(i + 1).padStart(2, "0")}</span>
        <span className="i2-liney i2-eyebrow-rule" style={d(140, { background: "var(--signal)" })} />
        <span>{CHAPTERS[i].label}</span>
      </p>
      <h2 className="i2-h i2-h-xl mt-6 md:mt-8">
        {lines.map((l, k) => (
          <span key={l} className={`i2-rise block ${k === lines.length - 1 ? "i2-grad-text" : ""}`} style={d(180 + k * 260)}>
            {l}
          </span>
        ))}
      </h2>
      <p className="i2-rise mt-6 max-w-[40ch] text-[1rem] leading-snug text-[var(--paper-dim)] md:mt-8 md:text-[1.25rem]" style={d(1020)}>
        A new economy. Built around intelligence.
      </p>
    </div>
  );
}

/**
 * BRAND.headline under the wordmark: the leading "MidEarth:" is dropped (the wordmark already says it)
 * and the rest is set in two tiers: the claim large, the positioning smaller and dimmer.
 */
function brandTiers() {
  const parts = BRAND.headline.replace(/^MidEarth:\s*/i, "").match(/[^.]+\.?/g)?.map((p) => p.trim()) ?? [];
  const n = Math.min(2, Math.max(1, parts.length - 1));
  return [parts.slice(0, n).join(" "), parts.slice(n).join(" ")] as const;
}
export function BrandLines({ className = "", rise }: { className?: string; rise?: boolean }) {
  const [a, b] = brandTiers();
  return (
    <div className={`i2-brandlines ${className}`}>
      <p className={`i2-bl-a ${rise ? "i2-rise" : ""}`} style={rise ? d(320) : undefined}>
        {a}
      </p>
      {b && (
        <p className={`i2-bl-b ${rise ? "i2-rise" : ""}`} style={rise ? d(440) : undefined}>
          {b}
        </p>
      )}
    </div>
  );
}

/* ───────── 08 · Enter: the brand lockup hands over to the site ───────── */
export function ChEnter() {
  return (
    <div className="i2-center">
      <div className="i2-rise" style={d(40)}>
        <Dome size={72} still />
      </div>
      <Wordmark className="i2-rise mt-5" style={d(140, { fontSize: "clamp(2.2rem, 6vw, 4.6rem)" })} />
      <BrandLines className="mt-6 md:mt-7" rise />
      <p className="i2-rise mono mt-6 flex flex-wrap items-center justify-center gap-x-3 text-[0.72rem] uppercase tracking-[0.24em] text-[var(--paper-dim)] md:text-[0.8rem]" style={d(580)}>
        {BRAND.verbs.join(" ")}
      </p>
    </div>
  );
}
