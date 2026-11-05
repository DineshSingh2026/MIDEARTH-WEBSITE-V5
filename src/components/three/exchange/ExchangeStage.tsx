"use client";
/**
 * Safe host for the Agent Exchange hero scene: CSS poster first, lazy WebGL chunk (ssr:false) once on screen
 * with a real size; frameloop "never" offscreen / tab hidden; reduced motion renders one still frame;
 * no WebGL keeps the poster.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useUI } from "@/store/ui";
import type { ExPalette } from "./ExchangeCanvas";

const ExchangeCanvas = dynamic(() => import("./ExchangeCanvas"), { ssr: false, loading: () => null });

const HEX = /^#[0-9a-f]{6}$/i;
function readPal(el: HTMLElement): ExPalette {
  const cs = getComputedStyle(el);
  const g = (n: string, fb: string) => {
    const v = cs.getPropertyValue(n).trim();
    return HEX.test(v) ? v : fb;
  };
  const v = g("--void", "#04070b");
  const n = parseInt(v.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return { void: v, signal: g("--signal", "#2ee6a1"), agent: g("--agent", "#38c6e4"), value: g("--value", "#e2b552"), light: lum > 0.5 };
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function ExchangeStage({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const motion = useUI((s) => s.motion);
  const [ok, setOk] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tab, setTab] = useState(true);
  const [sized, setSized] = useState(false);
  const [ready, setReady] = useState(false);
  const [pal, setPal] = useState<ExPalette | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOk(webglOK());
    const read = () => setPal(readPal(el));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const ro = new ResizeObserver(([e]) => setSized(e.contentRect.width >= 8 && e.contentRect.height >= 8));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    const vis = () => setTab(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    const move = (ev: PointerEvent) => {
      pointer.current.x = Math.max(-1, Math.min(1, (ev.clientX / Math.max(1, window.innerWidth)) * 2 - 1));
      pointer.current.y = Math.max(-1, Math.min(1, (ev.clientY / Math.max(1, window.innerHeight)) * 2 - 1));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      mo.disconnect();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const mount = ok && sized && pal !== null && (onScreen || ready);
  const active = onScreen && tab && motion;

  return (
    <div ref={ref} className={`relative aspect-square w-full ${className}`} role="img" aria-label="Three MidEarth agents on a glass plinth, gold value spiralling up into five revenue rings">
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: ready ? 0 : 1,
          background:
            "radial-gradient(34% 10% at 50% 66%, color-mix(in oklab, var(--value) 45%, transparent), transparent 70%), radial-gradient(18% 14% at 50% 58%, color-mix(in oklab, var(--signal) 40%, transparent), transparent 70%), radial-gradient(40% 40% at 50% 45%, color-mix(in oklab, var(--value) 10%, transparent), transparent 72%)",
        }}
      />
      {mount && pal && (
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 1 : 0, maskImage: "radial-gradient(closest-side, #000 78%, transparent)", WebkitMaskImage: "radial-gradient(closest-side, #000 78%, transparent)" }}>
          <ExchangeCanvas key={pal.void + pal.value} pal={pal} active={active} still={!motion} pointer={pointer} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
