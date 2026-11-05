"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FACTS } from "@/content/facts";

/* ───────── Section index: `01 / 07 — AGENT LOOP` ───────── */
export function SectionIndex({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-3 ${className}`}>
      <span className="inline-block h-px w-6 bg-[var(--paper-dim)] opacity-60" aria-hidden />
      {children}
    </p>
  );
}

/* ───────── Status tag ───────── */
export function StatusTag({ status }: { status: "LIVE" | "EARLY" | "NEXT" | "ROADMAP" | string }) {
  const c = status === "LIVE" ? "var(--signal)" : status === "EARLY" ? "var(--agent)" : status === "NEXT" ? "var(--value)" : "var(--paper-dim)";
  return (
    <span className="mono inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.66rem] tracking-[0.14em]" style={{ color: c, borderColor: `color-mix(in oklab, ${c} 45%, transparent)` }}>
      {status === "LIVE" && <i className="led" style={{ width: 5, height: 5 }} />}
      {status}
    </span>
  );
}

/* ───────── Buttons ───────── */
export function Btn({
  href,
  children,
  variant = "solid",
  tone = "signal",
  className = "",
  onClick,
  external,
}: {
  href?: string;
  children: ReactNode;
  variant?: "solid" | "ghost" | "line";
  tone?: "signal" | "agent" | "value" | "paper";
  className?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const col = `var(--${tone})`;
  const base =
    "group relative inline-flex items-center gap-3 overflow-hidden px-5 py-3 mono text-[0.78rem] uppercase tracking-[0.14em] transition-colors duration-300";
  const style =
    variant === "solid"
      ? { background: col, color: "var(--void)" }
      : variant === "line"
        ? { border: `1px solid ${col}`, color: col }
        : { color: "var(--paper)", border: "1px solid var(--rule-strong)" };
  const inner = (
    <>
      <span className="relative z-10">{children}</span>
      <span aria-hidden className="relative z-10 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1">
        →
      </span>
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-[var(--paper)] opacity-15 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-0"
      />
    </>
  );
  if (href) {
    const ext = external ?? /^https?:/.test(href);
    return ext ? (
      <a href={href} className={`${base} ${className}`} style={style} target="_blank" rel="noreferrer">
        {inner}
      </a>
    ) : (
      <Link href={href} className={`${base} ${className}`} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${className}`} style={style}>
      {inner}
    </button>
  );
}

/* ───────── Call chip: POST /api/v1/gateway/register — click copies curl ───────── */
export function CallChip({ method, path, body, className = "" }: { method: "GET" | "POST" | string; path: string; body?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const full = path.startsWith("/api") ? `${FACTS.appBase}${path}` : `${FACTS.apiBase}${path}`;
  const curl =
    method === "GET"
      ? `curl -s ${full}`
      : `curl -s -X ${method} ${full} -H "Content-Type: application/json"${body ? ` -d '${body}'` : ""}`;
  const c = method === "GET" ? "var(--agent)" : "var(--signal)";
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(curl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className={`mono group inline-flex max-w-full items-center gap-0 border border-[var(--rule-strong)] bg-[var(--deck)] text-left text-[0.74rem] transition-colors hover:border-[color:var(--paper-dim)] ${className}`}
      aria-label={`Copy curl for ${method} ${path}`}
    >
      <span className="px-2 py-1.5 text-[0.66rem] font-bold tracking-wider" style={{ color: "var(--void)", background: c }}>
        {method}
      </span>
      <span className="truncate px-2.5 py-1.5 text-[var(--paper)]">{path}</span>
      <span className="border-l border-[var(--rule-strong)] px-2 py-1.5 text-[0.62rem] uppercase tracking-widest text-[var(--paper-dim)] group-hover:text-[var(--paper)]">
        {copied ? "copied" : "curl"}
      </span>
    </button>
  );
}

/* ───────── Odometer: digits roll when value changes ───────── */
export function Odometer({ value, decimals = 0, className = "", pad = 0 }: { value: number; decimals?: number; className?: string; pad?: number }) {
  const str = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).padStart(pad, "0");
  return (
    <span className={`mono inline-flex tabular-nums ${className}`} aria-label={str}>
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden className="relative inline-block h-[1em] overflow-hidden leading-none" style={{ width: "0.62em" }}>
            <span
              className="absolute left-0 top-0 flex flex-col transition-transform duration-700"
              style={{ transform: `translateY(-${Number(ch)}em)`, transitionTimingFunction: "steps(6, end)" }}
            >
              {"0123456789".split("").map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden className="leading-none">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

/* ───────── Card with registration ticks ───────── */
export function Card({ children, className = "", raise = false }: { children: ReactNode; className?: string; raise?: boolean }) {
  return (
    <div className={`ticks border border-[var(--rule)] ${raise ? "bg-[var(--deck-raise)]" : "bg-[var(--deck)]"} ${className}`}>{children}</div>
  );
}

/* ───────── Reveal: masked rise + Archivo width sweep, triggered on view ───────── */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  width = false,
}: {
  children: ReactNode;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  width?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const T = Tag as "div";
  return (
    <T
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(28px)",
        transition: `opacity 1s var(--ease-expo) ${delay}ms, transform 1.2s var(--ease-expo) ${delay}ms, font-variation-settings 1.4s var(--ease-expo) ${delay}ms`,
        ...(width ? { fontVariationSettings: on ? '"wdth" 100, "wght" 700' : '"wdth" 62, "wght" 500' } : {}),
      }}
    >
      {children}
    </T>
  );
}

/* ───────── Page hero (shared shape for inner pages) ───────── */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="shell relative pb-16 pt-40 md:pb-24 md:pt-52">
      <SectionIndex>{eyebrow}</SectionIndex>
      <Reveal as="h1" width className="display display-xl mt-6 max-w-[14ch]">
        {title}
      </Reveal>
      {sub && (
        <Reveal as="p" delay={120} className="mt-8 max-w-[58ch] text-[1.08rem] text-[var(--paper-dim)] md:text-[1.18rem]">
          {sub}
        </Reveal>
      )}
      {children && (
        <Reveal delay={220} className="mt-10">
          {children}
        </Reveal>
      )}
    </header>
  );
}
