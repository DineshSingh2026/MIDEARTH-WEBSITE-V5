"use client";
import { useEffect, useMemo, useRef } from "react";
import { createTerritory, type TerritorySim } from "@/sim/territory";
import { mulberry32 } from "@/sim/rng";
import { useUI } from "@/store/ui";
import { FACTS } from "@/content/facts";
import { SimHud, SIM_LABELS, type HudHandle } from "./SimHud";
import { clock, fit, glowSprite, hexToRgb, rgba, supportsCanvasFilter, useSimCanvas, type FrameInfo, type SimTheme } from "./canvasKit";

export type TerritoryCanvasProps = {
  seed?: number;
  agents?: number;
  /** 3× speed: a 90s match plays in 30s, labelled "ACCELERATED ×3" in the HUD */
  accelerated?: boolean;
  paused?: boolean;
  /** frost overlay; the simulation eases to a halt */
  frozen?: boolean;
  hud?: boolean;
  className?: string;
  /** called after every rendered frame in which the sim advanced */
  onFrame?: (sim: TerritorySim) => void;
  /** called once with the (stable, mutated-in-place) sim instance — hand it to <TensorView sim={…}/> */
  onReady?: (sim: TerritorySim) => void;
  colors?: string[];
  /** optional HUD names per agent id (e.g. masked live names); default "AGENT 01" */
  labels?: string[];
  /** seconds pre-simulated before the first live frame (default 4) */
  warmSec?: number;
};

const TRAIL = 16; // ticks of light-painting per agent
const STATIC_WARM_SEC = 52;

export default function TerritoryCanvas({
  seed = 7,
  agents = 12,
  accelerated = false,
  paused = false,
  frozen = false,
  hud = true,
  className = "",
  onFrame,
  onReady,
  colors,
  labels,
  warmSec = 4,
}: TerritoryCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HudHandle>(null);
  const motion = useUI((s) => s.motion);
  const colorKey = colors?.join(",") ?? "";

  const sim = useMemo(() => createTerritory({ seed, agents }), [seed, agents]);
  useEffect(() => {
    if (colors?.length) sim.setColors(colors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, colorKey]);

  const cbs = useRef({ onFrame, onReady, frozen, accelerated, motion, labels });
  cbs.current = { onFrame, onReady, frozen, accelerated, motion, labels };

  // renderer-side state (never touches sim rules)
  const R = useMemo(() => {
    const N = sim.w * sim.h;
    const n = sim.agents.length;
    const r = {
      N,
      px: new Float32Array(n),
      py: new Float32Array(n),
      trail: new Float32Array(n * TRAIL * 2),
      trailHead: 0,
      flash: new Float32Array(N),
      frost: new Float32Array(N),
      lastOwner: new Int16Array(N).fill(-1),
      acc: 0,
      freeze: 0,
      endHold: 0,
      round: 0,
      lastTick: -1,
      own: null as HTMLCanvasElement | null,
      ownData: null as ImageData | null,
      bloom: null as HTMLCanvasElement | null,
      grid: null as HTMLCanvasElement | null,
      gridKey: "",
      cracks: [] as number[][],
    };
    // seeded crystalline crack branches for the frost overlay (unit space)
    const rnd = mulberry32(seed * 31 + 5);
    for (let i = 0; i < 26; i++) {
      const side = i % 4;
      let x = side === 0 ? rnd() : side === 1 ? 1 : side === 2 ? rnd() : 0;
      let y = side === 0 ? 0 : side === 1 ? rnd() : side === 2 ? 1 : rnd();
      const pts = [x, y];
      let ang = Math.atan2(0.5 - y, 0.5 - x) + (rnd() - 0.5) * 1.2;
      const segs = 4 + ((rnd() * 4) | 0);
      for (let k = 0; k < segs; k++) {
        const len = 0.025 + rnd() * 0.05;
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len;
        pts.push(x, y);
        ang += (rnd() - 0.5) * 1.1;
      }
      r.cracks.push(pts);
    }
    return r;
  }, [sim, seed]);

  const snapTrails = () => {
    sim.agents.forEach((a, i) => {
      R.px[i] = a.x;
      R.py[i] = a.y;
      for (let k = 0; k < TRAIL; k++) {
        R.trail[(i * TRAIL + k) * 2] = a.x;
        R.trail[(i * TRAIL + k) * 2 + 1] = a.y;
      }
    });
    R.lastOwner.set(sim.owner);
  };

  useEffect(() => {
    if (warmSec > 0 && sim.tick === 0) {
      const t = Math.round(warmSec * 20);
      for (let i = 0; i < t; i++) sim.step();
    }
    snapTrails();
    cbs.current.onReady?.(sim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  function tickOnce() {
    sim.agents.forEach((a, i) => {
      R.px[i] = a.x;
      R.py[i] = a.y;
    });
    sim.step();
    const { owner, frozen: fz } = sim;
    for (let i = 0; i < R.N; i++) {
      if (owner[i] !== R.lastOwner[i]) {
        R.flash[i] = 1;
        R.lastOwner[i] = owner[i];
      }
      if (fz[i]) R.frost[i] = 1;
    }
    R.trailHead = (R.trailHead + 1) % TRAIL;
    sim.agents.forEach((a, i) => {
      R.trail[(i * TRAIL + R.trailHead) * 2] = a.x;
      R.trail[(i * TRAIL + R.trailHead) * 2 + 1] = a.y;
    });
  }

  function buildGrid(f: FrameInfo, cell: number, ox: number, oy: number) {
    const { W, H, dpr, theme } = f;
    const key = `${W}x${H}@${dpr}${theme.rule}${theme.paper}`;
    if (R.grid && R.gridKey === key) return R.grid;
    const c = R.grid ?? document.createElement("canvas");
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const hair = 1 / dpr;
    // faint continuation of the 40×40 lattice to the edges (full-bleed)
    g.strokeStyle = rgba(theme.paper, theme.light ? 0.05 : 0.035);
    g.lineWidth = hair;
    g.beginPath();
    if (cell > 0.5) for (let x = ox % cell; x <= W; x += cell) { g.moveTo(Math.round(x * dpr) / dpr + hair / 2, 0); g.lineTo(Math.round(x * dpr) / dpr + hair / 2, H); }
    if (cell > 0.5) for (let y = oy % cell; y <= H; y += cell) { g.moveTo(0, Math.round(y * dpr) / dpr + hair / 2); g.lineTo(W, Math.round(y * dpr) / dpr + hair / 2); }
    g.stroke();
    // arena hairlines
    g.strokeStyle = rgba(theme.paper, theme.light ? 0.13 : 0.075);
    g.beginPath();
    for (let i = 0; i <= sim.w; i++) {
      const x = Math.round((ox + i * cell) * dpr) / dpr + hair / 2;
      g.moveTo(x, oy); g.lineTo(x, oy + sim.h * cell);
    }
    for (let j = 0; j <= sim.h; j++) {
      const y = Math.round((oy + j * cell) * dpr) / dpr + hair / 2;
      g.moveTo(ox, y); g.lineTo(ox + sim.w * cell, y);
    }
    g.stroke();
    // every 10th line slightly stronger + frame
    g.strokeStyle = rgba(theme.paper, theme.light ? 0.26 : 0.16);
    g.beginPath();
    for (let i = 0; i <= sim.w; i += 10) { g.moveTo(ox + i * cell, oy); g.lineTo(ox + i * cell, oy + sim.h * cell); }
    for (let j = 0; j <= sim.h; j += 10) { g.moveTo(ox, oy + j * cell); g.lineTo(ox + sim.w * cell, oy + j * cell); }
    g.stroke();
    // registration corners + coordinate ticks
    const L = Math.max(10, cell * 1.2);
    g.strokeStyle = rgba(theme.paper, 0.6);
    g.lineWidth = 1;
    const corners: [number, number, number, number][] = [
      [ox, oy, 1, 1],
      [ox + sim.w * cell, oy, -1, 1],
      [ox, oy + sim.h * cell, 1, -1],
      [ox + sim.w * cell, oy + sim.h * cell, -1, -1],
    ];
    g.beginPath();
    for (const [x, y, sx, sy] of corners) {
      g.moveTo(x - sx * 6, y); g.lineTo(x + sx * L, y);
      g.moveTo(x, y - sy * 6); g.lineTo(x, y + sy * L);
    }
    g.stroke();
    if (cell > 9) {
      g.fillStyle = rgba(theme.paperDim, 0.7);
      g.font = `${Math.max(8, Math.min(10, cell * 0.45))}px ui-monospace, "JetBrains Mono", monospace`;
      g.textBaseline = "bottom";
      for (let i = 0; i <= sim.w; i += 10) g.fillText(String(i).padStart(2, "0"), ox + i * cell + 3, oy - 3);
      g.textBaseline = "middle";
      g.textAlign = "right";
      for (let j = 10; j <= sim.h; j += 10) g.fillText(String(j).padStart(2, "0"), ox - 5, oy + j * cell);
    }
    R.grid = c;
    R.gridKey = key;
    return c;
  }

  function updateBloom(theme: SimTheme) {
    const { w, h, owner } = sim;
    const M = 4; // tiles of margin so the glow can spill past the arena edge
    if (!R.own) {
      R.own = document.createElement("canvas");
      R.own.width = w;
      R.own.height = h;
      R.ownData = R.own.getContext("2d")!.createImageData(w, h);
      R.bloom = document.createElement("canvas");
      R.bloom.width = (w + M * 2) * 4;
      R.bloom.height = (h + M * 2) * 4;
    }
    const d = R.ownData!.data;
    const fr = hexToRgb(theme.light ? theme.frost : "#ffffff");
    const cols = sim.agents.map((a) => hexToRgb(a.color));
    for (let i = 0; i < w * h; i++) {
      const o = owner[i];
      const p = i * 4;
      if (R.frost[i] > 0.05) {
        d[p] = fr[0];
        d[p + 1] = fr[1];
        d[p + 2] = fr[2];
        d[p + 3] = 255 * Math.min(1, R.frost[i]);
      } else if (o >= 0) {
        const c = cols[o];
        d[p] = c[0];
        d[p + 1] = c[1];
        d[p + 2] = c[2];
        d[p + 3] = 255 * (0.42 + R.flash[i] * 0.58);
      } else d[p + 3] = 0;
    }
    R.own.getContext("2d")!.putImageData(R.ownData!, 0, 0);
    const b = R.bloom!.getContext("2d")!;
    b.clearRect(0, 0, R.bloom!.width, R.bloom!.height);
    b.imageSmoothingEnabled = true;
    if (supportsCanvasFilter) b.filter = "blur(5px)";
    b.drawImage(R.own, M * 4, M * 4, w * 4, h * 4);
    if (supportsCanvasFilter) b.filter = "none";
  }

  const frame = (f: FrameInfo) => {
    const { ctx, W, H, dt, now, theme, live } = f;
    const { w, h } = sim;
    const c = cbs.current;

    // ── time ──
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
          R.round++;
          sim.reset(sim.seed + 1);
          R.flash.fill(0);
          R.frost.fill(0);
          R.endHold = 0;
          R.acc = 0;
          snapTrails();
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
      const decay = dt * Math.max(scale, 0.0001);
      for (let i = 0; i < R.N; i++) {
        if (R.flash[i] > 0) R.flash[i] = Math.max(0, R.flash[i] - decay * 1.4);
        if (R.frost[i] > 0) R.frost[i] = Math.max(0, R.frost[i] - decay * 1.1);
      }
    }
    const alpha = live && !sim.ended ? Math.min(1, R.acc) : 1;

    // ── layout ──
    const pad = W < 520 ? 14 : 34;
    const { cell, ox, oy } = fit(W, H, w, h, pad);
    if (!(cell > 0.5) || !Number.isFinite(cell)) return; // box not laid out yet — never loop on a zero cell
    const light = theme.light;
    const add: GlobalCompositeOperation = light ? "source-over" : "lighter";

    // 1. ground
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = theme.void;
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, rgba(theme.deck, light ? 0.0 : 0.9));
    vg.addColorStop(1, rgba(theme.void, 0));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(theme.deck, light ? 0.7 : 0.55);
    ctx.fillRect(ox, oy, w * cell, h * cell);

    // 2. bloom — low-res blurred ownership map, added as light
    updateBloom(theme);
    ctx.save();
    ctx.globalCompositeOperation = add;
    ctx.globalAlpha = light ? 0.32 : 0.62;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(R.bloom!, ox - 4 * cell, oy - 4 * cell, (w + 8) * cell, (h + 8) * cell);
    ctx.restore();

    // 3. crisp tiles, batched per owner
    const { owner, flip, flipBy } = sim;
    const g = Math.max(0.6, cell * 0.07);
    const paths = sim.agents.map(() => new Path2D());
    const flashP = new Path2D();
    let anyFlash = false;
    for (let i = 0; i < R.N; i++) {
      const o = owner[i];
      if (o < 0) continue;
      const x = ox + (i % w) * cell + g;
      const y = oy + ((i / w) | 0) * cell + g;
      paths[o].rect(x, y, cell - 2 * g, cell - 2 * g);
      if (R.flash[i] > 0.04) {
        flashP.rect(x, y, cell - 2 * g, cell - 2 * g);
        anyFlash = true;
      }
    }
    sim.agents.forEach((a, i) => {
      ctx.fillStyle = rgba(a.color, light ? 0.34 : 0.24);
      ctx.fill(paths[i]);
    });
    if (anyFlash) {
      // claim flash: per-tile white-hot core that cools into the owner colour
      ctx.save();
      ctx.globalCompositeOperation = add;
      for (let i = 0; i < R.N; i++) {
        const fl = R.flash[i];
        if (fl <= 0.04 || owner[i] < 0) continue;
        const x = ox + (i % w) * cell + g;
        const y = oy + ((i / w) | 0) * cell + g;
        ctx.fillStyle = light ? rgba(sim.agents[owner[i]].color, fl * 0.5) : rgba("#ffffff", fl * fl * 0.55);
        ctx.fillRect(x, y, cell - 2 * g, cell - 2 * g);
      }
      ctx.restore();
    }

    // 4. hairline lattice
    ctx.drawImage(buildGrid(f, cell, ox, oy), 0, 0, W, H);

    // 5. frozen tiles — crystalline hatch with shimmer
    const frostC = light ? theme.frost : "#ffffff";
    for (let i = 0; i < R.N; i++) {
      const fv = R.frost[i];
      if (fv <= 0.02) continue;
      const tx = ox + (i % w) * cell;
      const ty = oy + ((i / w) | 0) * cell;
      const sh = 0.55 + 0.45 * Math.sin(now * 7 + i * 1.7);
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx, ty, cell, cell);
      ctx.clip();
      ctx.fillStyle = rgba(frostC, 0.12 * fv);
      ctx.fillRect(tx, ty, cell, cell);
      ctx.strokeStyle = rgba(frostC, 0.75 * fv * sh);
      ctx.lineWidth = Math.max(0.6, cell * 0.04);
      ctx.beginPath();
      const step = cell / 4;
      for (let k = -cell; k <= cell; k += step) {
        ctx.moveTo(tx + k, ty + cell);
        ctx.lineTo(tx + k + cell, ty);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba(frostC, 0.9 * fv);
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, cell - 1, cell - 1);
      // sparkle
      const cx = tx + cell / 2,
        cy = ty + cell / 2,
        s = cell * (0.35 + 0.25 * sh) * fv;
      ctx.save();
      ctx.globalCompositeOperation = add;
      ctx.strokeStyle = rgba(frostC, fv * sh);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
      ctx.moveTo(cx - s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
      ctx.moveTo(cx + s * 0.4, cy - s * 0.4); ctx.lineTo(cx - s * 0.4, cy + s * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    // 6. flip rings — track, progress arc, quadrant ticks, leading bead, corner brackets
    for (let i = 0; i < R.N; i++) {
      const by = flipBy[i];
      if (by < 0 || flip[i] <= 0) continue;
      const col = sim.agents[by].color;
      const p = flip[i];
      const tx = ox + (i % w) * cell;
      const ty = oy + ((i / w) | 0) * cell;
      const cx = tx + cell / 2,
        cy = ty + cell / 2;
      const r = Math.max(4, cell * 0.62);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(theme.paper, 0.22);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2 - Math.PI / 2;
        ctx.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2));
        ctx.lineTo(cx + Math.cos(a) * (r + 2 + Math.max(2, cell * 0.18)), cy + Math.sin(a) * (r + 2 + Math.max(2, cell * 0.18)));
      }
      ctx.stroke();
      const a1 = -Math.PI / 2 + p * Math.PI * 2;
      ctx.save();
      ctx.globalCompositeOperation = add;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, cell * 0.11);
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, a1);
      ctx.stroke();
      const bx = cx + Math.cos(a1) * r,
        bY = cy + Math.sin(a1) * r;
      const gs = cell * 1.3;
      ctx.drawImage(glowSprite(col, light), bx - gs / 2, bY - gs / 2, gs, gs);
      ctx.restore();
      // corner brackets
      const L = cell * 0.26;
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty + L); ctx.lineTo(tx, ty); ctx.lineTo(tx + L, ty);
      ctx.moveTo(tx + cell - L, ty); ctx.lineTo(tx + cell, ty); ctx.lineTo(tx + cell, ty + L);
      ctx.moveTo(tx + cell, ty + cell - L); ctx.lineTo(tx + cell, ty + cell); ctx.lineTo(tx + cell - L, ty + cell);
      ctx.moveTo(tx + L, ty + cell); ctx.lineTo(tx, ty + cell); ctx.lineTo(tx, ty + cell - L);
      ctx.stroke();
    }

    // 7. light-painted trails
    ctx.save();
    ctx.globalCompositeOperation = add;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    sim.agents.forEach((a, ai) => {
      const hx = R.px[ai] + (a.x - R.px[ai]) * alpha;
      const hy = R.py[ai] + (a.y - R.py[ai]) * alpha;
      let lx = ox + hx * cell,
        ly = oy + hy * cell;
      for (let k = 0; k < TRAIL - 1; k++) {
        const idx = (R.trailHead - k + TRAIL) % TRAIL;
        const x = ox + R.trail[(ai * TRAIL + idx) * 2] * cell;
        const y = oy + R.trail[(ai * TRAIL + idx) * 2 + 1] * cell;
        const t = 1 - k / (TRAIL - 1);
        ctx.strokeStyle = rgba(a.color, (light ? 0.35 : 0.16) * t);
        ctx.lineWidth = cell * 0.55 * t + 0.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.strokeStyle = light ? rgba(a.color, 0.9 * t) : rgba(a.color, 0.85 * t * t);
        ctx.lineWidth = Math.max(0.8, cell * 0.12 * t);
        ctx.stroke();
        lx = x;
        ly = y;
      }
    });
    ctx.restore();

    // 8. agents — glow sprite, hot core, heading tick (action vector)
    sim.agents.forEach((a, ai) => {
      const x = ox + (R.px[ai] + (a.x - R.px[ai]) * alpha) * cell;
      const y = oy + (R.py[ai] + (a.y - R.py[ai]) * alpha) * cell;
      const gs = cell * (light ? 3 : 4.2);
      ctx.save();
      ctx.globalCompositeOperation = add;
      ctx.drawImage(glowSprite(a.color, light), x - gs / 2, y - gs / 2, gs, gs);
      ctx.restore();
      ctx.fillStyle = light ? a.color : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.6, cell * 0.17), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = light ? rgba(theme.paper, 0.8) : rgba(a.color, 0.95);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, cell * 0.36), 0, Math.PI * 2);
      ctx.stroke();
      const m = Math.hypot(a.action[0], a.action[1]);
      if (m > 0.05) {
        const ux = a.action[0] / m,
          uy = a.action[1] / m;
        const r0 = Math.max(3, cell * 0.36),
          r1 = r0 + cell * 0.5 * Math.min(1, m);
        ctx.beginPath();
        ctx.moveTo(x + ux * r0, y + uy * r0);
        ctx.lineTo(x + ux * r1, y + uy * r1);
        ctx.stroke();
      }
    });

    // 9. freeze overlay — frost creeps in from the edges as crystalline branches
    if (R.freeze > 0.005) {
      const fz = R.freeze;
      const fc = theme.frost;
      ctx.save();
      ctx.fillStyle = rgba(fc, (light ? 0.1 : 0.07) * fz);
      ctx.fillRect(0, 0, W, H);
      const eg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      eg.addColorStop(0, rgba(fc, 0));
      eg.addColorStop(1, rgba(fc, 0.32 * fz));
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = rgba(light ? fc : "#ffffff", 0.55 * fz);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pts of R.cracks) {
        const segs = (pts.length / 2 - 1) * fz;
        ctx.moveTo(pts[0] * W, pts[1] * H);
        for (let k = 1; k <= segs; k++) ctx.lineTo(pts[k * 2] * W, pts[k * 2 + 1] * H);
        // short side spurs = crystal feathering
        for (let k = 1; k <= segs; k += 2) {
          const x = pts[k * 2] * W,
            y = pts[k * 2 + 1] * H;
          ctx.moveTo(x, y);
          ctx.lineTo(x + 7 * fz, y - 5 * fz);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // HUD
    if (hud && hudRef.current && (advanced || R.lastTick !== sim.tick || !live)) {
      R.lastTick = sim.tick;
      const N = R.N;
      const line = `${SIM_LABELS.match} ${clock(sim.timeSec)} / ${sim.matchSec}s · ${SIM_LABELS.tick} ${sim.tick} · ${SIM_LABELS.tiles} ${sim.claimed}/${N}`;
      const lab = c.labels;
      const rows = sim
        .ranking()
        .slice(0, 5)
        .map((r) => ({ color: r.color, label: lab?.[r.id] ?? `${SIM_LABELS.agent} ${String(r.id + 1).padStart(2, "0")}`, value: r.tiles }));
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
      if (sim.tick < STATIC_WARM_SEC * 20 && !sim.ended) {
        while (sim.tick < STATIC_WARM_SEC * 20 && !sim.ended) tickOnce();
        R.flash.fill(0);
      }
    },
  });

  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 block" />
      {hud && <SimHud ref={hudRef} accelerated={accelerated} />}
      <p className="sr-only">
        Simulated Territory Control match on a {FACTS.grid.w} by {FACTS.grid.h} grid with {agents} bot agents
        {accelerated ? ", playing at three times speed" : ""}. Agents claim neutral tiles by walking onto them, flip enemy tiles by holding them for about a second, and freeze any tile two agents contest in the same tick.
      </p>
    </div>
  );
}
