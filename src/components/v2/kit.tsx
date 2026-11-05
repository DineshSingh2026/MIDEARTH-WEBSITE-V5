"use client";
/**
 * MidEarth v2 UI kit — the ONLY building blocks pages should use for structure.
 * Clean, premium, readable. Motion is medium: fade/rise on view, nothing louder.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Status } from "@/content/site";
import { cardClass, type CardSurface } from "./surface";
import { useUI } from "@/store/ui";
import { SectionBg, type BgFade, type BgKind } from "./backgrounds";
import { SplitTitle, installSpotlight, useMagnetic, useScrub } from "./motion";

/* ── In-view hook (once) ── */
export function useInView<T extends Element>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    // in view, or already scrolled past (anchor jumps, restored scroll, late hydration): reveal
    const io = new IntersectionObserver(([e]) => (e.isIntersecting || e.boundingClientRect.bottom < 0) && (setInView(true), io.disconnect()), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, inView };
}

/**
 * Reveal hook: idle → in → done. Once the transition has finished the reveal class is dropped,
 * so the element is back to plain CSS (hover transitions, transforms and stacking untouched).
 */
export function useReveal<T extends Element>(totalMs = 1100, margin?: string) {
  const { ref, inView } = useInView<T>(margin);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => setDone(true), totalMs);
    return () => window.clearTimeout(id);
  }, [inView, totalMs]);
  return { ref, inView, done };
}
const revealClass = (inView: boolean, done: boolean, base: "rv" | "rv-stagger") => (done ? "" : `${base}${inView ? " rv-in" : ""}`);

/**
 * FadeIn: the standard reveal. Fade + 12px rise + 2px blur to sharp, expo-out, ~500ms (see MOTION SYSTEM in globals.css).
 * `stagger`: instead of the block, its direct children reveal one after another in 50ms steps.
 */
export function FadeIn({ children, delay = 0, className = "", stagger = false }: { children: ReactNode; delay?: number; className?: string; stagger?: boolean }) {
  const { ref, inView, done } = useReveal<HTMLDivElement>(delay + (stagger ? 950 : 600));
  const style = (stagger ? { "--rv-base": `${delay}ms` } : { "--rv-delay": `${delay}ms` }) as unknown as CSSProperties;
  return (
    <div ref={ref} className={`${revealClass(inView, done, stagger ? "rv-stagger" : "rv")} ${className}`} style={done ? undefined : style}>
      {children}
    </div>
  );
}

/* ── CountUp: real numbers count up once when they enter view (tabular figures, no layout shift) ── */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("en-US"), duration = 1400 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const motion = useUI((s) => s.motion);
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(value);
  const from = useRef<number | null>(null);
  useEffect(() => {
    if (!motion) return setShown(value);
    if (!inView) {
      if (from.current === null) setShown(0);
      return;
    }
    const start = from.current ?? 0;
    from.current = value;
    if (start === value) return setShown(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / duration);
      const e = u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
      setShown(start + (value - start) * e);
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, inView, motion, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {format(shown)}
    </span>
  );
}

/**
 * Section: consistent vertical rhythm + optional id anchor.
 * - a hairline draws across the top as the section arrives (`seam`), so sections hand over to each other
 * - `bg`: a quiet, data-related background (see `./backgrounds`). Use it only where it matches the content.
 */
export function Section({
  id,
  children,
  className = "",
  tone = "void",
  bg,
  bgFade = "right",
  bgOpacity = 1,
  bgBand = 640,
  seam = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "void" | "deck";
  bg?: BgKind;
  bgFade?: BgFade;
  bgOpacity?: number;
  /** height (px) of the band the background occupies from the section top — beside the header, fading out below it. "full" = whole section. */
  bgBand?: number | "full";
  seam?: boolean;
}) {
  const { ref, inView } = useInView<HTMLElement>("0px 0px -12% 0px");
  useEffect(installSpotlight, []);
  return (
    <section ref={ref} id={id} className={`relative scroll-mt-20 py-20 md:py-28 ${tone === "deck" ? "bg-[var(--deck)]" : ""} ${className}`}>
      {bg && <SectionBg kind={bg} fade={bgFade} opacity={bgOpacity} band={bgBand === "full" ? undefined : bgBand} />}
      {seam && <span aria-hidden className={`sec-seam ${inView ? "rv-in" : ""}`} />}
      <div className="shell relative">{children}</div>
    </section>
  );
}

/* ── Eyebrow + title + lead: every section opens with this ── */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <FadeIn stagger className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      {eyebrow && <p className={`eyebrow !text-[var(--kicker)] ${align === "center" ? "justify-center" : ""} flex items-center gap-2`}>{eyebrow}</p>}
      <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
        <SplitTitle>{title}</SplitTitle>
      </h2>
      {lead && <p className={`mt-5 max-w-[62ch] text-[1.05rem] leading-[1.65] text-[var(--paper-dim)] md:text-[1.15rem] ${align === "center" ? "mx-auto" : ""}`}>{lead}</p>}
    </FadeIn>
  );
}

/* ── Buttons ── */
export function Button({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost"; className?: string }) {
  const cls =
    variant === "primary"
      ? "bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90"
      : variant === "secondary"
        ? "border border-[var(--rule-strong)] text-[var(--paper)] hover:border-[var(--paper-dim)] hover:bg-[var(--deck-raise)]"
        : "text-[var(--kicker)] px-0";
  // hover: 1px lift (filled variants), arrow nudges 4px; press settles back. Same expo curve as reveals.
  // primary: magnetic lean toward the pointer + a light sweep; secondary: lift. Press settles back.
  const lift = variant === "ghost" ? "" : "hover:-translate-y-0.5 active:translate-y-0 active:duration-100";
  const mag = useMagnetic<HTMLAnchorElement>(variant === "primary" ? 0.22 : 0.12, variant === "primary" ? 6 : 3);
  const fx = variant === "primary" ? "btn-mag btn-sheen" : variant === "secondary" ? "btn-mag" : "";
  const base = `group inline-flex items-center gap-2 rounded-md px-5 py-3 text-[0.92rem] font-semibold transition-[transform,translate,opacity,background-color,border-color,color,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${lift} ${fx} ${cls} ${className}`;
  const inner = (
    <>
      {variant === "ghost" ? <span className="ulink pb-0.5">{children}</span> : children}
      <span aria-hidden className="transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-1 group-focus-visible:translate-x-1">→</span>
    </>
  );
  return /^https?:|\.md$|\.txt$/.test(href) ? (
    <a ref={mag} href={href} className={base} target={/^https?:/.test(href) ? "_blank" : undefined} rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link ref={mag} href={href} className={base}>
      {inner}
    </Link>
  );
}

/* ── Status badge (LIVE / BETA) ── */
const STATUS_COLOR: Record<Status, string> = { LIVE: "var(--signal)", BETA: "var(--agent)" };
export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium tracking-[0.12em] ${className}`}
      style={{ color: c, borderColor: `color-mix(in oklab, ${c} 40%, transparent)`, background: `color-mix(in oklab, ${c} 8%, transparent)` }}
    >
      {status === "LIVE" && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: c }} />}
      {status}
    </span>
  );
}

/* ── Card ── */
/**
 * Box policy: use a panel where it improves grouping and scanning (sets of comparable items,
 * feature highlights, CTAs, live data, tools, pricing, code, notices); keep long text, section
 * intros and numbered flows open (`variant="plain"` / `variant="rule"`). Rhythm: alternate open
 * and card sections. Never nest a panel inside a panel.
 * `surface="void"` gives the card the page ground colour — use it inside `<Section tone="deck">`.
 */
export type CardVariant = "panel" | "plain" | "rule";
export type { CardSurface };
export { cardClass };
export function Card({ children, className = "", href, glow, variant = "panel", surface = "deck" }: { children: ReactNode; className?: string; href?: string; glow?: string; variant?: CardVariant; surface?: CardSurface }) {
  const skin =
    variant === "panel"
      ? `overflow-hidden ${cardClass({ surface, interactive: !!href })} ${href ? (surface === "void" ? "hover:bg-[var(--deck)]" : "hover:bg-[var(--deck-raise)]") : ""}`
      : variant === "rule"
        ? `border-t border-[var(--rule)] pt-6 ${href ? "hover:border-[var(--paper-dim)]" : ""}`
        : "";
  const cls = `group relative block transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${skin} ${className}`;
  const g = glow && variant === "panel" ? <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: glow }} /> : null;
  return href ? (
    <Link href={href} className={cls}>
      {g}
      {children}
    </Link>
  ) : (
    <div className={cls}>
      {g}
      {children}
    </div>
  );
}

/* ── Image frame (generated art lives in /public/images). Missing image → elegant gradient placeholder. ── */
/** `bare` drops the frame (no radius/border/ring) — use when the image is the top of a card. */
export function Figure({ src, alt, className = "", priority = false, ratio = "16/9", caption, bare = false, imgClassName = "" }: { src: string; alt: string; className?: string; priority?: boolean; ratio?: string; caption?: string; bare?: boolean; imgClassName?: string }) {
  const [failed, setFailed] = useState(false);
  // iris reveal on enter (framed figures), slow parallax while it crosses the viewport, zoom on hover
  const { ref: inRef, inView } = useInView<HTMLDivElement>("0px 0px -8% 0px");
  const par = useScrub<HTMLDivElement>({ start: "top bottom", end: "bottom top", still: 0.5 });
  return (
    <figure className={className}>
      <div ref={inRef} data-in={inView ? "" : undefined} className={`fig-frame relative overflow-hidden bg-[var(--deck)] ${bare ? "fig-bare" : "rounded-2xl border border-[var(--rule)]"}`} style={{ aspectRatio: ratio }}>
        {!failed ? (
          <div ref={par} className="fig-par">
            <div className="fig-zoom">
              <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 1024px) 50vw, 100vw" className={`object-cover ${imgClassName}`} onError={() => setFailed(true)} />
            </div>
          </div>
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 60% at 60% 40%, color-mix(in oklab, var(--signal) 18%, transparent), transparent), radial-gradient(50% 50% at 20% 80%, color-mix(in oklab, var(--agent) 16%, transparent), transparent)" }} />
        )}
        {!bare && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[color-mix(in_oklab,var(--paper)_6%,transparent)]" />}
      </div>
      {caption && <figcaption className="mt-3 text-[0.8rem] text-[var(--paper-dim)]">{caption}</figcaption>}
    </figure>
  );
}

/* ── Stat tile ── */
export function Stat({ value, label, tone = "paper" }: { value: ReactNode; label: string; tone?: "paper" | "signal" | "agent" | "value" }) {
  return (
    <div>
      <p className="num text-[clamp(1.8rem,3.2vw,2.6rem)] leading-none" style={{ color: `var(--${tone})` }}>
        {typeof value === "number" ? <CountUp value={value} /> : typeof value === "string" && /^d{1,6}$/.test(value) ? <CountUp value={+value} /> : value}
      </p>
      <p className="mt-2 text-[0.82rem] text-[var(--paper-dim)]">{label}</p>
    </div>
  );
}

/* ── Note / disclaimer: a quiet notice — left rule + faint wash, no full box ── */
export function Note({ children, tone = "hot", className = "" }: { children: ReactNode; tone?: "hot" | "paper" | "value"; className?: string }) {
  const c = tone === "paper" ? "var(--rule-strong)" : `var(--${tone})`;
  return (
    <p
      className={`rounded-r-lg border-l-2 py-3 pl-4 pr-4 text-[0.82rem] leading-relaxed text-[var(--paper-dim)] ${className}`}
      style={{ borderColor: tone === "paper" ? c : `color-mix(in oklab, ${c} 55%, transparent)`, background: `color-mix(in oklab, ${tone === "paper" ? "var(--paper)" : c} 4%, transparent)` }}
    >
      {children}
    </p>
  );
}

/* ═════════ Open-layout primitives — prefer these over boxes ═════════ */

/* ── Divider: a single hairline ── */
export function Divider({ className = "", strong = false }: { className?: string; strong?: boolean }) {
  return <hr className={`border-0 border-t ${strong ? "border-[var(--rule-strong)]" : "border-[var(--rule)]"} ${className}`} />;
}

/* ── Kicker: small mono label with optional dot, for feature/list headers ── */
export function Kicker({ children, color = "var(--paper-dim)", dot = false, className = "" }: { children: ReactNode; color?: string; dot?: boolean; className?: string }) {
  return (
    <p className={`mono flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] ${className}`} style={{ color }}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </p>
  );
}

/**
 * Feature — an open content block: top hairline (or left rule), optional index/kicker/icon,
 * title, body. Use in grids instead of bordered cards. With `href` the whole block is a link
 * (hover: rule brightens, title underlines; keyboard focus uses the global ring).
 */
export function Feature({
  title,
  children,
  index,
  kicker,
  icon,
  color = "var(--paper-dim)",
  rule = "top",
  href,
  aside,
  className = "",
  titleClassName = "",
}: {
  title: ReactNode;
  children?: ReactNode;
  index?: ReactNode;
  kicker?: ReactNode;
  icon?: ReactNode;
  color?: string;
  rule?: "top" | "left" | "none";
  href?: string;
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  const ruleCls = rule === "top" ? "border-t pt-6" : rule === "left" ? "border-l pl-5" : "";
  const body = (
    <>
      {(index !== undefined || kicker || aside) && (
        <div className="flex items-center gap-3">
          {index !== undefined && <span className="mono text-[0.7rem] text-[var(--paper-dim)]">{index}</span>}
          {kicker && <Kicker color={color} dot={index === undefined}>{kicker}</Kicker>}
          {aside && <span className="ml-auto">{aside}</span>}
        </div>
      )}
      {icon && <div className={`${index !== undefined || kicker || aside ? "mt-5" : ""}`} style={{ color }}>{icon}</div>}
      <h3 className={`${index !== undefined || kicker || icon || aside ? "mt-4" : ""} text-[1.15rem] font-semibold leading-snug tracking-[-0.01em] ${href ? "decoration-[var(--paper-dim)] underline-offset-4 group-hover:underline" : ""} ${titleClassName}`}>{title}</h3>
      {children && <div className="mt-2 text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{children}</div>}
    </>
  );
  const cls = `group relative block border-[var(--rule)] transition-colors ${ruleCls} ${href ? "hover:border-[var(--paper-dim)]" : ""} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ── ListItem: icon/marker + text row, hairline between rows ── */
export function ListItem({ icon, title, children, aside, className = "" }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <li className={`flex gap-4 border-t border-[var(--rule)] py-4 first:border-t-0 ${className}`}>
      {icon && <span className="mt-0.5 shrink-0 text-[var(--paper-dim)]">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-[0.98rem] font-semibold leading-snug">{title}</p>}
        {children && <div className={`${title ? "mt-1" : ""} text-[0.9rem] leading-relaxed text-[var(--paper-dim)]`}>{children}</div>}
      </div>
      {aside && <span className="shrink-0">{aside}</span>}
    </li>
  );
}

/* ── Split: text | visual, aligned on the 12-col grid ── */
export function Split({ children, aside, reverse = false, ratio = "5/7", className = "", align = "center" }: { children: ReactNode; aside: ReactNode; reverse?: boolean; ratio?: "5/7" | "6/6" | "7/5" | "4/8"; className?: string; align?: "center" | "start" }) {
  const [a, b] = ratio.split("/");
  const span: Record<string, string> = { "4": "lg:col-span-4", "5": "lg:col-span-5", "6": "lg:col-span-6", "7": "lg:col-span-7", "8": "lg:col-span-8" };
  return (
    <div className={`grid gap-10 lg:grid-cols-12 lg:gap-16 ${align === "center" ? "items-center" : "items-start"} ${className}`}>
      <div className={`${span[a]} ${reverse ? "lg:order-2" : ""}`}>{children}</div>
      <div className={`${span[b]} min-w-0 ${reverse ? "lg:order-1" : ""}`}>{aside}</div>
    </div>
  );
}

/* ── Band: full-bleed tonal band for section rhythm (use instead of a giant card) ── */
export function Band({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`relative left-1/2 w-screen -translate-x-1/2 border-y border-[var(--rule)] bg-[var(--deck)] ${className}`}>
      <div className="shell py-14 md:py-20">{children}</div>
    </div>
  );
}

/* ── Page hero for inner pages ── */
export function PageHero({ eyebrow, title, lead, children, image }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; image?: { src: string; alt: string } }) {
  return (
    <header className="relative overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="shell relative grid items-center gap-12 lg:grid-cols-12">
        <div className={image ? "lg:col-span-6" : "lg:col-span-9"}>
          <FadeIn stagger>
            <p className="eyebrow !text-[var(--kicker)]">{eyebrow}</p>
            <h1 className="mt-5 text-[clamp(2.4rem,5.4vw,4.4rem)] font-semibold leading-[1.03] tracking-[-0.025em]">
              <SplitTitle delay={60}>{title}</SplitTitle>
            </h1>
            {lead && <p className="mt-6 max-w-[60ch] text-[1.08rem] leading-[1.65] text-[var(--paper-dim)] md:text-[1.2rem]">{lead}</p>}
          </FadeIn>
          {children && (
            <FadeIn delay={240} className="mt-8">
              {children}
            </FadeIn>
          )}
        </div>
        {image && (
          <FadeIn delay={180} className="lg:col-span-6">
            <Figure src={image.src} alt={image.alt} priority />
          </FadeIn>
        )}
      </div>
    </header>
  );
}
