"use client";
import { useEffect, useRef } from "react";
import type { TerritorySim } from "@/sim/territory";
import { OBS_CHANNELS } from "@/sim/territory";
import { HOME } from "@/content/copy/home";
import { useUI } from "@/store/ui";
import { hexToRgb, readTheme } from "./canvasKit";

/** Channel order of the 5-channel observation as produced by sim.observe(). */
export const OBS_CHANNEL_NAMES = ["own tiles", "enemy tiles", "neutral", "agent positions", "frozen / contested"] as const;
export const ACTION_NAMES = ["move_x", "move_z", "boost"] as const;
const CH_VARS = ["--signal", "--hot", "--paper-dim", "--agent", "--frost"] as const;

export type TensorViewProps = { sim: TerritorySim | null; agentId?: number; className?: string };

/**
 * "See what the agent sees": the observation tensor obs_0 · [5, 40, 40] as five stacked isometric layers,
 * plus the three continuous actions as live gauges. Reads the sim instance directly (no React re-render per tick).
 */
export default function TensorView({ sim, agentId = 0, className = "" }: TensorViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLCanvasElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const nums = useRef<(HTMLSpanElement | null)[]>([]);
  const motion = useUI((s) => s.motion);
  const mode = useUI((s) => s.mode);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const w = sim?.w ?? 40;
    const h = sim?.h ?? 40;
    const N = w * h;
    const buf = new Float32Array(OBS_CHANNELS * N);
    const theme = readTheme(root);
    const cols = CH_VARS.map((v) => hexToRgb(getComputedStyle(root).getPropertyValue(v).trim() || theme.paper));
    const ctxs = layers.current.map((c) => {
      if (!c) return null;
      c.width = w;
      c.height = h;
      return c.getContext("2d");
    });
    const imgs = ctxs.map((c) => c?.createImageData(w, h) ?? null);
    let visible = true;
    let raf = 0;
    let last = -1;
    let lastT = 0;

    const draw = () => {
      if (sim) sim.observe(agentId, buf);
      else buf.fill(0);
      for (let ch = 0; ch < OBS_CHANNELS; ch++) {
        const img = imgs[ch];
        const ctx = ctxs[ch];
        if (!img || !ctx) continue;
        const d = img.data;
        const [r, g, b] = cols[ch];
        const base = ch * N;
        for (let i = 0; i < N; i++) {
          const v = buf[base + i];
          const p = i * 4;
          d[p] = r;
          d[p + 1] = g;
          d[p + 2] = b;
          d[p + 3] = v > 0 ? 70 + v * 185 : 0;
        }
        ctx.putImageData(img, 0, 0);
      }
      const a = sim?.agents[agentId]?.action ?? [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const v = Math.max(-1, Math.min(1, a[k]));
        const bar = bars.current[k];
        if (bar) {
          bar.style.left = v < 0 ? `${50 + v * 50}%` : "50%";
          bar.style.width = `${Math.abs(v) * 50}%`;
        }
        const n = nums.current[k];
        if (n) n.textContent = `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
      }
    };
    const loop = (t: number) => {
      raf = 0;
      if (!visible || !motion) return;
      // ~20Hz quantised (matches the sim tick)
      if (t - lastT >= 50 && sim && sim.tick !== last) {
        lastT = t;
        last = sim.tick;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && motion && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(root);
    draw();
    if (motion) raf = requestAnimationFrame(loop);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [sim, agentId, motion, mode]);

  const C = HOME.core;
  const gap = "clamp(18px, 3.2vw, 34px)";

  return (
    <figure ref={rootRef} className={`grid gap-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-center ${className}`}>
      <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden style={{ perspective: "1600px" }}>
        <div
          className="absolute left-[14%] top-[30%] aspect-square w-[72%]"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(58deg) rotateZ(-45deg)" }}
        >
          {OBS_CHANNEL_NAMES.map((name, i) => (
            <div
              key={name}
              className="absolute inset-0 border"
              style={{
                transform: `translateZ(calc(${gap} * ${OBS_CHANNELS - 1 - i}))`,
                borderColor: `color-mix(in oklab, var(${CH_VARS[i]}) 55%, transparent)`,
                background: `color-mix(in oklab, var(--deck) 62%, transparent)`,
                backgroundImage:
                  "linear-gradient(to right, color-mix(in oklab, var(--paper) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--paper) 7%, transparent) 1px, transparent 1px)",
                backgroundSize: "calc(100% / 8) calc(100% / 8)",
              }}
            >
              <canvas
                ref={(el) => {
                  layers.current[i] = el;
                }}
                className="absolute inset-0 h-full w-full"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="mono absolute -bottom-5 left-0 text-[0.55rem] tracking-[0.14em]"
                style={{ color: `var(${CH_VARS[i]})` }}
              >
                {`[${i}]`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <figcaption className="grid gap-8">
        <div>
          <p className="mono text-[0.8rem] tracking-[0.08em] text-[var(--paper)]">{C.tensorObs}</p>
          <p className="eyebrow mt-1">{C.tensorObsHint}</p>
          <ol className="mt-4 grid gap-0 border-t border-[var(--rule)]">
            {OBS_CHANNEL_NAMES.map((name, i) => (
              <li key={name} className="mono flex items-center gap-3 border-b border-[var(--rule)] py-2 text-[0.72rem] tracking-[0.06em]">
                <span className="text-[var(--paper-dim)]">{String(i).padStart(2, "0")}</span>
                <i aria-hidden className="block h-2 w-2" style={{ background: `var(${CH_VARS[i]})` }} />
                <span>{name}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="mono text-[0.8rem] tracking-[0.08em] text-[var(--paper)]">{C.tensorAct}</p>
          <ul className="mt-4 grid gap-3">
            {ACTION_NAMES.map((name, k) => (
              <li key={name} className="mono grid grid-cols-[4.6em_1fr_3.6em] items-center gap-3 text-[0.72rem]">
                <span className="text-[var(--paper-dim)]">{name}</span>
                <span aria-hidden className="relative h-[6px] border border-[var(--rule-strong)]">
                  <i className="absolute inset-y-0 left-1/2 w-px bg-[var(--paper-dim)]" />
                  <span
                    ref={(el) => {
                      bars.current[k] = el;
                    }}
                    className="absolute inset-y-0 bg-[var(--agent)]"
                    style={{ left: "50%", width: 0, transition: motion ? "left 50ms steps(1), width 50ms steps(1)" : undefined }}
                  />
                </span>
                <span
                  ref={(el) => {
                    nums.current[k] = el;
                  }}
                  className="text-right tabular-nums"
                  aria-hidden
                >
                  +0.00
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[0.82rem] text-[var(--paper-dim)]">{C.caption}</p>
      </figcaption>
    </figure>
  );
}
