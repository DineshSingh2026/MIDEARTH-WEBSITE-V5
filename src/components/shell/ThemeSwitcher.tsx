"use client";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId, type ThemeMeta } from "@/content/themes";

/* ── theme state lives on <html data-theme>; subscribe to it so every switcher instance agrees ── */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getSnapshot = (): ThemeId => {
  const t = document.documentElement.dataset.theme;
  return isThemeId(t) ? t : DEFAULT_THEME;
};
const getServerSnapshot = (): ThemeId => DEFAULT_THEME;

export function applyTheme(id: ThemeId, persist = true) {
  const d = document.documentElement;
  if (id === DEFAULT_THEME) delete d.dataset.theme;
  else d.dataset.theme = id;
  const meta = THEMES.find((t) => t.id === id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", meta?.themeColor ?? THEMES[0].themeColor);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* storage blocked — theme still applies for this visit */
    }
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** mini specimen: theme ground, "Aa" in its type colour, accent + value chips */
function Swatches({ t }: { t: ThemeMeta }) {
  const [ground, ink, accent, value] = t.swatches;
  return (
    <span
      aria-hidden
      className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-[color-mix(in_oklab,var(--paper)_16%,transparent)]"
      style={{ background: ground }}
    >
      <span className="-mt-2 text-[0.92rem] font-semibold leading-none tracking-[-0.02em]" style={{ color: ink }}>
        Aa
      </span>
      <span className="absolute inset-x-0 bottom-0 flex h-[7px]">
        <span className="flex-1" style={{ background: accent }} />
        <span className="flex-1" style={{ background: value }} />
      </span>
    </span>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 2.8a7.2 7.2 0 1 0 0 14.4c1 0 1.5-.6 1.5-1.3 0-.9-.8-1.2-.8-2.1 0-.8.6-1.4 1.5-1.4h1.6a3.4 3.4 0 0 0 3.4-3.4C17.2 5.6 14 2.8 10 2.8Z" />
      <circle cx="6.4" cy="9.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="6.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="6.2" r="1" fill="currentColor" stroke="none" />
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

/** list of themes as radio options; arrow keys move, Enter/Space select */
function ThemeList({ current, onPick, autoFocus = false }: { current: ThemeId; onPick: (id: ThemeId) => void; autoFocus?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!autoFocus) return;
    const i = THEMES.findIndex((t) => t.id === current);
    refs.current[Math.max(0, i)]?.focus();
    // focus once when the list opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = refs.current.findIndex((r) => r === document.activeElement);
    const n = THEMES.length;
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
    <div role="radiogroup" aria-label="Colour theme" onKeyDown={onKey} className="flex flex-col gap-1">
      {THEMES.map((t, i) => {
        const on = t.id === current;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(t.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 text-left py-2.5 transition-colors hover:bg-[var(--deck-raise)] ${on ? "bg-[var(--deck-raise)]" : ""}`}
          >
            <Swatches t={t} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[0.88rem] font-semibold text-[var(--paper)]">
                {t.name}
                {t.id === DEFAULT_THEME && <span className="mono text-[0.64rem] md:text-[0.56rem] font-normal uppercase tracking-[0.14em] text-[var(--paper-dim)]">Default</span>}
              </span>
              <span className="mt-0.5 block text-[0.74rem] leading-snug text-[var(--paper-dim)]">{t.description}</span>
            </span>
            <span className="w-4 shrink-0 text-[var(--accent)]">{on && <Tick />}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Theme switcher.
 * - `variant="popover"` (desktop nav): palette button → popover. Esc closes and returns focus.
 * - `variant="inline"` (mobile menu): the list rendered in place.
 */
export default function ThemeSwitcher({ variant = "popover", className = "" }: { variant?: "popover" | "inline"; className?: string }) {
  const current = useTheme();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const pick = useCallback((t: ThemeId) => applyTheme(t), []);

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

  const meta = THEMES.find((t) => t.id === current) ?? THEMES[0];

  if (variant === "inline") {
    return (
      <div className={className}>
        <p className="eyebrow mb-3">Colour theme</p>
        <ThemeList current={current} onPick={pick} />
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
        aria-label={`Colour theme: ${meta.name}. Change theme`}
        title="Colour theme"
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-md border border-[var(--rule-strong)] pointer-coarse:h-11 pointer-coarse:w-11 text-[var(--paper-dim)] transition-colors hover:border-[var(--paper-dim)] hover:text-[var(--paper)] aria-expanded:text-[var(--paper)]"
      >
        <PaletteIcon />
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label="Choose a colour theme"
          className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[360px] rounded-xl border border-[var(--rule-strong)] bg-[var(--deck)] p-2 shadow-[0_24px_70px_-20px_var(--shadow)]"
        >
          <p className="eyebrow px-3 pb-2 pt-2">Colour theme</p>
          <ThemeList current={current} onPick={pick} autoFocus />
          <p className="mt-1 border-t border-[var(--rule)] px-3 pb-1 pt-2.5 text-[0.68rem] text-[var(--paper-dim)]">
            Share a theme: add <span className="mono text-[var(--paper)]">?theme={current}</span> to any URL.
          </p>
        </div>
      )}
    </div>
  );
}
