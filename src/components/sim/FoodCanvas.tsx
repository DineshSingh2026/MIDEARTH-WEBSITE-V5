"use client";
import { useEffect, useMemo, useRef } from "react";
import { createFood, tokenRadius, TRAIL_LEN, type FoodBurst, type FoodSim } from "@/sim/food";
import { mulberry32 } from "@/sim/rng";
import { useUI } from "@/store/ui";
import { SimHud, SIM_LABELS, type HudHandle } from "./SimHud";
import { clock, fit, glowSprite, rgba, useSimCanvas, type FrameInfo } from "./canvasKit";

export type FoodCanvasProps = {
  seed?: number;
  agents?: number;
  accelerated?: boolean;
  paused?: boolean;
  frozen?: boolean;
  hud?: boolean;
  className?: string;
  onFrame?: (sim: FoodSim) => void;
  onReady?: (sim: FoodSim) => void;
  colors?: string[];
  labels?: string[];
  /** world size (default 60 × 36) */
  w?: number;
  h?: number;
  warmSec?: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string };
type Nova = { x: number; y: number; value: number; color: string; age: number };

const STATIC_WARM_SEC = 40;

export default function FoodCanvas({
  seed = 11,
  agents = 10,
  accelerated = false,
  paused = false,
  frozen = false,
  hud = true,
  className = "",
  onFrame,
  onReady,
  colors,
  labels,
  w = 60,
  h = 36,
  warmSec = 3,
}: FoodCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HudHandle>(null);
  const motion = useUI((s) => s.motion);
  const colorKey = colors?.join(",") ?? "";

  const sim = useMemo(() => createFood({ seed, agents, w, h }), [seed, agents, w, h]);
  useEffect(() => {
    if (colors?.length) sim.setColors(colors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, colorKey]);

  const cbs = useRef({ onFrame, onReady, frozen, accelerated, motion, labels });
  cbs.current = { onFrame, onReady, frozen, accelerated, motion, labels };

  const R = useMemo(
    () => ({
      px: new Float32Array(sim.agents.length),
      py: new Float32Array(sim.agents.length),
      sparks: [] as Spark[],
      novas: [] as Nova[],
      acc: 0,
      freeze: 0,
      endHold: 0,
      lastTick: -1,
      rnd: mulberry32(seed ^ 0x9e3779b9),
      live: false,
    }),
    [sim, seed],
  );

  useEffect(() => {
    const off = sim.onBurst((b: FoodBurst) => {
      if (!R.live) return;
      R.novas.push({ x: b.x, y: b.y, value: b.value, color: b.color, age: 0 });
      const k = 8 + b.value * 4;
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + R.rnd() * 0.5;
        const s = 2.5 + R.rnd() * (3 + b.value);
        const max = 0.35 + R.rnd() * 0.5;
        R.sparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max, color: i % 3 === 0 ? "#ffffff" : b.color });
      }
      if (R.sparks.length > 600) R.sparks.splice(0, R.sparks.length - 600);
    });
    if (warmSec > 0 && sim.tick === 0) for (let i = 0; i < warmSec * 20; i++) sim.step();
    snap();
    cbs.current.onReady?.(sim);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  function snap() {
    sim.agents.forEach((a, i) => {
      R.px[i] = a.x;
      R.py[i] = a.y;
    });
  }
  function tickOnce() {
    snap();
    sim.step();
  }

  const frame = (f: FrameInfo) => {
    const { ctx, W, H, dt, now, theme, live } = f;
    const c = cbs.current;
    R.live = live;
    const target = c.frozen ? 1 : 0;
    R.freeze = live && c.motion ? R.freeze + (target - R.freeze) * Math.min(1, dt * 1.6) : target;
    if (Math.abs(R.freeze - target) < 0.002) R.freeze = target;
    const ease = 1 - R.freeze;
    const scale = (c.accelerated ? 3 : 1) * ease * ease;
    let advanced = false;
    if (live) {
      if (sim.ended) {
        R.endHold += dt * ease;
        if (R.endHold > 2.6) {
          sim.reset(sim.seed + 1);
          R.endHold = 0;
          R.acc = 0;
          R.sparks.length = 0;
          R.novas.length = 0;
          snap();
          advanced = true;
        }
      } else {
        R.acc += dt * 20 * scale;
        let steps = 0;
        while (R.acc >= 1 && steps < 8 && !sim.ended) {
          tickOnce();
          R.acc -= 1;
          steps++;
          advanced = true;
        }
        if (steps === 8) R.acc = 0;
      }
    }
    const alpha = live && !sim.ended ? Math.min(1, R.acc) : 1;
    const sdt = dt * Math.max(scale, 0.0001);

    const pad = W < 520 ? 12 : 30;
    const { cell, ox, oy } = fit(W, H, sim.w, sim.h, pad);
    const light = theme.light;
    const add: GlobalCompositeOperation = light ? "source-over" : "lighter";
    const X = (x: number) => ox + x * cell;
    const Y = (y: number) => oy + y * cell;

    // ground
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = theme.void;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(theme.deck, light ? 0.7 : 0.6);
    ctx.fillRect(ox, oy, sim.w * cell, sim.h * cell);
    // continuous field: dot lattice every 2 units, crosses every 10
    ctx.fillStyle = rgba(theme.paper, light ? 0.18 : 0.1);
    const ds = Math.max(0.8, cell * 0.06);
    for (let x = 2; x < sim.w; x += 2) for (let y = 2; y < sim.h; y += 2) ctx.fillRect(X(x) - ds / 2, Y(y) - ds / 2, ds, ds);
    ctx.strokeStyle = rgba(theme.paper, light ? 0.3 : 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 10; x < sim.w; x += 10)
      for (let y = 10; y < sim.h; y += 10) {
        ctx.moveTo(X(x) - 4, Y(y)); ctx.lineTo(X(x) + 4, Y(y));
        ctx.moveTo(X(x), Y(y) - 4); ctx.lineTo(X(x), Y(y) + 4);
      }
    ctx.stroke();
    ctx.strokeStyle = rgba(theme.paper, light ? 0.22 : 0.12);
    ctx.strokeRect(ox + 0.5, oy + 0.5, sim.w * cell - 1, sim.h * cell - 1);
    const L = Math.max(10, cell * 1.6);
    ctx.strokeStyle = rgba(theme.paper, 0.6);
    ctx.beginPath();
    for (const [x, y, sx, sy] of [
      [ox, oy, 1, 1],
      [ox + sim.w * cell, oy, -1, 1],
      [ox, oy + sim.h * cell, 1, -1],
      [ox + sim.w * cell, oy + sim.h * cell, -1, -1],
    ]) {
      ctx.moveTo(x - sx * 6, y); ctx.lineTo(x + sx * L, y);
      ctx.moveTo(x, y - sy * 6); ctx.lineTo(x, y + sy * L);
    }
    ctx.stroke();

    // tokens — gold light, size + brightness = value
    const gold = theme.value;
    ctx.save();
    for (const tk of sim.tokens) {
      const age = (sim.tick - tk.born) / 20;
      const grow = Math.min(1, age * 3);
      const pulse = 0.85 + 0.15 * Math.sin(now * 3 + tk.id);
      const r = tokenRadius(tk.value) * cell * grow;
      const x = X(tk.x),
        y = Y(tk.y);
      ctx.globalCompositeOperation = add;
      const gs = r * (light ? 4 : 7 + tk.value) * pulse;
      ctx.globalAlpha = (light ? 0.6 : 0.35 + tk.value * 0.1) * grow;
      ctx.drawImage(glowSprite(gold, light), x - gs / 2, y - gs / 2, gs, gs);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      // diamond core
      ctx.fillStyle = tk.value >= 5 && !light ? "#fff6dc" : gold;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      ctx.fill();
      if (tk.value >= 3 && cell > 7) {
        ctx.strokeStyle = rgba(gold, 0.5 * grow);
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // light-painted trails
    ctx.save();
    ctx.globalCompositeOperation = add;
    ctx.lineCap = "round";
    sim.agents.forEach((a, ai) => {
      let lx = X(R.px[ai] + (a.x - R.px[ai]) * alpha),
        ly = Y(R.py[ai] + (a.y - R.py[ai]) * alpha);
      const n = Math.min(a.trailCount, TRAIL_LEN);
      for (let k = 1; k < n; k++) {
        const idx = (a.trailHead - k + TRAIL_LEN) % TRAIL_LEN;
        const x = X(a.trail[idx * 2]),
          y = Y(a.trail[idx * 2 + 1]);
        const t = 1 - k / TRAIL_LEN;
        ctx.strokeStyle = rgba(a.color, (light ? 0.3 : 0.14) * t);
        ctx.lineWidth = cell * 0.9 * t + 0.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.strokeStyle = rgba(a.color, (light ? 0.85 : 0.8) * t * t);
        ctx.lineWidth = Math.max(0.8, cell * 0.16 * t);
        ctx.stroke();
        lx = x;
        ly = y;
      }
    });
    ctx.restore();

    // supernovae: flash core, shock ring, sparks, +value
    ctx.save();
    ctx.globalCompositeOperation = add;
    for (let i = R.novas.length - 1; i >= 0; i--) {
      const nv = R.novas[i];
      nv.age += sdt;
      const T = 0.9;
      if (nv.age > T) {
        R.novas.splice(i, 1);
        continue;
      }
      const p = nv.age / T;
      const x = X(nv.x),
        y = Y(nv.y);
      const e = 1 - Math.pow(1 - p, 3);
      if (p < 0.35) {
        const fs = cell * (2 + nv.value) * (1 - p / 0.35) * 1.4;
        ctx.globalAlpha = 1 - p / 0.35;
        ctx.drawImage(glowSprite(light ? nv.color : "#ffffff", light), x - fs, y - fs, fs * 2, fs * 2);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = rgba(nv.color, (1 - p) * 0.9);
      ctx.lineWidth = Math.max(0.8, cell * 0.12 * (1 - p));
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.5 + e * (1.6 + nv.value * 0.45)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(light ? theme.paper : "#ffffff", (1 - p) * 0.4);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.3 + e * (2.4 + nv.value * 0.6)), 0, Math.PI * 2);
      ctx.stroke();
      if (cell > 6) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(light ? theme.paper : nv.color, 1 - p);
        ctx.font = `600 ${Math.max(9, cell * 0.75)}px ui-monospace, "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText(`+${nv.value}`, x, y - cell * (1 + e * 1.4));
        ctx.globalCompositeOperation = add;
      }
    }
    for (let i = R.sparks.length - 1; i >= 0; i--) {
      const s = R.sparks[i];
      s.life -= sdt;
      if (s.life <= 0) {
        R.sparks.splice(i, 1);
        continue;
      }
      const ox0 = s.x,
        oy0 = s.y;
      const drag = Math.pow(0.04, sdt);
      s.vx *= drag;
      s.vy *= drag;
      s.x += s.vx * sdt;
      s.y += s.vy * sdt;
      const t = s.life / s.max;
      ctx.strokeStyle = rgba(s.color, t);
      ctx.lineWidth = Math.max(0.7, cell * 0.08 * t);
      ctx.beginPath();
      ctx.moveTo(X(ox0) - s.vx * cell * 0.03, Y(oy0) - s.vy * cell * 0.03);
      ctx.lineTo(X(s.x), Y(s.y));
      ctx.stroke();
    }
    ctx.restore();

    // agents
    sim.agents.forEach((a, ai) => {
      const x = X(R.px[ai] + (a.x - R.px[ai]) * alpha);
      const y = Y(R.py[ai] + (a.y - R.py[ai]) * alpha);
      const gs = cell * (light ? 3.2 : 5);
      ctx.save();
      ctx.globalCompositeOperation = add;
      ctx.drawImage(glowSprite(a.color, light), x - gs / 2, y - gs / 2, gs, gs);
      ctx.restore();
      const r = sim.agentRadius * cell;
      ctx.strokeStyle = light ? rgba(theme.paper, 0.85) : rgba(a.color, 0.95);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = light ? a.color : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.6, r * 0.38), 0, Math.PI * 2);
      ctx.fill();
      const m = Math.hypot(a.action[0], a.action[1]);
      if (m > 0.05) {
        const ux = a.action[0] / m,
          uy = a.action[1] / m;
        ctx.beginPath();
        ctx.moveTo(x + ux * r, y + uy * r);
        ctx.lineTo(x + ux * (r + cell * 0.7 * Math.min(1, m)), y + uy * (r + cell * 0.7 * Math.min(1, m)));
        ctx.stroke();
      }
    });

    if (R.freeze > 0.005) {
      const fz = R.freeze;
      ctx.fillStyle = rgba(theme.frost, (light ? 0.1 : 0.07) * fz);
      ctx.fillRect(0, 0, W, H);
      const eg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      eg.addColorStop(0, rgba(theme.frost, 0));
      eg.addColorStop(1, rgba(theme.frost, 0.32 * fz));
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, W, H);
    }

    if (hud && hudRef.current && (advanced || R.lastTick !== sim.tick || !live)) {
      R.lastTick = sim.tick;
      const line = `${SIM_LABELS.match} ${clock(sim.timeSec)} / ${sim.matchSec}s · ${SIM_LABELS.tick} ${sim.tick} · ${SIM_LABELS.tokens} ${sim.collected} · ${SIM_LABELS.field} ${sim.tokens.length}`;
      const rows = sim
        .ranking()
        .slice(0, 5)
        .map((r) => ({ color: r.color, label: c.labels?.[r.id] ?? `${SIM_LABELS.agent} ${String(r.id + 1).padStart(2, "0")}`, value: r.score }));
      const badge = c.frozen ? SIM_LABELS.frozen : sim.ended ? SIM_LABELS.final : c.accelerated ? SIM_LABELS.accelerated : null;
      hudRef.current.set(line, rows, badge);
    }
    if (advanced) c.onFrame?.(sim);
  };

  useSimCanvas({
    wrap,
    canvas,
    running: motion && !paused,
    frame,
    onStatic: () => {
      while (sim.tick < STATIC_WARM_SEC * 20 && !sim.ended) tickOnce();
    },
  });

  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 block" />
      {hud && <SimHud ref={hudRef} accelerated={accelerated} />}
      <p className="sr-only">
        Simulated Food Collector match with {agents} bot agents on a continuous field{accelerated ? ", playing at three times speed" : ""}. Food tokens worth 1, 3 or 5 points spawn continuously; the first agent to touch a token takes it.
      </p>
    </div>
  );
}
