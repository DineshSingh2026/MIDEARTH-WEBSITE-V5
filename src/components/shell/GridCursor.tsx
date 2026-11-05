"use client";
import { useEffect, useRef, useState } from "react";
import { useUI } from "@/store/ui";

/** Field-mode crosshair that snaps to the 40×40 grid and reads out x,y. 20Hz quantised. */
export default function GridCursor() {
  const mode = useUI((s) => s.mode);
  const motion = useUI((s) => s.motion);
  const [fine, setFine] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => setFine(window.matchMedia("(pointer: fine)").matches), []);
  const active = fine && motion && mode === "field";

  useEffect(() => {
    document.documentElement.dataset.cursor = active ? "grid" : "native";
    if (!active) return;
    let x = -100,
      y = -100,
      hover = false;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      hover = !!(e.target as HTMLElement)?.closest?.("a,button,input,select,textarea,[role=radio]");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const cw = window.innerWidth / 40;
      const ch = window.innerHeight / 40;
      const gx = Math.min(39, Math.max(0, Math.floor(x / cw)));
      const gy = Math.min(39, Math.max(0, Math.floor(y / ch)));
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.dataset.hover = hover ? "1" : "0";
      if (label.current) label.current.textContent = `${String(gx).padStart(2, "0")},${String(gy).padStart(2, "0")}`;
    }, 50);
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearInterval(id);
      document.documentElement.dataset.cursor = "native";
    };
  }, [active]);

  if (!active) return null;
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference" style={{ transform: "translate3d(-100px,-100px,0)" }}>
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-1/2 h-[18px] w-px -translate-x-1/2 -translate-y-1/2 bg-white" />
        <span className="absolute left-1/2 top-1/2 h-px w-[18px] -translate-x-1/2 -translate-y-1/2 bg-white" />
        <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 border border-white/60" />
      </div>
      <span ref={label} className="mono absolute left-4 top-3 text-[10px] tracking-wider text-white/80">
        00,00
      </span>
    </div>
  );
}
