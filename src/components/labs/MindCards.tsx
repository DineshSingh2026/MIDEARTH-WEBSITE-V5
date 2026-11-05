"use client";
import { useEffect, useRef, useState } from "react";
import { Mascot, type MascotKind } from "@/components/brand/Mascot";
import { HOME } from "@/content/copy/home";
import { Outline } from "./Blueprint";

/** One detail sheet per mind: outline draws, body resolves, inputs enter left, outputs leave right. */
const IO: Record<MascotKind, { inp: string[]; out: string[]; tone: string }> = {
  exec: { inp: ["reports ↑", "from PLAY · TRACK · FUNDS"], out: ["commands ↓", "play · train · move money"], tone: "var(--signal)" },
  play: { inp: ["obs_0", "[5, 40, 40]"], out: ["continuous_actions", "[3]"], tone: "var(--agent)" },
  track: { inp: ["match results", "wins · losses · score"], out: ["reports ↑", "performance, to EXEC"], tone: "var(--agent)" },
  funds: { inp: ["deposits", "USDC · USDT · SOL · IDLEMINE"], out: ["swaps · withdrawal", "requests, IDLE ⇄ USDC/SOL"], tone: "var(--value)" },
};

function Sheet({ kind, i }: { kind: MascotKind; i: number }) {
  const io = IO[kind];
  const d = 0.3 + i * 0.35;
  return (
    <svg viewBox="0 0 360 200" className="block h-auto w-full" aria-hidden>
      <defs>
        <pattern id={`ms-g-${kind}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="var(--agent)" strokeOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="360" height="200" fill={`url(#ms-g-${kind})`} />
      {/* centre lines */}
      <path d="M180 14V186M14 100H346" stroke="var(--agent)" strokeOpacity="0.2" strokeDasharray="10 4 2 4" fill="none" />
      {/* io arrows */}
      <g fill="none" stroke={io.tone} strokeWidth="1.2">
        <path className="bp-draw" pathLength={1} d="M20 100H112" style={{ ["--d" as string]: `${d + 1.4}s`, ["--dur" as string]: "0.8s" }} />
        <path className="bp-draw" pathLength={1} d="M248 100H340" style={{ ["--d" as string]: `${d + 1.8}s`, ["--dur" as string]: "0.8s" }} />
      </g>
      <path className="bp-fade" d="M112 100l-8 -4v8zM340 100l-8 -4v8z" fill={io.tone} style={{ ["--d" as string]: `${d + 2.2}s` }} />
      <g className="bp-fade" fontFamily="var(--font-mono)" style={{ ["--d" as string]: `${d + 1.6}s` }}>
        <text x="20" y="86" fontSize="10" fill="var(--paper)" letterSpacing="0.6">{io.inp[0]}</text>
        <text x="20" y="120" fontSize="8.5" fill="var(--paper-dim)">{io.inp[1]}</text>
      </g>
      <g className="bp-fade" fontFamily="var(--font-mono)" textAnchor="end" style={{ ["--d" as string]: `${d + 2}s` }}>
        <text x="340" y="86" fontSize="10" fill="var(--paper)" letterSpacing="0.6">{io.out[0]}</text>
        <text x="340" y="120" fontSize="8.5" fill="var(--paper-dim)">{io.out[1]}</text>
      </g>
      {/* body */}
      <rect className="bp-draw" pathLength={1} x="120" y="54" width="120" height="92" fill="none" stroke="var(--agent)" strokeOpacity="0.3" style={{ ["--d" as string]: `${d}s` }} />
      <g transform="translate(132 60) scale(0.8)" fill="none" stroke="var(--agent)" strokeWidth="2">
        <Outline kind={kind} d={d + 0.2} />
      </g>
      <g transform="translate(132 60)" className="bp-fade" style={{ ["--d" as string]: `${d + 1.4}s` }}>
        <Mascot kind={kind} size={80} />
      </g>
      {/* width dimension */}
      <g className="bp-fade" style={{ ["--d" as string]: `${d + 2.3}s` }} stroke="var(--paper-dim)" fill="none">
        <path d="M132 160V172M228 160V172M132 166H228" />
      </g>
      <text className="bp-fade" x="180" y="186" textAnchor="middle" fontSize="8.5" fill="var(--paper-dim)" fontFamily="var(--font-mono)" letterSpacing="1.5" style={{ ["--d" as string]: `${d + 2.4}s` }}>
        ONE JOB
      </text>
      {/* corner registration */}
      {[[14, 14], [346, 14], [14, 186], [346, 186]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`} stroke="var(--agent)" strokeOpacity="0.6" />
      ))}
    </svg>
  );
}

export function MindCards() {
  const ref = useRef<HTMLUListElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul ref={ref} data-on={on ? "" : undefined} className="bp grid grid-cols-1 border-l border-t border-[var(--rule)] md:grid-cols-2">
      {HOME.minds.nodes.map((n, i) => (
        <li key={n.key} className={`group relative border-b border-r border-[var(--rule)] p-5 md:p-8 ${i === 0 ? "md:col-span-2" : ""}`}>
          <div className={`grid gap-6 ${i === 0 ? "md:grid-cols-2 md:items-center" : ""}`}>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="mono text-[0.7rem] tracking-[0.16em] text-[var(--paper-dim)]">
                  PART {String(i + 1).padStart(2, "0")} / 04 {i === 0 ? "· COMMAND" : "· REPORTS TO EXEC"}
                </span>
              </div>
              <h3 className="display mt-3 text-[clamp(2.2rem,4vw,3.6rem)] transition-[font-variation-settings] duration-700 ease-[var(--ease-expo)] group-hover:[font-variation-settings:'wdth'_120,'wght'_780]" style={{ fontVariationSettings: '"wdth" 90, "wght" 720' }}>
                {n.code}
              </h3>
              <p className="mono mt-1 text-[0.78rem] uppercase tracking-[0.14em] text-[var(--agent)]">{n.name}</p>
              <p className="mt-4 max-w-[44ch] text-[var(--paper-dim)]">{n.body}</p>
            </div>
            <div className="border border-[var(--rule)] bg-[var(--deck)]">
              <Sheet kind={n.key as MascotKind} i={i} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
