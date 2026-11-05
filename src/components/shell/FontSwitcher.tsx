"use client";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { DEFAULT_FONT, FONTS, FONT_STORAGE_KEY, isFontId, type FontId, type FontMeta } from "@/content/fonts";

/* ── pairing state lives on <html data-font>; subscribe so every switcher instance agrees ── */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-font"] });
  return () => mo.disconnect();
}
const getSnapshot = (): FontId => {
  const f = document.documentElement.dataset.font;
  return isFontId(f) ? f : DEFAULT_FONT;
};
const getServerSnapshot = (): FontId => DEFAULT_FONT;

export function applyFont(id: FontId, persist = true) {
  const d = document.documentElement;
  if (id === DEFAULT_FONT) delete d.dataset.font;
  else d.dataset.font = id;
  if (persist) {
    try {
      localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      /* storage blocked: the pairing still applies for this visit */
    }
  }
}

export function useFont() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Specimen: each option is set in its OWN pairing, whatever pairing is active. The
 * pairing selectors in globals.css match <html> only, so the specimen mirrors them
 * inline from the same next/font CSS variables (keep in sync with globals.css).
 */
const SPECIMEN: Record<FontId, { heading: CSSProperties; body: CSSProperties; mono: CSSProperties }> = {
  ledger: {
    heading: { fontFamily: "var(--font-newsreader), Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" },
    body: { fontFamily: "var(--font-inter), system-ui, sans-serif" },
    mono: { fontFamily: "var(--font-plex-mono), ui-monospace, monospace" },
  },
  meridian: {
    heading: { fontFamily: "var(--font-geist), system-ui, sans-serif", fontWeight: 600, letterSpacing: "-0.03em" },
    body: { fontFamily: "var(--font-geist), system-ui, sans-serif" },
    mono: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" },
  },
  atlas: {
    heading: { fontFamily: "var(--font-mona), system-ui, sans-serif", fontWeight: 640, fontStretch: "105%", letterSpacing: "-0.022em" },
    body: { fontFamily: "var(--font-mona), system-ui, sans-serif" },
    mono: { fontFamily: "var(--font-jetbrains), ui-monospace, monospace" },
  },
};

function TypeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 15.6 7 4.4h.4l4.2 11.2M4.3 11.8h5.8" />
      <path d="M17.4 10.4v5.2M17.4 12.9c0-1.6-1-2.6-2.4-2.6s-2.4 1.1-2.4 2.7 1 2.7 2.4 2.7 2.4-1.1 2.4-2.8Z" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.4 6.6 11.4 12.5 4.8" />
    </svg>
  );
}

function Specimen({ f }: { f: FontMeta }) {
  const s = SPECIMEN[f.id];
  return (
    <span aria-hidden className="mt-2 block">
      <span className="block text-[1.06rem] leading-[1.18] text-[var(--paper)]" style={s.heading}>
        Beyond Gaming. Beyond Automation.
      </span>
      <span className="mt-1.5 flex items-baseline gap-2 text-[0.8rem] text-[var(--paper-dim)]">
        <span style={s.body}>Labs from</span>
        <span className="tabular-nums text-[var(--value)]" style={s.mono}>
          $25 / month · 30 to 40%
        </span>
      </span>
    </span>
  );
}

/** pairings as radio options; arrow keys move, Enter/Space select */
function FontList({ current, onPick, autoFocus = false }: { current: FontId; onPick: (id: FontId) => void; autoFocus?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!autoFocus) return;
    const i = FONTS.findIndex((f) => f.id === current);
    refs.current[Math.max(0, i)]?.focus();
    // focus once when the list opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = refs.current.findIndex((r) => r === document.activeElement);
    const n = FONTS.length;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
    }
  };

  return (
    <div role="radiogroup" aria-label="Typography" onKeyDown={onKey} className="flex flex-col gap-1">
      {FONTS.map((f, i) => {
        const on = f.id === current;
        return (
          <button
            key={f.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${f.name}: ${f.stack}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(f.id)}
            className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--deck-raise)] ${on ? "bg-[var(--deck-raise)]" : ""}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[0.84rem] font-semibold text-[var(--paper)]">
                {f.name}
                {f.id === DEFAULT_FONT && <span className="mono text-[0.64rem] md:text-[0.56rem] font-normal uppercase tracking-[0.14em] text-[var(--paper-dim)]">Default</span>}
                <span className="mono ml-auto truncate text-[0.66rem] md:text-[0.6rem] font-normal tracking-[0.04em] text-[var(--paper-dim)]">{f.stack}</span>
              </span>
              <Specimen f={f} />
            </span>
            <span className="mt-0.5 w-4 shrink-0 text-[var(--accent)]">{on && <Tick />}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Typography switcher.
 * - `variant="popover"` (desktop nav): "Aa" button → popover. Esc closes and returns focus.
 * - `variant="inline"` (mobile menu): the list rendered in place.
 */
export default function FontSwitcher({ variant = "popover", className = "" }: { variant?: "popover" | "inline"; className?: string }) {
  const current = useFont();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const pick = useCallback((f: FontId) => applyFont(f), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const meta = FONTS.find((f) => f.id === current) ?? FONTS[0];

  if (variant === "inline") {
    return (
      <div className={className}>
        <p className="eyebrow mb-3">Typography</p>
        <FontList current={current} onPick={pick} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Typography: ${meta.name}. Change typography`}
        title="Typography"
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-md border border-[var(--rule-strong)] pointer-coarse:h-11 pointer-coarse:w-11 text-[var(--paper-dim)] transition-colors hover:border-[var(--paper-dim)] hover:text-[var(--paper)] aria-expanded:text-[var(--paper)]"
      >
        <TypeIcon />
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label="Choose a typography pairing"
          className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[380px] rounded-xl border border-[var(--rule-strong)] bg-[var(--deck)] p-2 shadow-[0_24px_70px_-20px_var(--shadow)]"
        >
          <p className="eyebrow px-3 pb-2 pt-2">Typography</p>
          <FontList current={current} onPick={pick} autoFocus />
          <p className="mt-1 border-t border-[var(--rule)] px-3 pb-1 pt-2.5 text-[0.68rem] text-[var(--paper-dim)]">
            Share a pairing: add <span className="mono text-[var(--paper)]">?font={current}</span> to any URL.
          </p>
        </div>
      )}
    </div>
  );
}
