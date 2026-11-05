"use client";
import { useEffect, useMemo, useRef } from "react";
import { createSignal, SIGNAL_TRAIL, type SignalEvent } from "@/sim/signal";
import { AGENT_COLORS } from "@/sim/rng";
import { useUI } from "@/store/ui";
import { glowSprite, rgba, useSimCanvas, type FrameInfo, type SimTheme } from "./canvasKit";

export type SignalCanvasProps = {
  seed?: number;
  agents?: number;
  paused?: boolean;
  className?: string;
  /** small on canvas score strip (top left) */
  hud?: boolean;
};

type Pop = { x: number; y: number; id: number; age: number; kind: SignalEvent["kind"] };

const FPS_CAP = 30;
const STATIC_WARM_TICKS = 20 * 14;
const MAX_STEPS = 6;

/** colours from theme tokens; two fixed hues fill out six distinct agents */
const palette = (t: SimTheme) => [t.agent, t.value, t.hot, t.frost, AGENT_COLORS[4], AGENT_COLORS[5]];

/**
 * Signal preview: top down circular arena, a beacon on a procedural closed path, a capture radius, six agents.
 * Chasers follow, the camper waits further along the route, the blocker bumps rivals out of range.
 * Capped at 30fps; pauses offscreen (useSimCanvas IntersectionObserver) and when the tab is hidden; static under reduced motion.
 */
export default function SignalCanvas({ seed = 5, agents = 6, paused = false, className = "", hud = true }: SignalCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const motion = useUI((s) => s.motion);
  const sim = useMemo(() => createSignal({ seed, agents }), [seed, agents]);

  const R = useMemo(
    () => ({
      px: new Float32Array(sim.agents.length),
      py: new Float32Array(sim.agents.length),
      pbx: sim.bx,
      pby: sim.by,
      acc: 0,
      pend: 0,
      pops: [] as Pop[],
      live: false,
      path: null as Float32Array | null,
    }),
    [sim],
  );

  useEffect(() => {
    // closed path, sampled once per sim
    const N = 160;
    const p = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const [x, y] = sim.pathAt((i / N) * Math.PI * 2);
      p[i * 2] = x;
      p[i * 2 + 1] = y;
    }
    R.path = p;
    const off = sim.onEvent((e) => {
      if (!R.live) return;
      R.pops.push({ x: e.x, y: e.y, id: e.id, age: 0, kind: e.kind });
      if (R.pops.length > 40) R.pops.splice(0, R.pops.length - 40);
    });
    for (let i = 0; i < 20 * 3; i++) tickOnce();
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  function snap() {
    sim.agents.forEach((a, i) => {
      R.px[i] = a.x;
      R.py[i] = a.y;
    });
    R.pbx = sim.bx;
    R.pby = sim.by;
  }
  function tickOnce() {
    snap();
    sim.step();
  }

  const frame = (f: FrameInfo) => {
    const { ctx, W, H, now, theme, live } = f;
    if (W < 8 || H < 8) return;
    R.live = live;
    let dt = 0;
    if (live) {
      if (typeof document !== "undefined" && document.hidden) return;
      // 30fps cap: accumulate real time, skip rAF callbacks until a frame is due (canvas keeps the last image)
      R.pend += f.dt;
      if (R.pend < 1 / FPS_CAP - 0.004) return;
      dt = Math.min(0.1, R.pend);
      R.pend = 0;
      R.acc += dt * 20;
      let steps = 0;
      while (R.acc >= 1 && steps < MAX_STEPS) {
        tickOnce();
        R.acc -= 1;
        steps++;
      }
      if (steps === MAX_STEPS) R.acc = 0;
    }
    const alpha = live ? Math.min(1, Math.max(0, R.acc)) : 1;
    const light = theme.light;
    const add: GlobalCompositeOperation = light ? "source-over" : "lighter";
    const cols = palette(theme);

    // fit the circular arena (radius R world units) into the canvas
    const pad = W < 420 ? 10 : 22;
    const radPx = Math.max(1, Math.min(W, H) / 2 - pad);
    const s = radPx / sim.R;
    const cx = W / 2,
      cy = H / 2;
    const X = (x: number) => cx + x * s;
    const Y = (y: number) => cy + y * s;

    // ground
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.void;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(theme.deck, light ? 0.8 : 0.75);
    ctx.beginPath();
    ctx.arc(cx, cy, radPx, 0, Math.PI * 2);
    ctx.fill();
    // concentric rings + spokes
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      ctx.strokeStyle = rgba(theme.paper, k === 4 ? (light ? 0.35 : 0.24) : light ? 0.14 : 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, (radPx * k) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(theme.paper, light ? 0.1 : 0.05);
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * radPx * 0.25, cy + Math.sin(a) * radPx * 0.25);
      ctx.lineTo(cx + Math.cos(a) * radPx, cy + Math.sin(a) * radPx);
    }
    ctx.stroke();
    // outer tick marks
    ctx.strokeStyle = rgba(theme.paper, light ? 0.4 : 0.3);
    ctx.beginPath();
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const l = k % 6 === 0 ? 7 : 3;
      ctx.moveTo(cx + Math.cos(a) * radPx, cy + Math.sin(a) * radPx);
      ctx.lineTo(cx + Math.cos(a) * (radPx - l), cy + Math.sin(a) * (radPx - l));
    }
    ctx.stroke();

    // beacon route: faint closed path, brighter just ahead of the beacon
    const path = R.path;
    if (path && path.length >= 4) {
      const N = path.length / 2;
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = rgba(theme.signal, light ? 0.35 : 0.22);
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const j = i % N;
        if (i === 0) ctx.moveTo(X(path[0]), Y(path[1]));
        else ctx.lineTo(X(path[j * 2]), Y(path[j * 2 + 1]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const start = Math.floor((sim.phase / (Math.PI * 2)) * N);
      const span = Math.max(2, Math.floor(N * 0.16));
      ctx.lineWidth = Math.max(1, s * 0.12);
      for (let i = 0; i < span; i++) {
        const a = (start + i) % N,
          b = (start + i + 1) % N;
        ctx.strokeStyle = rgba(theme.signal, (light ? 0.7 : 0.55) * (1 - i / span));
        ctx.beginPath();
        ctx.moveTo(X(path[a * 2]), Y(path[a * 2 + 1]));
        ctx.lineTo(X(path[b * 2]), Y(path[b * 2 + 1]));
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // capture radius
    const bx = X(R.pbx + (sim.bx - R.pbx) * alpha),
      by = Y(R.pby + (sim.by - R.pby) * alpha);
    const contested = sim.inside >= 3;
    const crPx = sim.captureR * s;
    const zone = contested ? theme.hot : theme.signal;
    const pulse = 0.5 + 0.5 * Math.sin(now * (contested ? 7 : 3.5));
    ctx.fillStyle = rgba(zone, (light ? 0.1 : 0.08) + pulse * 0.04);
    ctx.beginPath();
    ctx.arc(bx, by, crPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(zone, light ? 0.75 : 0.6);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([Math.max(2, crPx * 0.12), Math.max(2, crPx * 0.08)]);
    ctx.lineDashOffset = -now * (contested ? 40 : 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    // expanding ping
    const ping = (now * (contested ? 1.4 : 0.7)) % 1;
    ctx.strokeStyle = rgba(zone, (1 - ping) * 0.35);
    ctx.beginPath();
    ctx.arc(bx, by, crPx * (0.2 + ping * 0.85), 0, Math.PI * 2);
    ctx.stroke();

    // trails
    ctx.save();
    ctx.globalCompositeOperation = add;
    ctx.lineCap = "round";
    sim.agents.forEach((a, i) => {
      const col = cols[i % cols.length];
      let lx = X(R.px[i] + (a.x - R.px[i]) * alpha),
        ly = Y(R.py[i] + (a.y - R.py[i]) * alpha);
      const n = Math.min(a.trailCount, SIGNAL_TRAIL);
      for (let k = 1; k < n; k++) {
        const idx = (a.trailHead - k + SIGNAL_TRAIL) % SIGNAL_TRAIL;
        const x = X(a.trail[idx * 2]),
          y = Y(a.trail[idx * 2 + 1]);
        const t = 1 - k / SIGNAL_TRAIL;
        ctx.strokeStyle = rgba(col, (light ? 0.55 : 0.5) * t * t);
        ctx.lineWidth = Math.max(0.8, s * 0.35 * t);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        lx = x;
        ly = y;
      }
    });
    ctx.restore();

    // camper's intercept mark (where it waits ahead on the route)
    const camper = sim.agents.find((a) => a.role === "camper");
    if (camper) {
      const [ix, iy] = sim.pathAt(camper.aim);
      const cxp = X(ix),
        cyp = Y(iy);
      const col = cols[camper.id % cols.length];
      const m = Math.max(4, s * 0.9);
      ctx.strokeStyle = rgba(col, light ? 0.7 : 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cxp - m, cyp); ctx.lineTo(cxp - m * 0.4, cyp);
      ctx.moveTo(cxp + m * 0.4, cyp); ctx.lineTo(cxp + m, cyp);
      ctx.moveTo(cxp, cyp - m); ctx.lineTo(cxp, cyp - m * 0.4);
      ctx.moveTo(cxp, cyp + m * 0.4); ctx.lineTo(cxp, cyp + m);
      ctx.stroke();
    }

    // beacon
    ctx.save();
    ctx.globalCompositeOperation = add;
    const gs = Math.max(18, s * (contested ? 7 : 5.5)) * (0.9 + pulse * 0.15);
    ctx.drawImage(glowSprite(theme.signal, light), bx - gs / 2, by - gs / 2, gs, gs);
    ctx.restore();
    ctx.fillStyle = light ? theme.signal : "#ffffff";
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(2.2, s * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.signal, 0.9);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    const spin = now * (1.2 * sim.speed);
    ctx.arc(bx, by, Math.max(4, s * 0.95), spin, spin + Math.PI * 1.2);
    ctx.stroke();

    // agents
    const ar = Math.max(2.5, sim.agentR * s);
    sim.agents.forEach((a, i) => {
      const col = cols[i % cols.length];
      const x = X(R.px[i] + (a.x - R.px[i]) * alpha),
        y = Y(R.py[i] + (a.y - R.py[i]) * alpha);
      ctx.save();
      ctx.globalCompositeOperation = add;
      const g = ar * (a.inRange ? 5 : 3.4);
      ctx.globalAlpha = a.inRange ? 1 : 0.7;
      ctx.drawImage(glowSprite(col, light), x - g / 2, y - g / 2, g, g);
      ctx.restore();
      if (a.inRange) {
        const p = (now * 2.2 + i * 0.37) % 1;
        ctx.strokeStyle = rgba(col, (1 - p) * 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, ar * (1.2 + p * 1.4), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = light ? rgba(theme.paper, 0.85) : rgba(col, 0.95);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (a.role === "blocker") ctx.rect(x - ar, y - ar, ar * 2, ar * 2);
      else ctx.arc(x, y, ar, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = light ? col : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.4, ar * 0.42), 0, Math.PI * 2);
      ctx.fill();
    });

    // pops: "+1" score ticks and bump shocks
    const fs = Math.max(9, Math.min(13, s * 0.75));
    ctx.font = `600 ${fs}px ui-monospace, "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    for (let i = R.pops.length - 1; i >= 0; i--) {
      const p = R.pops[i];
      p.age += dt;
      const T = p.kind === "bump" ? 0.55 : 0.9;
      if (p.age > T) {
        R.pops.splice(i, 1);
        continue;
      }
      const q = p.age / T;
      if (p.kind === "bump") {
        ctx.strokeStyle = rgba(theme.hot, (1 - q) * 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), ar * (0.6 + q * 3), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(light ? theme.paper : theme.value, 1 - q);
        ctx.fillText("+1", X(p.x), Y(p.y) - ar * 2 - q * s * 1.6);
      }
    }

    // tiny HUD: beacon speed + live score strip
    if (hud && W >= 220) {
      ctx.textAlign = "left";
      ctx.font = `500 10px ui-monospace, "JetBrains Mono", monospace`;
      ctx.fillStyle = rgba(theme.paper, 0.7);
      const tag = contested ? `BEACON ×${sim.speed.toFixed(1)} · CONTESTED` : `BEACON ×${sim.speed.toFixed(1)}`;
      ctx.fillText(tag, 12, H - 12);
      const ranked = [...sim.agents].sort((a, b) => b.score - a.score);
      const top = Math.max(1, ranked[0]?.score ?? 1);
      ranked.slice(0, 6).forEach((a, k) => {
        const yy = 14 + k * 9;
        ctx.fillStyle = rgba(theme.paper, 0.12);
        ctx.fillRect(12, yy, 52, 3);
        ctx.fillStyle = cols[a.id % cols.length];
        ctx.fillRect(12, yy, 52 * (a.score / top), 3);
      });
    }
  };

  useSimCanvas({
    wrap,
    canvas,
    running: motion && !paused,
    frame,
    onStatic: () => {
      while (sim.tick < STATIC_WARM_TICKS) tickOnce();
      snap();
    },
  });

  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 block" />
      <p className="sr-only">
        Simulated Signal match with {agents} bot agents in a circular arena. A beacon moves along a looping path; agents inside its capture radius score every tick, the beacon speeds up when three or more agents crowd it, one agent waits further along the route and another bumps rivals out of range.
      </p>
    </div>
  );
}
