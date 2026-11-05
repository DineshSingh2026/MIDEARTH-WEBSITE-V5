"use client";
/**
 * Flywheel — the four network-effect steps as a calm 8s loop.
 * A value pulse travels the ring; the step it reaches lights up in the list. Reduced motion → static ring, all steps shown.
 */
import { useEffect, useRef, useState } from "react";
import { FLYWHEEL } from "@/content/site";
import { useUI } from "@/store/ui";
import { useInView } from "@/components/v2/kit";
import { Logo } from "@/components/brand/Logo";

const STEPS = FLYWHEEL.steps;
const N = STEPS.length;
const LOOP = 8000;
const C = 200; // svg centre
const R = 150;
const ang = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2;
const pt = (a: number, r = R) => ({ x: C + Math.cos(a) * r, y: C + Math.sin(a) * r });

export default function Flywheel({ className = "" }: { className?: string }) {
  const motion = useUI((s) => s.motion);
  const { ref, inView } = useInView<HTMLDivElement>();
  const dot = useRef<SVGCircleElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const [active, setActive] = useState(0);
  const running = motion && inView;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const t0 = performance.now();
    let last = -1;
    const tick = (t: number) => {
      const f = ((t - t0) % LOOP) / LOOP;
      const a = -Math.PI / 2 + f * Math.PI * 2;
      const p = pt(a);
      dot.current?.setAttribute("cx", String(p.x));
      dot.current?.setAttribute("cy", String(p.y));
      // short trail arc behind the dot
      const a0 = a - 0.55;
      const q = pt(a0);
      trail.current?.setAttribute("d", `M${q.x},${q.y} A${R},${R} 0 0 1 ${p.x},${p.y}`);
      const step = Math.floor((f * N + 0.02) % N);
      if (step !== last) {
        last = step;
        setActive(step);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const lit = (i: number) => !motion || i === active;

  return (
    <div ref={ref} className={`grid items-center gap-10 lg:grid-cols-12 ${className}`}>
      <div className="mx-auto w-full max-w-[420px] lg:col-span-5">
        <svg viewBox="0 0 400 400" className="h-auto w-full" role="img" aria-label={`Flywheel: ${STEPS.map((s) => `${s.label} ${s.body}`).join(", then ")}, which brings more participation.`}>
          <defs>
            <marker id="fw-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" fill="var(--rule-strong)" />
            </marker>
          </defs>
          <circle cx={C} cy={C} r={R + 34} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
          {/* ring segments with direction arrows */}
          {STEPS.map((_, i) => {
            const a = pt(ang(i) + 0.26);
            const b = pt(ang(i + 1) - 0.26);
            return <path key={i} d={`M${a.x},${a.y} A${R},${R} 0 0 1 ${b.x},${b.y}`} fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" markerEnd="url(#fw-arrow)" />;
          })}
          {motion && (
            <>
              <path ref={trail} fill="none" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
              <circle ref={dot} r="6" fill="var(--signal)" cx={C} cy={C - R} />
            </>
          )}
          {STEPS.map((s, i) => {
            const p = pt(ang(i));
            const on = lit(i);
            return (
              <g key={s.label}>
                <circle cx={p.x} cy={p.y} r="22" fill={on ? "color-mix(in oklab, var(--signal) 16%, var(--deck))" : "var(--deck)"} stroke={on ? "var(--signal)" : "var(--rule-strong)"} strokeWidth="1.5" style={{ transition: "all .5s" }} />
                <text x={p.x} y={p.y + 5} textAnchor="middle" className="mono" fontSize="14.5" fill={on ? "var(--signal)" : "var(--paper-dim)"} style={{ transition: "fill .5s" }}>
                  {String(i + 1).padStart(2, "0")}
                </text>
              </g>
            );
          })}
          <foreignObject x={C - 70} y={C - 52} width="140" height="104">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Logo size={30} />
              <p className="mono mt-2 text-[12px] tracking-[0.16em] text-[var(--paper-dim)]">NETWORK</p>
              <p className="mono text-[12px] tracking-[0.16em] text-[var(--paper-dim)]">EFFECTS</p>
            </div>
          </foreignObject>
        </svg>
      </div>
      <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7">
        {STEPS.map((s, i) => {
          const on = lit(i);
          return (
            <li
              key={s.label}
              className="relative border-t pt-5 transition-colors duration-500"
              style={{ borderColor: on && motion ? "var(--signal)" : "var(--rule-strong)" }}
            >
              <p className="mono text-[0.72rem]" style={{ color: on ? "var(--signal)" : "var(--paper-dim)" }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-[1.1rem] font-semibold leading-snug">{s.label}</p>
              <p className="mt-1 text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{s.body}.</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
