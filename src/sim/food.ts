/**
 * Food Collector — pure, deterministic, seedable, fixed-timestep (20 ticks/s), render-independent.
 * Visual reproduction of the published rules; NOT the production engine.
 *
 *  - Food tokens spawn continuously with different point values.
 *  - Collection is contact-based and exclusive: the closest agent in contact takes it (one winner per token).
 *  - Agents path toward value / distance; a short trail is kept per agent.
 */
import { FACTS } from "@/content/facts";
import { AGENT_COLORS, DT, TICK_HZ, clamp, mulberry32, type Rng } from "./rng";

export const FOOD_VALUES = [1, 3, 5] as const;
export const TRAIL_LEN = 28;

export type FoodToken = { id: number; x: number; y: number; value: number; born: number };
export type FoodBurst = { x: number; y: number; value: number; color: string; agentId: number; tick: number };

export type FoodAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  score: number;
  collected: number;
  lastScoreTick: number;
  /** [move_x, move_z, boost] each in [-1, 1] */
  action: [number, number, number];
  /** ring buffer of past positions: [x0,y0,x1,y1,...], newest at trailHead */
  trail: Float32Array;
  trailHead: number;
  trailCount: number;
  /** current target token id (-1 none) */
  target: number;
};

export type FoodSim = {
  w: number;
  h: number;
  tick: number;
  timeSec: number;
  matchSec: number;
  matchTicks: number;
  ended: boolean;
  seed: number;
  agents: FoodAgent[];
  tokens: FoodToken[];
  /** bursts emitted in the last ~2s (renderers fade them by tick age) */
  bursts: FoodBurst[];
  /** total tokens collected this match */
  collected: number;
  agentRadius: number;
  step(): void;
  reset(seed?: number): void;
  ranking(): { id: number; color: string; score: number }[];
  /** subscribe to collection events; returns unsubscribe */
  onBurst(fn: (b: FoodBurst) => void): () => void;
  setColors(colors: readonly string[]): void;
};

export type FoodOpts = {
  seed?: number;
  agents?: number;
  colors?: readonly string[];
  /** field size in world units (default 60 × 36) */
  w?: number;
  h?: number;
  /** max live tokens (default scales with area) */
  maxTokens?: number;
  matchSec?: number;
};

/** world-unit radius of a token of value v */
export const tokenRadius = (v: number) => 0.22 + v * 0.07;

const MAX_SPEED = 6.4;
const ACCEL = 0.16;

export function createFood(opts: FoodOpts = {}): FoodSim {
  const w = opts.w ?? 60;
  const h = opts.h ?? 36;
  const n = Math.max(1, Math.min(opts.agents ?? 10, 64));
  const maxTokens = opts.maxTokens ?? Math.round((w * h) / 34);
  const matchSec = opts.matchSec ?? FACTS.matchLengthSec;
  let palette: readonly string[] = opts.colors && opts.colors.length ? opts.colors : AGENT_COLORS;
  let rng: Rng = mulberry32(1);
  let nextId = 1;
  const listeners = new Set<(b: FoodBurst) => void>();
  const R = 0.7;

  const sim: FoodSim = {
    w,
    h,
    tick: 0,
    timeSec: 0,
    matchSec,
    matchTicks: Math.round(matchSec * TICK_HZ),
    ended: false,
    seed: opts.seed ?? 11,
    agents: [],
    tokens: [],
    bursts: [],
    collected: 0,
    agentRadius: R,
    step,
    reset,
    ranking,
    onBurst(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    setColors(colors) {
      if (!colors.length) return;
      palette = colors;
      sim.agents.forEach((a, i) => (a.color = palette[i % palette.length]));
    },
  };

  function spawn() {
    const r = rng();
    const value = r < 0.62 ? 1 : r < 0.9 ? 3 : 5;
    // spawn in loose clusters so paths become interesting
    let x: number, y: number;
    if (sim.tokens.length && rng() < 0.45) {
      const p = sim.tokens[(rng() * sim.tokens.length) | 0];
      x = p.x + (rng() - 0.5) * 6;
      y = p.y + (rng() - 0.5) * 6;
    } else {
      x = rng() * w;
      y = rng() * h;
    }
    sim.tokens.push({ id: nextId++, x: clamp(x, 1, w - 1), y: clamp(y, 1, h - 1), value, born: sim.tick });
  }

  function reset(seed?: number) {
    if (seed !== undefined) sim.seed = seed;
    rng = mulberry32(sim.seed);
    nextId = 1;
    sim.tick = 0;
    sim.timeSec = 0;
    sim.ended = false;
    sim.collected = 0;
    sim.tokens = [];
    sim.bursts = [];
    sim.agents = [];
    for (let i = 0; i < n; i++) {
      const x = 2 + rng() * (w - 4);
      const y = 2 + rng() * (h - 4);
      const trail = new Float32Array(TRAIL_LEN * 2);
      for (let k = 0; k < TRAIL_LEN; k++) {
        trail[k * 2] = x;
        trail[k * 2 + 1] = y;
      }
      sim.agents.push({
        id: i,
        x,
        y,
        vx: 0,
        vy: 0,
        color: palette[i % palette.length],
        score: 0,
        collected: 0,
        lastScoreTick: 0,
        action: [0, 0, 0],
        trail,
        trailHead: 0,
        trailCount: 1,
        target: -1,
      });
    }
    for (let k = 0; k < Math.round(maxTokens * 0.6); k++) spawn();
  }

  function choose(a: FoodAgent) {
    let best: FoodToken | null = null;
    let bestS = -Infinity;
    for (const tk of sim.tokens) {
      const d = Math.hypot(tk.x - a.x, tk.y - a.y);
      // discount tokens another agent is clearly closer to
      let rival = 1;
      for (const b of sim.agents) {
        if (b === a) continue;
        const db = Math.hypot(tk.x - b.x, tk.y - b.y);
        if (db < d * 0.6) {
          rival = 0.35;
          break;
        }
      }
      const stick = tk.id === a.target ? 1.25 : 1;
      const s = ((tk.value * rival * stick) / (d + 2)) * (0.92 + rng() * 0.16);
      if (s > bestS) {
        bestS = s;
        best = tk;
      }
    }
    a.target = best ? best.id : -1;
    return best;
  }

  function step() {
    if (sim.ended) return;
    const t = sim.tick;
    // spawn: continuous, rate rises as field empties
    const deficit = 1 - sim.tokens.length / maxTokens;
    if (deficit > 0 && rng() < 0.12 + deficit * 0.9) spawn();

    // policy
    for (const a of sim.agents) {
      const tk = (t + a.id) % 4 === 0 || !sim.tokens.some((k) => k.id === a.target) ? choose(a) : sim.tokens.find((k) => k.id === a.target) ?? null;
      let dx = 0,
        dy = 0,
        d = 1;
      if (tk) {
        dx = tk.x - a.x;
        dy = tk.y - a.y;
        d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
      } else {
        dx = Math.cos(t * 0.03 + a.id);
        dy = Math.sin(t * 0.03 + a.id);
      }
      // separation keeps agents from stacking
      for (const b of sim.agents) {
        if (b === a) continue;
        const sx = a.x - b.x,
          sy = a.y - b.y;
        const ds = sx * sx + sy * sy;
        if (ds < 4 && ds > 1e-6) {
          dx += (sx / ds) * 0.35;
          dy += (sy / ds) * 0.35;
        }
      }
      const mx = clamp(dx + (rng() - 0.5) * 0.12, -1, 1);
      const mz = clamp(dy + (rng() - 0.5) * 0.12, -1, 1);
      const boost = clamp((tk ? tk.value / 5 : 0) * 1.4 - 0.4 - (d < 2 ? 0.6 : 0), -1, 1);
      a.action[0] += (mx - a.action[0]) * 0.45;
      a.action[1] += (mz - a.action[1]) * 0.45;
      a.action[2] += (boost - a.action[2]) * 0.3;
    }

    // physics
    for (const a of sim.agents) {
      const sp = MAX_SPEED * (0.7 + 0.3 * a.action[2]);
      const m = Math.hypot(a.action[0], a.action[1]) || 1;
      const k = m > 1 ? 1 / m : 1;
      a.vx += (a.action[0] * k * sp - a.vx) * ACCEL;
      a.vy += (a.action[1] * k * sp - a.vy) * ACCEL;
      a.x = clamp(a.x + a.vx * DT, R, w - R);
      a.y = clamp(a.y + a.vy * DT, R, h - R);
      a.trailHead = (a.trailHead + 1) % TRAIL_LEN;
      a.trail[a.trailHead * 2] = a.x;
      a.trail[a.trailHead * 2 + 1] = a.y;
      if (a.trailCount < TRAIL_LEN) a.trailCount++;
    }

    // exclusive contact collection
    for (let i = sim.tokens.length - 1; i >= 0; i--) {
      const tk = sim.tokens[i];
      const reach = R + tokenRadius(tk.value);
      let winner: FoodAgent | null = null;
      let wd = Infinity;
      for (const a of sim.agents) {
        const d = Math.hypot(tk.x - a.x, tk.y - a.y);
        if (d < reach && d < wd) {
          wd = d;
          winner = a;
        }
      }
      if (winner) {
        sim.tokens.splice(i, 1);
        winner.score += tk.value;
        winner.collected++;
        winner.lastScoreTick = t;
        sim.collected++;
        const b: FoodBurst = { x: tk.x, y: tk.y, value: tk.value, color: winner.color, agentId: winner.id, tick: t };
        sim.bursts.push(b);
        listeners.forEach((fn) => fn(b));
      }
    }
    const keep = t - TICK_HZ * 2;
    if (sim.bursts.length && sim.bursts[0].tick < keep) sim.bursts = sim.bursts.filter((b) => b.tick >= keep);

    sim.tick = t + 1;
    sim.timeSec = sim.tick / TICK_HZ;
    if (sim.tick >= sim.matchTicks) sim.ended = true;
  }

  function ranking() {
    return [...sim.agents]
      .sort((a, b) => b.score - a.score || a.lastScoreTick - b.lastScoreTick || a.id - b.id)
      .map((a) => ({ id: a.id, color: a.color, score: a.score }));
  }

  reset();
  return sim;
}

