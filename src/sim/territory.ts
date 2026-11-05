/**
 * Territory Control — pure, deterministic, seedable, fixed-timestep (20 ticks/s), render-independent.
 * Visual reproduction of the published rules; NOT the production engine.
 *
 *  - Walking onto a neutral tile claims it instantly.
 *  - Standing on an enemy tile for FLIP_TICKS (20 ticks ≈ 1s) flips it. Stepping off resets progress.
 *  - Two or more agents on the same tile in the same tick freeze it for that tick: no claim, no flip.
 *  - Ranking: most tiles, ties broken by the earlier scoring tick.
 */
import { FACTS } from "@/content/facts";
import { AGENT_COLORS, DT, TICK_HZ, clamp, mulberry32, type Rng } from "./rng";

export const FLIP_TICKS = Math.round(FACTS.flipHoldSec * TICK_HZ);
export const OBS_CHANNELS = 5;

export type TerritoryAgent = {
  id: number;
  /** continuous position in tile units, 0..w / 0..h */
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  tiles: number;
  /** tick of the agent's most recent score change (tie-break: earlier wins) */
  lastScoreTick: number;
  /** [move_x, move_z, boost] each in [-1, 1] — the 3 continuous actions */
  action: [number, number, number];
  /** bot internals (read-only for renderers) */
  tx: number;
  ty: number;
  mode: 0 | 1 | 2; // 0 greedy-neutral, 1 explore, 2 aggression
};

export type TerritorySim = {
  w: number;
  h: number;
  tick: number;
  timeSec: number;
  matchSec: number;
  matchTicks: number;
  /** true once tick >= matchTicks (step() becomes a no-op until reset) */
  ended: boolean;
  seed: number;
  /** -1 neutral, else agent id */
  owner: Int16Array;
  /** 0..1 hold progress toward flipping an enemy tile */
  flip: Float32Array;
  /** agent id currently flipping each tile (-1 none) */
  flipBy: Int16Array;
  /** 1 if contested (2+ agents) THIS tick */
  frozen: Uint8Array;
  agents: TerritoryAgent[];
  /** total claimed tiles (owner >= 0) */
  claimed: number;
  step(): void;
  reset(seed?: number): void;
  ranking(): { id: number; color: string; tiles: number }[];
  /** 5 channels × h × w, channel-major: own, enemy, neutral, agent positions (self=1, others=0.5), frozen=1 / flip progress */
  observe(agentId: number, out?: Float32Array): Float32Array;
  /** recolour agents (e.g. from live leaderboard colours) without resetting */
  setColors(colors: readonly string[]): void;
};

export type TerritoryOpts = {
  seed?: number;
  agents?: number;
  w?: number;
  h?: number;
  colors?: readonly string[];
  /** match length in seconds (default FACTS.matchLengthSec = 90) */
  matchSec?: number;
};

const MAX_SPEED = 5.2; // tiles / s
const ACCEL = 0.22;

export function createTerritory(opts: TerritoryOpts = {}): TerritorySim {
  const w = opts.w ?? FACTS.grid.w;
  const h = opts.h ?? FACTS.grid.h;
  const n = Math.max(1, Math.min(opts.agents ?? 12, 64));
  const N = w * h;
  const matchSec = opts.matchSec ?? FACTS.matchLengthSec;
  let palette: readonly string[] = opts.colors && opts.colors.length ? opts.colors : AGENT_COLORS;

  const owner = new Int16Array(N);
  const flip = new Float32Array(N);
  const flipBy = new Int16Array(N);
  const frozen = new Uint8Array(N);
  const occ = new Uint8Array(N); // occupancy count, scratch
  const occBy = new Int16Array(N); // last occupant id, scratch
  const agentTile = new Int32Array(n);
  let rng: Rng = mulberry32(1);
  // per-agent personality, derived from seed
  const aggr = new Float32Array(n);
  const explore = new Float32Array(n);
  const retargetAt = new Int32Array(n);

  const sim: TerritorySim = {
    w,
    h,
    tick: 0,
    timeSec: 0,
    matchSec,
    matchTicks: Math.round(matchSec * TICK_HZ),
    ended: false,
    seed: opts.seed ?? 7,
    owner,
    flip,
    flipBy,
    frozen,
    agents: [],
    claimed: 0,
    step,
    reset,
    ranking,
    observe,
    setColors,
  };

  function setColors(colors: readonly string[]) {
    if (!colors.length) return;
    palette = colors;
    sim.agents.forEach((a, i) => (a.color = palette[i % palette.length]));
  }

  function reset(seed?: number) {
    if (seed !== undefined) sim.seed = seed;
    rng = mulberry32(sim.seed);
    owner.fill(-1);
    flip.fill(0);
    flipBy.fill(-1);
    frozen.fill(0);
    sim.tick = 0;
    sim.timeSec = 0;
    sim.ended = false;
    sim.claimed = 0;
    sim.agents = [];
    for (let i = 0; i < n; i++) {
      // spawn on a ring so the opening is symmetric-ish but seeded
      const ang = (i / n) * Math.PI * 2 + rng() * 0.6;
      const r = Math.min(w, h) * (0.28 + rng() * 0.16);
      const x = clamp(w / 2 + Math.cos(ang) * r, 0.5, w - 0.5);
      const y = clamp(h / 2 + Math.sin(ang) * r, 0.5, h - 0.5);
      aggr[i] = 0.06 + rng() * 0.22;
      explore[i] = 0.04 + rng() * 0.1;
      retargetAt[i] = 0;
      sim.agents.push({
        id: i,
        x,
        y,
        vx: 0,
        vy: 0,
        color: palette[i % palette.length],
        tiles: 0,
        lastScoreTick: 0,
        action: [0, 0, 0],
        tx: x,
        ty: y,
        mode: 0,
      });
      agentTile[i] = -1;
    }
  }

  function nearest(a: TerritoryAgent, pred: (idx: number) => boolean, jitter: number) {
    let best = -1;
    let bestD = Infinity;
    const ax = a.x;
    const ay = a.y;
    for (let idx = 0; idx < N; idx++) {
      if (!pred(idx)) continue;
      const cx = (idx % w) + 0.5;
      const cy = ((idx / w) | 0) + 0.5;
      const dx = cx - ax;
      const dy = cy - ay;
      // heading bias: prefer tiles roughly ahead (fewer U-turns = nicer paths)
      const along = dx * a.vx + dy * a.vy;
      const d = Math.sqrt(dx * dx + dy * dy) - (along > 0 ? 0.6 : 0) + rng() * jitter;
      if (d < bestD) {
        bestD = d;
        best = idx;
      }
    }
    return best;
  }

  function retarget(a: TerritoryAgent) {
    const r = rng();
    const i = a.id;
    let idx = -1;
    if (r < explore[i]) {
      a.mode = 1;
      idx = (rng() * N) | 0;
    } else if (r < explore[i] + aggr[i] || sim.claimed > N * 0.92) {
      a.mode = 2;
      idx = nearest(a, (k) => owner[k] >= 0 && owner[k] !== i, 3);
    }
    if (idx < 0) {
      a.mode = 0;
      idx = nearest(a, (k) => owner[k] === -1, 1.4);
      if (idx < 0) {
        a.mode = 2;
        idx = nearest(a, (k) => owner[k] >= 0 && owner[k] !== i, 3);
      }
    }
    if (idx < 0) idx = (rng() * N) | 0;
    a.tx = (idx % w) + 0.5;
    a.ty = ((idx / w) | 0) + 0.5;
    retargetAt[i] = sim.tick + 30 + ((rng() * 50) | 0);
  }

  function step() {
    if (sim.ended) return;
    const t = sim.tick;
    // 1. policy → actions
    for (const a of sim.agents) {
      const tIdx = (a.ty | 0) * w + (a.tx | 0);
      const reached = Math.abs(a.tx - a.x) < 0.45 && Math.abs(a.ty - a.y) < 0.45;
      const stale =
        (a.mode === 0 && owner[tIdx] !== -1) ||
        (a.mode === 2 && (owner[tIdx] === a.id || owner[tIdx] === -1)) ||
        (a.mode === 1 && reached) ||
        t >= retargetAt[a.id];
      // aggression: once on the target enemy tile, hold still until it flips
      const holding = a.mode === 2 && reached && owner[tIdx] >= 0 && owner[tIdx] !== a.id;
      if (!holding && (stale || reached)) retarget(a);
      let dx = a.tx - a.x;
      let dy = a.ty - a.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      if (holding) {
        dx = (a.tx - a.x) * 2;
        dy = (a.ty - a.y) * 2;
      }
      // wander noise
      const wob = 0.18;
      const mx = clamp(dx + (rng() - 0.5) * wob, -1, 1);
      const mz = clamp(dy + (rng() - 0.5) * wob, -1, 1);
      const boost = holding ? -1 : clamp((d - 4) / 8 + (rng() - 0.5) * 0.2, -1, 1);
      // smoothed actions read better on gauges
      a.action[0] += (mx - a.action[0]) * 0.5;
      a.action[1] += (mz - a.action[1]) * 0.5;
      a.action[2] += (boost - a.action[2]) * 0.3;
    }
    // 2. physics
    for (const a of sim.agents) {
      const sp = MAX_SPEED * (0.75 + 0.25 * a.action[2]);
      const tvx = a.action[0] * sp;
      const tvy = a.action[1] * sp;
      a.vx += (tvx - a.vx) * ACCEL;
      a.vy += (tvy - a.vy) * ACCEL;
      a.x += a.vx * DT;
      a.y += a.vy * DT;
      if (a.x < 0.05) { a.x = 0.05; a.vx = Math.abs(a.vx) * 0.3; }
      if (a.y < 0.05) { a.y = 0.05; a.vy = Math.abs(a.vy) * 0.3; }
      if (a.x > w - 0.05) { a.x = w - 0.05; a.vx = -Math.abs(a.vx) * 0.3; }
      if (a.y > h - 0.05) { a.y = h - 0.05; a.vy = -Math.abs(a.vy) * 0.3; }
    }
    // 3. occupancy
    frozen.fill(0);
    for (const a of sim.agents) {
      const idx = (a.y | 0) * w + (a.x | 0);
      agentTile[a.id] = idx;
      occ[idx] = 0;
    }
    for (const a of sim.agents) {
      const idx = agentTile[a.id];
      occ[idx]++;
      occBy[idx] = a.id;
    }
    // 4. resolve claims
    for (const a of sim.agents) {
      const idx = agentTile[a.id];
      if (occ[idx] >= 2) {
        frozen[idx] = 1;
        flip[idx] = 0;
        flipBy[idx] = -1;
        continue;
      }
      const o = owner[idx];
      if (o === -1) {
        owner[idx] = a.id;
        a.tiles++;
        a.lastScoreTick = t;
        sim.claimed++;
      } else if (o !== a.id) {
        if (flipBy[idx] !== a.id) {
          flipBy[idx] = a.id;
          flip[idx] = 0;
        }
        flip[idx] += 1 / FLIP_TICKS;
        if (flip[idx] >= 1 - 1e-6) {
          sim.agents[o].tiles--;
          owner[idx] = a.id;
          a.tiles++;
          a.lastScoreTick = t;
          flip[idx] = 0;
          flipBy[idx] = -1;
        }
      }
    }
    // 5. step-off resets flip progress
    for (let idx = 0; idx < N; idx++) {
      const by = flipBy[idx];
      if (by < 0) continue;
      if (agentTile[by] !== idx) {
        flip[idx] = 0;
        flipBy[idx] = -1;
      }
    }
    sim.tick = t + 1;
    sim.timeSec = sim.tick / TICK_HZ;
    if (sim.tick >= sim.matchTicks) sim.ended = true;
  }

  function ranking() {
    return [...sim.agents]
      .sort((a, b) => b.tiles - a.tiles || a.lastScoreTick - b.lastScoreTick || a.id - b.id)
      .map((a) => ({ id: a.id, color: a.color, tiles: a.tiles }));
  }

  function observe(agentId: number, out?: Float32Array) {
    const o = out && out.length === OBS_CHANNELS * N ? out : new Float32Array(OBS_CHANNELS * N);
    o.fill(0);
    for (let idx = 0; idx < N; idx++) {
      const ow = owner[idx];
      if (ow === agentId) o[idx] = 1;
      else if (ow >= 0) o[N + idx] = 1;
      else o[2 * N + idx] = 1;
      o[4 * N + idx] = frozen[idx] ? 1 : flip[idx] * 0.85;
    }
    for (const a of sim.agents) {
      const idx = (a.y | 0) * w + (a.x | 0);
      const v = a.id === agentId ? 1 : 0.5;
      if (o[3 * N + idx] < v) o[3 * N + idx] = v;
    }
    return o;
  }

  reset();
  return sim;
}
