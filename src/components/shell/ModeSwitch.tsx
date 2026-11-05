"use client";
import { useUI } from "@/store/ui";
import { GLOBAL } from "@/content/copy/global";

export default function ModeSwitch({ className = "" }: { className?: string }) {
  const mode = useUI((s) => s.glassTarget ?? s.mode);
  const setMode = useUI((s) => s.setMode);
  const t = GLOBAL.modeSwitch;
  return (
    <div role="radiogroup" aria-label="Side of the glass" className={`mono relative inline-flex border border-[var(--rule-strong)] text-[0.66rem] tracking-[0.14em] ${className}`}>
      <span
        aria-hidden
        className="absolute inset-y-0 w-1/2 bg-[var(--paper)] transition-transform duration-500 ease-[var(--ease-expo)]"
        style={{ transform: mode === "field" ? "translateX(0)" : "translateX(100%)" }}
      />
      {(["field", "stands"] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          title={m === "field" ? t.fieldHint : t.standsHint}
          onClick={() => setMode(m, { lock: true })}
          className="relative z-10 px-3 py-1.5 transition-colors duration-500"
          style={{ color: mode === m ? "var(--void)" : "var(--paper-dim)" }}
        >
          {m === "field" ? t.field : t.stands}
        </button>
      ))}
    </div>
  );
}
