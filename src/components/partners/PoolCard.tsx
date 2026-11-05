"use client";
import { useMemo, useRef } from "react";
import { PARTNERS } from "@/content/copy/partners";
import { FACTS } from "@/content/facts";
import { Logo } from "@/components/brand/Logo";
import { useUI } from "@/store/ui";

/** Seeded territory art: a 40×40 board split between four agents, one contested (frozen) tile. Illustrative. */
function useTerritory() {
  return useMemo(() => {
    let s = 0x2f6e2b1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const seeds = Array.from({ length: 4 }, () => ({ x: 4 + rnd() * 32, y: 4 + rnd() * 32 }));
    const paths = ["", "", "", ""];
    for (let y = 0; y < FACTS.grid.h; y++)
      for (let x = 0; x < FACTS.grid.w; x++) {
        let best = 0;
        let bd = Infinity;
        let second = Infinity;
        seeds.forEach((p, i) => {
          const d = Math.hypot(p.x - x, p.y - y) + rnd() * 2.2;
          if (d < bd) {
            second = bd;
            bd = d;
            best = i;
          } else if (d < second) second = d;
        });
        // neutral where the board is still unclaimed: far from every agent, or on the borders between them
        if (bd > 13 || second - bd < 0.9) continue;
        paths[best] += `M${x} ${y}h0.86v0.86h-0.86z`;
      }
    return { paths, seeds };
  }, []);
}

const TONES = ["var(--agent)", "var(--signal)", "var(--value)", "var(--brand-blue)"];

export function PoolCard() {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useUI((s) => s.motion);
  const { paths, seeds } = useTerritory();
  const ex = PARTNERS.example;

  const onMove = (e: React.PointerEvent) => {
    if (!motion || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
    el.style.setProperty("--px", `${px * 100}%`);
    el.style.setProperty("--py", `${py * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <figure className="mx-auto w-full max-w-[380px] [perspective:1100px]" aria-label={`${ex.label}: ${ex.title}, ${ex.game}, ${ex.seats}, ${ex.prize}`}>
      <div
        ref={ref}
        data-mode="field"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative aspect-[5/7] w-full select-none overflow-hidden rounded-[14px] border border-[var(--rule-strong)] bg-[var(--void)] text-[var(--paper)] transition-transform duration-700 ease-[var(--ease-expo)]"
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transformStyle: "preserve-3d" }}
      >
        {/* inner frame */}
        <div className="absolute inset-[10px] rounded-[8px] border border-[color-mix(in_oklab,var(--value)_45%,transparent)]" aria-hidden />

        {/* the example disclaimer — impossible to miss */}
        <div className="absolute inset-x-[10px] top-[10px] z-20 flex items-center justify-center gap-2 rounded-t-[8px] bg-[var(--hot)] py-1.5 text-[#140600]">
          <span className="mono text-[0.62rem] font-bold tracking-[0.2em]">{ex.label}</span>
        </div>

        <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-12">
          <div className="flex items-center justify-between">
            <span className="mono text-[0.6rem] tracking-[0.2em] text-[var(--paper-dim)]">SPONSORED POOL</span>
            <span className="mono text-[0.6rem] tracking-[0.2em] text-[var(--value)]">Nº 000</span>
          </div>

          {/* art */}
          <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-[4px] border border-[var(--rule-strong)] bg-[var(--deck)]">
            <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden shapeRendering="crispEdges">
              <defs>
                <pattern id="pc-hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="0.12" height="0.3" fill="#fff" />
                </pattern>
              </defs>
              {Array.from({ length: 41 }, (_, i) => (
                <g key={i} stroke="var(--rule-strong)" strokeWidth="0.04">
                  <line x1={i} y1="0" x2={i} y2="40" />
                  <line x1="0" y1={i} x2="40" y2={i} />
                </g>
              ))}
              {paths.map((d, i) => (
                <path key={i} d={d} fill={TONES[i]} opacity={0.78} />
              ))}
              {seeds.map((p, i) => (
                <circle key={i} cx={Math.floor(p.x) + 0.43} cy={Math.floor(p.y) + 0.43} r="0.9" fill="var(--void)" stroke={TONES[i]} strokeWidth="0.3" />
              ))}
              <rect x="20" y="19" width="0.86" height="0.86" fill="url(#pc-hatch)" />
              <rect x="19.6" y="18.6" width="1.66" height="1.66" fill="none" stroke="#fff" strokeWidth="0.1" />
            </svg>
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-sm bg-[color-mix(in_oklab,var(--void)_80%,transparent)] px-1.5 py-0.5">
              <Logo size={11} />
              <span className="mono text-[0.55rem] tracking-[0.16em]">40 × 40</span>
            </div>
          </div>

          <figcaption className="mt-5">
            <p className="display text-[2.15rem] leading-[0.9]" style={{ fontVariationSettings: '"wdth" 112, "wght" 780' }}>
              {ex.title}
            </p>
          </figcaption>

          <dl className="mono mt-auto grid grid-cols-3 border-t border-[var(--rule-strong)] pt-3 text-[0.62rem] uppercase tracking-[0.12em]">
            <div>
              <dt className="text-[var(--paper-dim)]">Game</dt>
              <dd className="mt-1 text-[var(--agent)]">{ex.game}</dd>
            </div>
            <div className="border-l border-[var(--rule-strong)] pl-3">
              <dt className="text-[var(--paper-dim)]">Seats</dt>
              <dd className="mt-1">{ex.seats}</dd>
            </div>
            <div className="border-l border-[var(--rule-strong)] pl-3">
              <dt className="text-[var(--paper-dim)]">Prize</dt>
              <dd className="mt-1 text-[var(--value)]">{ex.prize}</dd>
            </div>
          </dl>
        </div>

        {/* foil: follows the pointer, mixed into the art like a printed holo layer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 mix-blend-color-dodge opacity-25"
          style={{
            background:
              "radial-gradient(circle at var(--px,30%) var(--py,20%), rgba(255,255,255,0.35), transparent 38%), linear-gradient(115deg, transparent 30%, rgba(0,255,163,0.18) 42%, rgba(34,200,232,0.2) 50%, rgba(227,179,65,0.18) 58%, transparent 70%)",
            backgroundSize: "100% 100%, 220% 220%",
            backgroundPosition: "0 0, var(--px,30%) var(--py,20%)",
          }}
        />
      </div>
      <p className="mono mt-4 text-center text-[0.66rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">Illustration of a sponsored pool. Not a real sponsor or prize.</p>
    </figure>
  );
}
