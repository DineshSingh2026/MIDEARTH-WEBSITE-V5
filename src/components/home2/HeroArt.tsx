"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Full-bleed hero background: MidEarth artwork (agents in pods around the shared intelligence core,
 * the on-chain block chain in front, dashboards above) with clearly visible, lightweight CSS motion:
 * camera drift + pointer parallax, a beam and pulse from the core, data rising from the core,
 * blocks sealing in sequence, packets running the chain, twinkling activity across the scene,
 * a dashboard scan line. No WebGL. Reduced motion: static.
 */
const BLOCKS = [27.2, 36.2, 45.2, 54.4, 63.3, 72.4];
const RISE = Array.from({ length: 14 }, (_, i) => ({ x: 47.2 + ((i * 37) % 60) / 10, d: (i * 0.43) % 5.6, s: 0.35 + ((i * 13) % 5) / 10 }));
// deterministic scatter of twinkles across the pods, paths and dashboards
const TWINKLE = Array.from({ length: 34 }, (_, i) => {
  const x = (i * 61.8) % 100;
  const y = 8 + ((i * 37.3) % 84);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: ((i * 0.37) % 4).toFixed(2), gold: i % 3 === 0 };
});

export default function HeroArt() {
  const par = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = par.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -18;
      ty = (e.clientY / window.innerHeight - 0.5) * -12;
    };
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="hero-bg pointer-events-none absolute inset-0 overflow-hidden">
      <div ref={par} className="absolute inset-[-24px]">
        <div className="hero-bg-box">
          <div className="hero-bg-drift absolute inset-0">
            <Image src="/images/context-pools.jpg" alt="" fill priority sizes="100vw" className="object-cover" />

            {/* activity twinkling across pods, paths and dashboards */}
            {TWINKLE.map((t, i) => (
              <span key={i} className={`hb-tw ${t.gold ? "hb-tw-gold" : ""}`} style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.d}s` }} />
            ))}

            {/* core: beam + breathing glow + expanding ring */}
            <span className="hb-beam" style={{ left: "50%", top: "8%" }} />
            <span className="hb-core" style={{ left: "50%", top: "45%" }} />
            <span className="hb-ring" style={{ left: "50%", top: "47%" }} />
            <span className="hb-ring" style={{ left: "50%", top: "47%", animationDelay: "1.6s" }} />

            {/* data rising from the core */}
            {RISE.map((r, i) => (
              <span key={i} className="hb-rise" style={{ left: `${r.x}%`, top: "40%", animationDelay: `${r.d}s`, width: `${r.s}%` }} />
            ))}

            {/* chain: blocks seal one after another */}
            {BLOCKS.map((x, i) => (
              <span key={x} className="hb-block" style={{ left: `${x}%`, top: "72.6%", animationDelay: `${i * 0.45}s` }} />
            ))}

            {/* packets running along the chain, both directions */}
            <span className="hb-packet" style={{ top: "72.6%" }} />
            <span className="hb-packet hb-packet-b" style={{ top: "72.6%", animationDelay: "1.4s" }} />
            <span className="hb-packet hb-packet-rev" style={{ top: "72.6%", animationDelay: "2.6s" }} />

            {/* dashboard scan line */}
            <span className="hb-scan" />
          </div>
        </div>
      </div>

      {/* scrims so the text always reads */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(2,5,9,0.95) 0%, rgba(2,5,9,0.86) 36%, rgba(2,5,9,0.40) 60%, rgba(2,5,9,0.08) 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to bottom, transparent, var(--void))" }} />
      <div className="absolute inset-x-0 top-0 h-28" style={{ background: "linear-gradient(to bottom, rgba(2,5,9,0.7), transparent)" }} />

      <style>{`
        .hero-bg-box { position: absolute; top: 50%; left: 50%; transform: translate(-42%, -50%); aspect-ratio: 1920 / 1086; width: max(100%, 177dvh); min-height: 100%; }
        @media (max-width: 1023px) { .hero-bg-box { transform: translate(-50%, -50%); opacity: .6; } }
        .hero-bg-drift { animation: hbDrift 14s ease-in-out infinite alternate; transform-origin: 55% 48%; will-change: transform; }
        @keyframes hbDrift { 0% { transform: scale(1.0) translate3d(0,0,0); } 50% { transform: scale(1.06) translate3d(-1.2%, -0.6%, 0); } 100% { transform: scale(1.1) translate3d(-0.4%, -1.4%, 0); } }

        .hb-tw { position: absolute; width: .32%; aspect-ratio: 1; border-radius: 999px; background: #e9fff7; box-shadow: 0 0 8px 2px rgba(0,255,163,.8);
          mix-blend-mode: screen; opacity: 0; animation: hbTw 4s ease-in-out infinite; }
        .hb-tw-gold { background: #fff3cf; box-shadow: 0 0 8px 2px rgba(227,179,65,.85); }
        @keyframes hbTw { 0%, 100% { opacity: 0; transform: scale(.4); } 45% { opacity: 1; transform: scale(1.3); } 60% { opacity: .6; transform: scale(1); } }

        .hb-beam { position: absolute; width: 1.4%; height: 38%; transform: translateX(-50%); border-radius: 999px;
          background: linear-gradient(to top, rgba(120,255,210,.0), rgba(120,255,210,.55) 60%, rgba(255,255,255,.0)); filter: blur(3px); mix-blend-mode: screen;
          animation: hbBeam 3.6s ease-in-out infinite; transform-origin: 50% 100%; }
        @keyframes hbBeam { 0%,100% { opacity: .25; transform: translateX(-50%) scaleY(.85); } 50% { opacity: 1; transform: translateX(-50%) scaleY(1.05); } }

        .hb-core { position: absolute; width: 18%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 999px;
          background: radial-gradient(circle, rgba(150,255,215,.7), rgba(0,255,163,.25) 40%, transparent 70%); mix-blend-mode: screen; animation: hbCore 3.6s ease-in-out infinite; }
        @keyframes hbCore { 0%,100% { opacity: .4; transform: translate(-50%,-50%) scale(.85); } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); } }

        .hb-ring { position: absolute; width: 12%; aspect-ratio: 2.2 / 1; transform: translate(-50%, -50%) scale(.6); border-radius: 999px;
          border: 2px solid rgba(120,255,210,.8); box-shadow: 0 0 18px rgba(0,255,163,.6); mix-blend-mode: screen; opacity: 0; animation: hbRing 3.2s cubic-bezier(.2,.6,.3,1) infinite; }
        @keyframes hbRing { 0% { opacity: .9; transform: translate(-50%,-50%) scale(.6); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(3.2); } }

        .hb-rise { position: absolute; aspect-ratio: 1; border-radius: 999px; background: #e6fff6; box-shadow: 0 0 12px 3px rgba(0,255,163,.8);
          mix-blend-mode: screen; opacity: 0; animation: hbRise 5.6s cubic-bezier(.3,.6,.4,1) infinite; }
        @keyframes hbRise { 0% { opacity: 0; transform: translateY(0) scale(.6); } 12% { opacity: 1; } 100% { opacity: 0; transform: translateY(-2200%) scale(1.1); } }

        .hb-block { position: absolute; width: 7.6%; height: 10%; transform: translate(-50%, -50%); border-radius: 8px;
          background: radial-gradient(closest-side, rgba(255,232,150,.95), rgba(227,179,65,.35) 60%, transparent); mix-blend-mode: screen; opacity: 0;
          animation: hbSeal 2.7s ease-in-out infinite; }
        @keyframes hbSeal { 0%, 100% { opacity: 0; transform: translate(-50%,-50%) scale(.9); } 14% { opacity: 1; transform: translate(-50%,-50%) scale(1.08); } 38% { opacity: 0; } }

        .hb-packet { position: absolute; left: 0; width: 6%; height: 1.1%; transform: translateY(-50%); border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255,220,120,1), rgba(255,255,255,1)); box-shadow: 0 0 18px 3px rgba(227,179,65,.85);
          mix-blend-mode: screen; opacity: 0; animation: hbPacket 3.6s cubic-bezier(.45,0,.3,1) infinite; }
        .hb-packet-b { background: linear-gradient(90deg, transparent, rgba(120,255,210,1), rgba(255,255,255,1)); box-shadow: 0 0 18px 3px rgba(0,255,163,.75); }
        .hb-packet-rev { background: linear-gradient(270deg, transparent, rgba(120,220,255,1), rgba(255,255,255,1)); box-shadow: 0 0 18px 3px rgba(34,200,232,.8); animation-name: hbPacketRev; }
        @keyframes hbPacket { 0% { left: 20%; opacity: 0; } 10% { opacity: 1; } 85% { opacity: 1; } 100% { left: 76%; opacity: 0; } }
        @keyframes hbPacketRev { 0% { left: 76%; opacity: 0; } 10% { opacity: 1; } 85% { opacity: 1; } 100% { left: 20%; opacity: 0; } }

        .hb-scan { position: absolute; left: 0; right: 0; top: 2%; height: 1.6%;
          background: linear-gradient(to bottom, transparent, rgba(160,255,230,.55), transparent); mix-blend-mode: screen; animation: hbScan 4.5s linear infinite; }
        @keyframes hbScan { 0% { top: 2%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 27%; opacity: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .hero-bg-drift, .hb-tw, .hb-beam, .hb-core, .hb-ring, .hb-rise, .hb-block, .hb-packet, .hb-scan { animation: none !important; }
          .hb-tw, .hb-ring, .hb-rise, .hb-block, .hb-packet, .hb-scan { opacity: 0 !important; }
        }
        html[data-motion="off"] .hero-bg-drift, html[data-motion="off"] .hb-tw, html[data-motion="off"] .hb-beam, html[data-motion="off"] .hb-core,
        html[data-motion="off"] .hb-ring, html[data-motion="off"] .hb-rise, html[data-motion="off"] .hb-block, html[data-motion="off"] .hb-packet, html[data-motion="off"] .hb-scan { animation: none !important; }
      `}</style>
    </div>
  );
}
