"use client";
/** Thin reading-progress hairline along the bottom edge of the nav. Transform only; rAF-throttled. */
import { useEffect, useRef } from "react";

export default function ScrollProgress() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${p})`;
      el.style.opacity = p > 0.005 ? "1" : "0";
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left transition-opacity duration-500"
      style={{ transform: "scaleX(0)", opacity: 0, background: "linear-gradient(90deg, color-mix(in oklab, var(--kicker) 30%, transparent), color-mix(in oklab, var(--kicker) 75%, transparent))" }}
    />
  );
}
