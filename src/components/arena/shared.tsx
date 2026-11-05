"use client";
/** Small shared bits for the /arena page (icons, chips, formatters). */
import type { ReactNode } from "react";
import { FACTS } from "@/content/facts";

/** Unit for arena credit: vIDLE during alpha, IDLE from beta. */
export const CREDIT = FACTS.stage === "alpha" ? "vIDLE" : "IDLE";

export const fmtNum = (n: number, max = 0) => n.toLocaleString("en-US", { maximumFractionDigits: max, minimumFractionDigits: 0 });

export function fmtAgo(iso: string, now: number) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Endpoint chip: `POST /api/v1/gateway/register` */
export function ApiChip({ method, path, className = "" }: { method: string; path: string; className?: string }) {
  return (
    <code className={`mono inline-flex max-w-full items-center gap-2 overflow-hidden rounded-md border border-[var(--rule-strong)] bg-[var(--void)] px-2 py-1 text-[0.68rem] leading-none ${className}`}>
      <span className="font-semibold text-[var(--agent)]">{method}</span>
      <span className="truncate text-[var(--paper-dim)]">{path.replace("/api/v1", "")}</span>
    </code>
  );
}

/** Mono label chip */
export function Tag({ children, tone = "dim", className = "" }: { children: ReactNode; tone?: "dim" | "signal" | "agent" | "value" | "hot"; className?: string }) {
  const c = tone === "dim" ? "var(--paper-dim)" : `var(--${tone})`;
  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.66rem] leading-none tracking-[0.06em] ${className}`}
      style={{ color: c, borderColor: `color-mix(in oklab, ${c} 35%, transparent)`, background: `color-mix(in oklab, ${c} 7%, transparent)` }}
    >
      {children}
    </span>
  );
}

/** Feed source indicator (live / snapshot / connecting) */
export function SourceDot({ source }: { source: "live" | "fallback" | "pending" | undefined }) {
  const map = {
    live: { c: "var(--signal)", t: "live" },
    fallback: { c: "var(--value)", t: "snapshot" },
    pending: { c: "var(--paper-dim)", t: "connecting" },
  } as const;
  const s = map[source ?? "pending"];
  return (
    <span className="mono inline-flex items-center gap-1.5 text-[0.66rem] tracking-[0.1em] uppercase" style={{ color: s.c }}>
      <span className={`h-1.5 w-1.5 rounded-full ${source === "live" ? "animate-pulse" : ""}`} style={{ background: s.c }} />
      {s.t}
    </span>
  );
}

export type IconName = "key" | "chain" | "model" | "grid" | "coin";
export function StepIcon({ name, className = "", size = 20 }: { name: string; className?: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      {name === "key" && (
        <g {...p}>
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12h9M18 12v3M15 12v2" />
        </g>
      )}
      {name === "chain" && (
        <g {...p}>
          <rect x="3" y="8" width="9" height="8" rx="4" />
          <rect x="12" y="8" width="9" height="8" rx="4" />
        </g>
      )}
      {name === "model" && (
        <g {...p}>
          <circle cx="5" cy="7" r="1.8" />
          <circle cx="5" cy="17" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="7" r="1.8" />
          <circle cx="19" cy="17" r="1.8" />
          <path d="M6.6 7.9 10.4 11M6.6 16.1l3.8-3.1M13.6 11l3.8-3.1M13.6 13l3.8 3.1" />
        </g>
      )}
      {name === "grid" && (
        <g {...p}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" />
        </g>
      )}
      {name === "coin" && (
        <g {...p}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        </g>
      )}
    </svg>
  );
}
