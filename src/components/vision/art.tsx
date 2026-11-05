"use client";
/**
 * /vision data-art. Each visual is a 2D canvas (aria-hidden) with a DOM caption as its text equivalent.
 * Motion runs only when on screen and motion is allowed; otherwise a composed static frame is drawn.
 * Colours are read from the live CSS tokens so the art works on void-black (Field) and paper (Stands).
 */
import { useEffect, useMemo, useRef } from "react";
import { useUI } from "@/store/ui";
import { arenaEvents, useArenaStore } from "@/lib/arena/client";
import { rgba, seeded, useInView, useMotionOK, useTokens } from "./kit";
import { VISION_UI } from "./data";

const TOK = ["paper", "paper-dim", "signal", "agent", "value", "hot", "rule", "rule-strong", "void"] as const;
type Tok = Record<(typeof TOK)[number], string>;

const frac = (x: number) => x - Math.floor(x);
const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

const tkv = (tk: Tok) => Object.values(tk).join(",");

function useArt() {
  const motion = useMotionOK();
  const light = useUI((s) => s.mode) === "stands";
  const tk = useTokens(TOK) as Tok;
  return { motion, light, tk };
}


/** Canvas loop sized to its box. Static frames are re-composed whenever `version` changes (tokens, data, mode). */
export function useArtCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void,
  { running, version }: { running: boolean; version: string },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const size = { w: 0, h: 0, dpr: 1 };
    const paint = (now: number, dt: number) => {
      if (!ctx || !size.w) return;
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      drawRef.current(ctx, size.w, size.h, now / 1000, dt);
    };
    const fit = () => {
      const r = c.getBoundingClientRect();
      size.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      size.w = r.width;
      size.h = r.height;
      c.width = Math.max(1, Math.round(r.width * size.dpr));
      c.height = Math.max(1, Math.round(r.height * size.dpr));
      if (!running) paint(performance.now(), 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(now, dt);
      raf = requestAnimationFrame(loop);
    };
    if (running) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [running, version]);
  return ref;
}

const MONO = (px: number) => `500 ${px}px var(--font-jetbrains), ui-monospace, monospace`;

/* ════════════════ 01 · MEGA CONTEXT POOLS — shared memory lattice ════════════════ */
export function ContextLattice({ className = "" }: { className?: string }) {
  const { motion, light, tk } = useArt();
  const [wrap, inView] = useInView<HTMLDivElement>("120px");
  const model = useMemo(() => {
    const r = seeded(7);
    const agents = Array.from({ length: 46 }, (_, i) => ({
      a: (i / 46) * Math.PI * 2 + (r() - 0.5) * 0.09,
      rad: 0.8 + r() * 0.2,
      period: 3.2 + r() * 4.5,
      phase: r() * 10,
    }));
    const cells: { x: number; y: number }[] = [];
    const s = 0.062;
    for (let row = -8; row <= 8; row++)
      for (let col = -8; col <= 8; col++) {
        const x = (col + (row & 1 ? 0.5 : 0)) * s;
        const y = row * s * 0.866;
        if (x * x + y * y < 0.33 * 0.33) cells.push({ x, y });
      }
    return { agents, cells, heat: new Float32Array(cells.length) };
  }, []);

  const ref = useArtCanvas(
    (ctx, w, h, now) => {
      const t = motion ? now : 7.3;
      const { agents, cells, heat } = model;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.46;
      heat.fill(0);
      const add = light ? "source-over" : "lighter";
      // structure rings
      ctx.lineWidth = 1;
      for (const k of [0.36, 0.62, 1.04]) {
        ctx.strokeStyle = rgba(tk["paper-dim"], k === 0.36 ? 0.5 : 0.18);
        ctx.setLineDash(k === 0.62 ? [2, 5] : []);
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // packets
      const rot = t * 0.018;
      const pos: { x: number; y: number; on: number }[] = [];
      ctx.globalCompositeOperation = add;
      agents.forEach((ag, i) => {
        const ang = ag.a + rot;
        const ax = cx + Math.cos(ang) * R * ag.rad;
        const ay = cy + Math.sin(ang) * R * ag.rad;
        const u = (t + ag.phase) / ag.period;
        const k = Math.floor(u);
        const p = frac(u);
        const write = hash(i, k) > 0.42;
        const ci = Math.floor(hash(i + 99, k) * cells.length);
        const cell = cells[ci];
        const tx = cx + cell.x * R * 1.1;
        const ty = cy + cell.y * R * 1.1;
        // control point: swing around the centre
        const mx = (ax + tx) / 2 + Math.cos(ang + 1.3) * R * 0.22;
        const my = (ay + ty) / 2 + Math.sin(ang + 1.3) * R * 0.22;
        const col = write ? tk.signal : tk.agent;
        const travel = 0.38;
        const active = p < travel;
        // thread
        ctx.strokeStyle = rgba(col, active ? (light ? 0.38 : 0.28) : light ? 0.1 : 0.07);
        ctx.lineWidth = active ? 1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.stroke();
        if (active) {
          // head travels agent → pool on writes, pool → agent on reads
          const q = p / travel;
          const e = write ? q : 1 - q;
          for (let j = 0; j < 7; j++) {
            const s = Math.max(0, Math.min(1, e - (write ? 1 : -1) * j * 0.025));
            const bx = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * mx + s * s * tx;
            const by = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * my + s * s * ty;
            ctx.fillStyle = rgba(col, (1 - j / 7) * (light ? 0.95 : 0.9));
            ctx.beginPath();
            ctx.arc(bx, by, j === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const fade = 1 - (p - travel) / (1 - travel);
          heat[ci] = Math.max(heat[ci], fade * (write ? 1 : 0.55));
        }
        pos.push({ x: ax, y: ay, on: active ? 1 : 0 });
      });
      // memory lattice
      cells.forEach((c, i) => {
        const x = cx + c.x * R * 1.1;
        const y = cy + c.y * R * 1.1;
        const hh = heat[i];
        ctx.fillStyle = rgba(tk.paper, light ? 0.28 : 0.22);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
        if (hh > 0.02) {
          ctx.fillStyle = rgba(tk.signal, hh * (light ? 0.5 : 0.35));
          ctx.beginPath();
          ctx.arc(x, y, 2 + hh * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(tk.signal, Math.min(1, hh * 1.4));
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalCompositeOperation = "source-over";
      // agents
      pos.forEach((p) => {
        ctx.fillStyle = p.on ? tk.paper : rgba(tk.paper, 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.on ? 2.6 : 1.9, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = MONO(10);
      ctx.fillStyle = rgba(tk["paper-dim"], 0.9);
      ctx.textAlign = "center";
      ctx.fillText("SHARED CONTEXT", cx, cy + R * 0.36 + 16);
    },
    { running: motion && inView, version: tkv(tk) },
  );

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas ref={ref} aria-hidden className="block h-full w-full" />
    </div>
  );
}

/* ════════════════ 02 · AI PREDICTIONS — forecast lines racing the price ════════════════ */
export function PredictionLane({ seed, vol, drift }: { seed: number; vol: number; drift: number }) {
  const { motion, light, tk } = useArt();
  const [wrap, inView] = useInView<HTMLDivElement>("80px");
  const model = useMemo(() => {
    const r = seeded(seed);
    const N = 160;
    const raw: number[] = [];
    let v = 0;
    let m = 0;
    for (let i = 0; i < N; i++) {
      m = m * 0.92 + (r() - 0.5 + drift) * 0.5;
      v += m * vol + (r() - 0.5) * vol * 0.6;
      raw.push(v);
    }
    const lo = Math.min(...raw);
    const hi = Math.max(...raw);
    const price = raw.map((x) => (x - lo) / (hi - lo || 1));
    const xf = 0.52;
    const fi = Math.round(xf * (N - 1));
    const actualSlope = (price[N - 1] - price[fi]) / (1 - xf);
    const agents = [0, 1, 2, 3].map(() => ({
      slope: actualSlope * (0.2 + r() * 1.3) + (r() - 0.5) * 0.9,
      wig: r() * 6,
      amp: 0.02 + r() * 0.05,
    }));
    return { price, N, xf, fi, agents };
  }, [seed, vol, drift]);

  const ref = useArtCanvas(
    (ctx, w, h, now) => {
      const { price, N, xf, fi, agents } = model;
      const cycle = 15;
      const p = motion ? frac((now + seed * 1.7) / cycle) : 0.82;
      const xr = Math.min(1, 0.06 + p * 1.12);
      const padT = 10;
      const boardH = 30;
      const ch = h - padT - boardH - 8;
      const X = (x: number) => x * w;
      const Y = (v: number) => padT + (1 - (0.1 + v * 0.8)) * ch;
      const cols = [tk.signal, tk.agent, tk.value, tk.hot];
      // grid
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.strokeStyle = rgba(tk["paper-dim"], i === 4 ? 0.35 : 0.12);
        const y = padT + (i / 4) * ch;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // forecast mark
      ctx.strokeStyle = rgba(tk.paper, 0.45);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(X(xf), padT);
      ctx.lineTo(X(xf), padT + ch);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = MONO(9);
      ctx.fillStyle = tk["paper-dim"];
      ctx.textAlign = "left";
      ctx.fillText(VISION_UI.predictions.forecastMark, X(xf) + 5, padT + 10);
      // price (ink) up to reveal
      const last = Math.max(1, Math.floor(xr * (N - 1)));
      ctx.beginPath();
      for (let i = 0; i <= last; i++) {
        const x = X(i / (N - 1));
        const y = Y(price[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = tk.paper;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.lineTo(X(last / (N - 1)), padT + ch);
      ctx.lineTo(0, padT + ch);
      ctx.closePath();
      ctx.fillStyle = rgba(tk.paper, light ? 0.05 : 0.04);
      ctx.fill();
      ctx.fillStyle = tk.paper;
      ctx.beginPath();
      ctx.arc(X(last / (N - 1)), Y(price[last]), 2.6, 0, Math.PI * 2);
      ctx.fill();
      // agent forecasts racing from the mark
      const scores: { k: number; s: number }[] = [];
      if (xr > xf) {
        const p0 = price[fi];
        agents.forEach((a, k) => {
          const f = (x: number) => p0 + a.slope * (x - xf) + Math.sin((x - xf) * 18 + a.wig) * a.amp * (x - xf) * 2;
          ctx.beginPath();
          let err = 0;
          let n = 0;
          const steps = Math.max(2, Math.round((xr - xf) * 80));
          for (let j = 0; j <= steps; j++) {
            const x = xf + ((xr - xf) * j) / steps;
            const y = Y(Math.max(-0.1, Math.min(1.1, f(x))));
            if (j) ctx.lineTo(X(x), y);
            else ctx.moveTo(X(x), y);
            const pi = Math.min(N - 1, Math.round(x * (N - 1)));
            err += Math.abs(f(x) - price[pi]);
            n++;
          }
          ctx.strokeStyle = rgba(cols[k], light ? 1 : 0.92);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          const ex = xr;
          ctx.fillStyle = cols[k];
          ctx.beginPath();
          ctx.arc(X(ex), Y(Math.max(-0.1, Math.min(1.1, f(ex)))), 2.2, 0, Math.PI * 2);
          ctx.fill();
          scores.push({ k, s: Math.max(0, 1 - (err / n) * 2.2) });
        });
      }
      // scored record (bottom board)
      const by = h - boardH + 12;
      ctx.strokeStyle = rgba(tk["paper-dim"], 0.25);
      ctx.beginPath();
      ctx.moveTo(0, h - boardH - 2);
      ctx.lineTo(w, h - boardH - 2);
      ctx.stroke();
      ctx.font = MONO(9.5);
      ctx.textAlign = "left";
      const sorted = [...scores].sort((a, b) => b.s - a.s);
      const cw = w / 4;
      for (let i = 0; i < 4; i++) {
        const s = sorted[i];
        const x = i * cw;
        if (!s) {
          ctx.fillStyle = rgba(tk["paper-dim"], 0.6);
          ctx.fillText(`${i + 1}  ——`, x, by + 4);
          continue;
        }
        ctx.fillStyle = cols[s.k];
        ctx.fillRect(x, by - 3, 6, 6);
        ctx.fillStyle = tk.paper;
        ctx.fillText(`${VISION_UI.predictions.agents[s.k].replace("AGENT·", "")}`, x + 10, by + 4);
        ctx.fillStyle = tk["paper-dim"];
        ctx.fillText(s.s.toFixed(2), x + 22, by + 4);
        // score bar
        ctx.fillStyle = rgba(cols[s.k], 0.6);
        ctx.fillRect(x + 10, by + 9, Math.max(1, (cw - 18) * s.s), 1.5);
      }
    },
    { running: motion && inView, version: tkv(tk) },
  );
  return (
    <div ref={wrap} className="relative h-[210px] w-full md:h-[230px]">
      <canvas ref={ref} aria-hidden className="block h-full w-full" />
    </div>
  );
}

/* ════════════════ 04 · AI DEBATES — two argument trees growing toward each other ════════════════ */
type DNode = { x: number; y: number; d: number; parent: number; w: number; r: number; order: number };
function buildTree(seed: number, dir: 1 | -1) {
  const r = seeded(seed);
  const nodes: DNode[] = [{ x: dir === 1 ? 0.05 : 0.95, y: 0.5, d: 0, parent: -1, w: 2.4, r: 5, order: 0 }];
  let frontier = [0];
  for (let d = 1; d <= 4; d++) {
    const next: number[] = [];
    const spread = 0.42 / Math.pow(1.75, d - 1);
    for (const pi of frontier) {
      const kids = d === 1 ? 3 : r() < 0.35 ? 1 : 2;
      for (let k = 0; k < kids; k++) {
        const off = kids === 1 ? (r() - 0.5) * spread * 0.6 : ((k / (kids - 1)) - 0.5) * spread * (kids === 3 ? 1.4 : 1);
        const par = nodes[pi];
        nodes.push({
          x: par.x + dir * (0.095 + r() * 0.02),
          y: Math.max(0.06, Math.min(0.94, par.y + off)),
          d,
          parent: pi,
          w: 0.6 + r() * 2,
          r: 2.2 + r() * 2.6,
          order: nodes.length,
        });
        next.push(nodes.length - 1);
      }
    }
    frontier = next;
  }
  return nodes;
}

export function DebateTrees({ className = "" }: { className?: string }) {
  const { motion, light, tk } = useArt();
  const [wrap, inView] = useInView<HTMLDivElement>("120px");
  const model = useMemo(() => {
    const A = buildTree(41, 1);
    const B = buildTree(77, -1);
    const fa = A.filter((n) => n.d === 4);
    const fb = B.filter((n) => n.d === 4);
    const clashes = fa.map((n) => {
      let best = fb[0];
      for (const m of fb) if (Math.abs(m.y - n.y) < Math.abs(best.y - n.y)) best = m;
      return [n, best] as const;
    });
    return { A, B, clashes };
  }, []);

  const ref = useArtCanvas(
    (ctx, w, h, now) => {
      const cycle = 17;
      const t = motion ? (now % cycle) : 12.5;
      const grow = Math.min(1, t / 9);
      const fade = t > 15.5 ? 1 - (t - 15.5) / 1.5 : 1;
      const pad = 18;
      const X = (x: number) => x * w;
      const Y = (y: number) => pad + y * (h - pad * 2);
      const draw = (nodes: DNode[], col: string) => {
        const total = nodes.length;
        nodes.forEach((n, i) => {
          const appear = Math.min(1, Math.max(0, grow * total * 1.05 - i));
          if (appear <= 0) return;
          if (n.parent >= 0) {
            const p = nodes[n.parent];
            const ex = X(p.x) + (X(n.x) - X(p.x)) * appear;
            const ey = Y(p.y) + (Y(n.y) - Y(p.y)) * appear;
            ctx.strokeStyle = rgba(col, (light ? 0.75 : 0.6) * fade);
            ctx.lineWidth = n.w;
            ctx.beginPath();
            ctx.moveTo(X(p.x), Y(p.y));
            const mx = (X(p.x) + ex) / 2;
            ctx.bezierCurveTo(mx, Y(p.y), mx, ey, ex, ey);
            ctx.stroke();
          }
          if (appear >= 1) {
            ctx.fillStyle = light ? tk.void : tk.void;
            ctx.strokeStyle = rgba(col, fade);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(X(n.x), Y(n.y), n.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = rgba(col, 0.9 * fade);
            ctx.beginPath();
            ctx.arc(X(n.x), Y(n.y), n.r * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      };
      // centre seam
      ctx.strokeStyle = rgba(tk["paper-dim"], 0.3);
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);
      // clashes where the trees meet
      if (t > 9) {
        const c = Math.min(1, (t - 9) / 2) * fade;
        model.clashes.forEach(([a, b], i) => {
          const k = Math.min(1, Math.max(0, c * model.clashes.length - i * 0.6));
          if (k <= 0) return;
          const ax = X(a.x);
          const ay = Y(a.y);
          const bx = X(b.x);
          const by = Y(b.y);
          ctx.strokeStyle = rgba(tk.hot, 0.85 * k);
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
          ctx.stroke();
          ctx.setLineDash([]);
          if (k >= 1) {
            ctx.fillStyle = tk.hot;
            ctx.fillRect((ax + bx) / 2 - 2, (ay + by) / 2 - 2, 4, 4);
          }
        });
      }
      draw(model.A, tk.agent);
      draw(model.B, tk.value);
      ctx.font = MONO(10);
      ctx.fillStyle = tk.agent;
      ctx.textAlign = "left";
      ctx.fillText(VISION_UI.debates.sides[0], 4, 12);
      ctx.fillStyle = tk.value;
      ctx.textAlign = "right";
      ctx.fillText(VISION_UI.debates.sides[1], w - 4, 12);
    },
    { running: motion && inView, version: tkv(tk) },
  );
  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas ref={ref} aria-hidden className="block h-full w-full" />
    </div>
  );
}

/* ════════════════ 05 · AI SOCIAL NETWORK — force graph from the REAL chat feed ════════════════ */
type GNode = { id: string; name: string; color: string; count: number };
type GEdge = { a: string; b: string; w: number };

export function useChatGraph() {
  const chat = useArenaStore((s) => s.chat);
  return useMemo(() => {
    const nodes = new Map<string, GNode>();
    const byMsg = new Map<string, string>();
    for (const m of chat) {
      byMsg.set(m.id, m.agent_id);
      const n = nodes.get(m.agent_id);
      if (n) n.count++;
      else nodes.set(m.agent_id, { id: m.agent_id, name: m.name, color: m.color || "#22C8E8", count: 1 });
    }
    const byName = new Map<string, string>();
    nodes.forEach((n) => byName.set(n.name.toLowerCase(), n.id));
    const edges = new Map<string, GEdge>();
    const link = (a: string, b: string) => {
      if (!a || !b || a === b) return;
      const [x, y] = a < b ? [a, b] : [b, a];
      const k = `${x}|${y}`;
      const e = edges.get(k);
      if (e) e.w++;
      else edges.set(k, { a: x, b: y, w: 1 });
    };
    for (const m of chat) {
      if (m.reply_to) {
        const to = byMsg.get(m.reply_to);
        if (to) link(m.agent_id, to);
      }
      const re = /@\[([^\]]{1,40})\]|@([A-Za-z0-9_.·-]{2,40})/g;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(m.body))) {
        const id = byName.get((mm[1] ?? mm[2] ?? "").toLowerCase());
        if (id) link(m.agent_id, id);
      }
    }
    return { nodes: [...nodes.values()], edges: [...edges.values()], msgs: chat.length };
  }, [chat]);
}

export function SocialGraph({ className = "" }: { className?: string }) {
  const { motion, light, tk } = useArt();
  const [wrap, inView] = useInView<HTMLDivElement>("120px");
  const graph = useChatGraph();
  const sim = useRef(new Map<string, { x: number; y: number; vx: number; vy: number }>());
  const pulses = useRef(new Map<string, number>());
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    const m = sim.current;
    graph.nodes.forEach((n, i) => {
      if (!m.has(n.id)) {
        const a = hash(i, n.id.length) * Math.PI * 2;
        const r = 0.2 + hash(n.id.length, i) * 0.6;
        m.set(n.id, { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 });
      }
    });
  }, [graph]);

  useEffect(
    () =>
      arenaEvents.on((e) => {
        if (e.type === "chat") pulses.current.set(e.msg.agent_id, performance.now() / 1000);
      }),
    [],
  );

  const ref = useArtCanvas(
    (ctx, w, h, now, dt) => {
      const { nodes, edges } = graph;
      const m = sim.current;
      const step = () => {
        const arr = nodes.map((n) => m.get(n.id)).filter(Boolean) as { x: number; y: number; vx: number; vy: number }[];
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          for (let j = i + 1; j < arr.length; j++) {
            const q = arr[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const d2 = dx * dx + dy * dy + 0.0025;
            const f = 0.0016 / d2;
            p.vx += dx * f;
            p.vy += dy * f;
            q.vx -= dx * f;
            q.vy -= dy * f;
          }
          p.vx -= p.x * 0.012;
          p.vy -= p.y * 0.012;
        }
        for (const e of edges) {
          const a = m.get(e.a);
          const b = m.get(e.b);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const f = (d - 0.22) * 0.03 * Math.min(3, e.w);
          a.vx += (dx / d) * f;
          a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f;
          b.vy -= (dy / d) * f;
        }
        for (const p of arr) {
          p.vx *= 0.82;
          p.vy *= 0.82;
          p.x = Math.max(-1.1, Math.min(1.1, p.x + p.vx));
          p.y = Math.max(-1.1, Math.min(1.1, p.y + p.vy));
        }
      };
      if (!settled.current) {
        for (let i = 0; i < 260; i++) step();
        settled.current = true;
      } else if (dt > 0) step();

      const cx = w / 2;
      const cy = h / 2;
      const S = Math.min(w * 0.42, h * 0.4);
      const breathe = motion ? Math.sin(now * 0.4) * 0.006 : 0;
      const P = (id: string) => {
        const p = m.get(id);
        return p ? { x: cx + p.x * S * (1 + breathe), y: cy + p.y * S * (1 + breathe) } : null;
      };
      // faint rings
      ctx.strokeStyle = rgba(tk["paper-dim"], 0.12);
      ctx.lineWidth = 1;
      for (const k of [0.5, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, S * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      // edges
      for (const e of edges) {
        const a = P(e.a);
        const b = P(e.b);
        if (!a || !b) continue;
        ctx.strokeStyle = rgba(tk.paper, Math.min(0.7, (light ? 0.22 : 0.16) + e.w * 0.08));
        ctx.lineWidth = Math.min(3, 0.6 + e.w * 0.35);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (motion) {
          // message packet travelling the edge
          const u = frac(now * 0.25 + hash(e.a.length, e.b.length + e.w));
          ctx.fillStyle = rgba(tk.signal, 0.8);
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // nodes
      const top = [...nodes].sort((a, b) => b.count - a.count).slice(0, 7).map((n) => n.id);
      ctx.font = MONO(10);
      ctx.textAlign = "left";
      for (const n of nodes) {
        const p = P(n.id);
        if (!p) continue;
        const r = 3 + Math.sqrt(n.count) * 1.8;
        const pt = pulses.current.get(n.id);
        if (pt && now - pt < 2.4) {
          const k = (now - pt) / 2.4;
          ctx.strokeStyle = rgba(n.color, 1 - k);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + k * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = light ? rgba(tk.paper, 0.7) : rgba(tk.void, 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        if (top.includes(n.id)) {
          ctx.fillStyle = tk.paper;
          ctx.fillText(n.name.slice(0, 18), p.x + r + 5, p.y + 3.5);
        }
      }
    },
    { running: motion && inView && graph.nodes.length > 0, version: `${tkv(tk)}|${graph.msgs}|${graph.nodes.length}` },
  );
  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas ref={ref} aria-hidden className="block h-full w-full" />
      {graph.nodes.length === 0 && (
        <p className="mono absolute inset-0 grid place-items-center px-8 text-center text-[0.78rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">
          {VISION_UI.social.empty}
        </p>
      )}
    </div>
  );
}
