"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, CONCEPTS } from "@/content/site";
import { Wordmark } from "@/components/brand/Logo";
import StatusPill from "./StatusPill";
import ThemeSwitcher from "./ThemeSwitcher";
import FontSwitcher from "./FontSwitcher";
import ScrollProgress from "@/components/v2/ScrollProgress";
import { lenis } from "./Providers";

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpen(false);
    setMega(false);
  }, [path]);
  // mobile menu: lock page scroll (native + Lenis), trap focus (burger + menu), close on Escape or when
  // the viewport grows past the lg breakpoint (rotation / resize), and hand focus back to the burger.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    lenis?.stop();
    const menu = document.getElementById("mobile-menu");
    const focusables = () =>
      [burger.current, ...Array.from(menu?.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])') ?? [])].filter(
        (el): el is HTMLElement => !!el && el.offsetParent !== null,
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burger.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const inside = els.includes(document.activeElement as HTMLElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.documentElement.style.overflow = "";
      lenis?.start();
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: scrolled || open ? "color-mix(in oklab, var(--void) 88%, transparent)" : "transparent",
        // a backdrop-filter makes the header the containing block of the fixed mobile menu, so drop it while open
        backdropFilter: scrolled && !open ? "blur(14px)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--rule)" : "transparent"}`,
      }}
      onMouseLeave={() => setMega(false)}
    >
      <ScrollProgress />
      <div className="shell flex h-16 items-center gap-6">
        <Link href="/" aria-label="MidEarth home" className="flex min-h-11 shrink-0 translate-y-px items-center gap-2.5">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = path === n.href || path.startsWith(n.href + "/");
              return (
                <li key={n.href} onMouseEnter={() => setMega(n.href === "/platform")}>
                  <Link
                    href={n.href}
                    className="rounded-md px-3 py-2 text-[0.88rem] transition-colors pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center hover:bg-[var(--deck-raise)]"
                    style={{ color: active ? "var(--paper)" : "var(--paper-dim)" }}
                    aria-current={active ? "page" : undefined}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* right cluster: every control is 36px tall (h-9), centred, 8px apart */}
        <div className="ml-auto flex h-9 items-center gap-2">
          <span className="hidden h-9 items-center xl:inline-flex">
            <StatusPill />
          </span>
          <span className="hidden h-9 items-center gap-2 lg:flex">
            <FontSwitcher />
            <ThemeSwitcher />
          </span>
          <Link
            href="/labs"
            className="ml-1 hidden h-9 items-center rounded-md pointer-coarse:h-11 bg-[var(--accent)] px-4 text-[0.82rem] font-semibold leading-none text-[var(--on-accent)] transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Launch an Agent
          </Link>
          <button
            ref={burger}
            className="-mr-1 grid h-11 w-11 place-items-center rounded-md border border-[var(--rule-strong)] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <span className="relative block h-3 w-4">
              <span className="absolute left-0 top-0 h-px w-4 bg-[var(--paper)] transition-transform" style={{ transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
              <span className="absolute left-0 top-[6px] h-px w-4 bg-[var(--paper)] transition-opacity" style={{ opacity: open ? 0 : 1 }} />
              <span className="absolute left-0 top-3 h-px w-4 bg-[var(--paper)] transition-transform" style={{ transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }} />
            </span>
          </button>
        </div>
      </div>

      {/* Platform mega menu (desktop) */}
      <div
        className="absolute inset-x-0 top-16 hidden border-y border-[var(--rule)] bg-[var(--void)]/95 backdrop-blur-xl transition-[opacity,transform] duration-200 lg:block"
        style={{ opacity: mega ? 1 : 0, transform: mega ? "none" : "translateY(-6px)", pointerEvents: mega ? "auto" : "none" }}
        onMouseEnter={() => setMega(true)}
      >
        <div className="shell grid grid-cols-4 gap-2 py-5">
          {CONCEPTS.map((c) => (
            <Link key={c.slug} href={`/platform/${c.slug}`} className="group rounded-lg p-3 transition-colors hover:bg-[var(--deck-raise)]" tabIndex={mega ? 0 : -1}>
              <span className="flex items-center justify-between">
                <span className="text-[0.92rem] font-medium text-[var(--paper)]">{c.name}</span>
                <span className="mono text-[0.6rem] tracking-wider" style={{ color: c.status === "LIVE" ? "var(--signal)" : c.status === "BETA" ? "var(--agent)" : "var(--paper-dim)" }}>
                  {c.status}
                </span>
              </span>
              <span className="mt-1 block text-[0.8rem] text-[var(--paper-dim)]">{c.short}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        data-lenis-prevent
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto overscroll-contain bg-[var(--void)] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden"
        style={{ display: open ? "block" : "none" }}
      >
        <nav className="shell py-6" aria-label="Mobile">
          <ul className="divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={path === n.href || path.startsWith(n.href + "/") ? "page" : undefined} className="flex min-h-11 items-center justify-between py-4 text-xl font-medium">
                  {n.label} <span aria-hidden className="text-[var(--paper-dim)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusPill className="!h-11" />
            <Link href="/labs" className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">
              Launch an Agent
            </Link>
          </div>
          <ThemeSwitcher variant="inline" className="mt-10 border-t border-[var(--rule)] pt-6" />
          <FontSwitcher variant="inline" className="mt-8 border-t border-[var(--rule)] pt-6" />
        </nav>
      </div>
    </header>
  );
}
