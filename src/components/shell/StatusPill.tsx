"use client";
import Link from "next/link";
import { useArenaDerived } from "@/lib/arena/client";
import { GLOBAL } from "@/content/copy/global";

export default function StatusPill({ className = "" }: { className?: string }) {
  const d = useArenaDerived();
  const color = d.status === "open" ? "var(--signal)" : d.status === "running" ? "var(--value)" : "var(--paper-dim)";
  return (
    <Link
      href="/live"
      className={`mono inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-[var(--rule-strong)] px-3 text-[0.68rem] uppercase leading-none tracking-[0.14em] transition-colors hover:border-[var(--paper-dim)] ${className}`}
      style={{ color }}
      aria-label={`Arena status: ${GLOBAL.status[d.status]}`}
    >
      <i className="led" style={{ width: 6, height: 6 }} />
      {GLOBAL.status[d.status]}
    </Link>
  );
}
