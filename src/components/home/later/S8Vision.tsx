"use client";
import { useId, useState } from "react";
import { HOME } from "@/content/copy/home";
import { Btn, StatusTag } from "@/components/ui/primitives";
import { RegMark, Section, SectionHead, useMotionOK } from "./shared";
import VisionGlyph from "./VisionGlyph";
import { VISION_MODELS, VISION_MODEL_LABEL } from "./models";

const V = HOME.vision;
const N = V.nodes.length;
/** Arc space 1000 × 460: the planet's limb, nodes along an upper ellipse. */
const CX = 500,
  CY = 460,
  RX = 450,
  RY = 380;
const ANG = V.nodes.map((_, i) => Math.PI * (0.9 - (0.8 * i) / (N - 1)));
const pt = (a: number) => [CX + Math.cos(a) * RX, CY - Math.sin(a) * RY] as const;
const ARC = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`;
const tone = (s: string) => (s === "LIVE" ? "var(--signal)" : s === "EARLY" ? "var(--agent)" : "var(--paper-dim)");

export default function S8Vision() {
  const motion = useMotionOK();
  const uid = useId().replace(/:/g, "");
  const firstLive = Math.max(0, V.nodes.findIndex((n) => n.status === "LIVE"));
  const [active, setActive] = useState<number>(firstLive);
  const [hovering, setHovering] = useState(false);
  const cur = V.nodes[active];

  return (
    <Section n={8} labelledBy="s8-title" className="py-28 md:py-40">
      <div className="shell relative">
        <RegMark className="-top-10 right-4 hidden md:block" />
        <SectionHead id="s8-title" index={V.index} title={V.title} body={V.body} />

        {/* Orbit (lg+) */}
        <div className="relative mx-auto mt-20 hidden w-full max-w-[1180px] lg:block" onMouseLeave={() => setHovering(false)}>
          <div className="relative aspect-[1000/460] w-full">
            <svg viewBox="0 0 1000 460" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                <radialGradient id={`${uid}-pl`} cx="50%" cy="100%" r="70%">
                  <stop offset="0%" stopColor="var(--agent)" stopOpacity="0.14" />
                  <stop offset="60%" stopColor="var(--agent)" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="var(--agent)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d={`${ARC} Z`} fill={`url(#${uid}-pl)`} />
              <path id={`${uid}-arc`} d={ARC} fill="none" stroke="var(--rule-strong)" strokeWidth="1" />
              <path d={`M ${CX - RX * 0.82} ${CY} A ${RX * 0.82} ${RY * 0.8} 0 0 1 ${CX + RX * 0.82} ${CY}`} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
              <line x1="20" y1={CY} x2="980" y2={CY} stroke="var(--rule-strong)" />
              {V.nodes.map((n, i) => {
                const [x, y] = pt(ANG[i]);
                return <line key={n.name} x1={x} y1={y} x2={CX} y2={CY} stroke={tone(n.status)} strokeOpacity={i === active ? 0.5 : 0.07} style={{ transition: "stroke-opacity .5s" }} />;
              })}
              {motion && (
                <g>
                  <circle r="3" fill="var(--signal)" />
                  <circle r="9" fill="var(--signal)" opacity="0.15" />
                  <animateMotion dur="14s" repeatCount="indefinite">
                    <mpath href={`#${uid}-arc`} />
                  </animateMotion>
                </g>
              )}
            </svg>

            {V.nodes.map((n, i) => {
              const [x, y] = pt(ANG[i]);
              const on = i === active;
              return (
                <button
                  key={n.name}
                  type="button"
                  aria-pressed={on}
                  aria-describedby={on ? `${uid}-line` : undefined}
                  onMouseEnter={() => {
                    setActive(i);
                    setHovering(true);
                  }}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="group absolute flex -translate-x-1/2 -translate-y-[9px] flex-col items-center gap-2 text-center transition-opacity duration-500"
                  style={{ left: `${x / 10}%`, top: `${(y / 460) * 100}%`, opacity: hovering && !on ? 0.45 : 1 }}
                >
                  <span aria-hidden className="relative grid h-[18px] w-[18px] place-items-center">
                    <span className="absolute inset-0 rounded-full border transition-transform duration-500" style={{ borderColor: tone(n.status), transform: on ? "scale(1.5)" : "scale(1)" }} />
                    <span className={`h-[7px] w-[7px] rounded-full ${n.status === "LIVE" && motion ? "led" : ""}`} style={{ background: tone(n.status), color: tone(n.status) }} />
                  </span>
                  <span className="mono text-[0.6rem] tracking-[0.2em] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="display text-[1.05rem] xl:text-[1.25rem]" style={{ fontVariationSettings: on ? '"wdth" 110, "wght" 700' : '"wdth" 80, "wght" 600', transition: "font-variation-settings .7s var(--ease-expo)" }}>
                    {n.name}
                  </span>
                  <StatusTag status={n.status} />
                </button>
              );
            })}

            {/* readout at the planet's centre */}
            <div className="absolute bottom-[6%] left-1/2 w-[min(34rem,46%)] -translate-x-1/2 text-center" aria-live="polite">
              <p className="mono text-[0.66rem] tracking-[0.2em] text-[var(--paper-dim)]">
                {String(active + 1).padStart(2, "0")} / {String(N).padStart(2, "0")} · {cur.status}
              </p>
              <p id={`${uid}-line`} className="mt-3 text-[1.15rem] leading-snug text-[var(--paper)] xl:text-[1.3rem]">
                {cur.line}
              </p>
              <div className="mt-5 flex items-center justify-center gap-4 border-t border-[var(--rule-strong)] pt-4">
                <VisionGlyph key={active} name={cur.name} />
                <p className="text-left">
                  <span className="mono block text-[0.6rem] uppercase tracking-[0.2em] text-[var(--paper-dim)]">{VISION_MODEL_LABEL}</span>
                  <span className="mono mt-1 block text-[0.82rem] text-[var(--value)]">{VISION_MODELS[cur.name]}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stacked orbit (below lg) */}
        <ol className="relative mt-14 border-l border-[var(--rule-strong)] pl-6 lg:hidden">
          {V.nodes.map((n, i) => (
            <li key={n.name} className="relative py-4">
              <span aria-hidden className="absolute -left-[30px] top-[1.35rem] h-[9px] w-[9px] rounded-full" style={{ background: tone(n.status), boxShadow: "0 0 0 4px var(--void)" }} />
              <div className="flex flex-wrap items-center gap-3">
                <span className="mono text-[0.62rem] tracking-[0.2em] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="display text-[1.35rem]">{n.name}</span>
                <StatusTag status={n.status} />
              </div>
              <p className="mt-1.5 text-[0.95rem] text-[var(--paper-dim)]">{n.line}</p>
              <div className="mt-3 flex items-center gap-3">
                <VisionGlyph name={n.name} className="h-auto w-[56px] shrink-0" />
                <p className="mono text-[0.72rem] text-[var(--value)]">
                  <span className="sr-only">{VISION_MODEL_LABEL}: </span>
                  {VISION_MODELS[n.name]}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex lg:justify-center">
          <Btn href={V.link.href} variant="ghost">
            {V.link.label}
          </Btn>
        </div>
      </div>
    </Section>
  );
}
