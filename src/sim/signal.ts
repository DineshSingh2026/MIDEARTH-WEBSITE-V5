/**
 * Signal: pure, deterministic, seedable, fixed timestep (20 ticks/s), render independent.
 * A small illustrative reproduction of the published idea; NOT the production engine.
 *
 *  - A beacon travels a smooth procedural closed path inside a circular arena.
 *  - Every tick an agent spends inside the capture radius scores 1 point; several agents can score at once.
 *  - With 3 or more agents inside, the beacon speeds up.
 *  - Agents collide and push each other; the blocker deliberately bumps rivals out of range.
 *  - Roles: chasers follow the beacon, the camper waits at a point further along the route, the blocker guards.
 */
import { DT, clamp, mulberry32 } from "./rng";

export const SIGNAL_TRAIL = 14;
export type SignalRole = "chaser" | "camper" | "blocker";

export type SignalAgent = {
  id: number;
  role: SignalRole;
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  inRange: boolean;
  /** ticks since last bump received (for a short visual flash) */
  hitAge: number;
  /** camper: path parameter it waits at */
  aim: number;
  /** blocker: id of rival currently being pushed (-1 none) */
  mark: number;
  trail: Float32Array;
  trailHead: number;
  trailCount: number;
  maxSpeed: number;
  gain: number;
};

export type SignalEvent = { kind: "score"; x: number; y: number; id: number } | { kind: "bump"; x: number; y: number; id: number };

export type SignalSim = {
  /** arena radius in world units (arena centred on 0,0) */
  R: number;
  captureR: number;
  agentR: number;
  tick: number;
  seed: number;
  /** beacon position + path parameter (radians around the arena) */
  bx: number;
  by: number;
  phase: number;
  /** current beacon speed multiplier (1 = calm), smoothed */
  speed: number;
  inside: number;
  agents: SignalAgent[];
  step(): void;
  reset(seed?: number): void;
  /** point on the beacon's closed path at parameter t */
  pathAt(t: number): [number, number];
  onEvent(fn: (e: SignalEvent) => void): () => void;
};

const ROLES: SignalRole[] = ["chaser", "chaser", "camper", "blocker", "chaser", "chaser"];
const BASE_RATE = 0.2; // radians per second when calm
const TAU = Math.PI * 2;

export function createSignal(opts: { seed?: number; agents?: number } = {}): SignalSim {
  const n = Math.max(1, Math.min(8, opts.agents ?? 6));
  const R = 20;
  const listeners = new Set<(e: SignalEvent) => void>();
  let k1 = 0,
    k2 = 0,
    p1 = 0,
    p2 = 0;

  const sim: SignalSim = {
    R,
    captureR: 4.2,
    agentR: 0.85,
    tick: 0,
    seed: opts.seed ?? 3,
    bx: 0,
    by: 0,
    phase: 0,
    speed: 1,
    inside: 0,
    agents: [],
    pathAt(t) {
      const r = 11 + k1 * Math.sin(2 * t + p1) + k2 * Math.sin(3 * t + p2);
      return [Math.cos(t) * r, Math.sin(t) * r];
    },
    onEvent(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    reset(seed) {
      if (seed !== undefined) sim.seed = seed;
      const rnd = mulberry32(sim.seed);
      k1 = 2.6 + rnd() * 1.4;
      k2 = 1.2 + rnd() * 1.2;
      p1 = rnd() * TAU;
      p2 = rnd() * TAU;
      sim.tick = 0;
      sim.phase = rnd() * TAU;
      sim.speed = 1;
      sim.inside = 0;
      [sim.bx, sim.by] = sim.pathAt(sim.phase);
      sim.agents = Array.from({ length: n }, (_, i) => {
        const role = ROLES[i % ROLES.length];
        const a = (i / n) * TAU + rnd() * 0.4;
        const rr = 15 + rnd() * 3;
        return {
          id: i,
          role,
          x: Math.cos(a) * rr,
          y: Math.sin(a) * rr,
          vx: 0,
          vy: 0,
          score: 0,
          inRange: false,
          hitAge: 99,
          aim: sim.phase + 1.8,
          mark: -1,
          trail: new Float32Array(SIGNAL_TRAIL * 2),
          trailHead: 0,
          trailCount: 0,
          maxSpeed: role === "chaser" ? 3.4 + (i % 3) * 0.9 + rnd() * 0.4 : role === "blocker" ? 5.6 : 7.4,
          gain: role === "chaser" ? 0.8 + rnd() * 0.5 : 1.1,
        };
      });
    },
    step() {
      const t = sim.tick++;
      const cr = sim.captureR;
      // beacon: advance along the closed path; contested (3+ inside) means faster
      const want = sim.inside >= 3 ? Math.min(2.6, 1 + 0.5 * (sim.inside - 2)) : 1;
      sim.speed += (want - sim.speed) * 0.08;
      sim.phase = (sim.phase + BASE_RATE * sim.speed * DT) % TAU;
      const [bx, by] = sim.pathAt(sim.phase);
      const bvx = (bx - sim.bx) / DT,
        bvy = (by - sim.by) / DT;
      sim.bx = bx;
      sim.by = by;

      // steering per role
      for (const a of sim.agents) {
        let tx = bx,
          ty = by;
        if (a.role === "chaser") {
          // lead the beacon a little, with a per agent lag
          tx = bx + bvx * 0.25 * a.gain + Math.cos(t * 0.05 + a.id) * 1.2;
          ty = by + bvy * 0.25 * a.gain + Math.sin(t * 0.05 + a.id) * 1.2;
        } else if (a.role === "camper") {
          // wait at a point further along the route; once the beacon arrives, ride it briefly, then jump ahead again
          let ahead = a.aim - sim.phase;
          while (ahead < -Math.PI) ahead += TAU;
          while (ahead > Math.PI) ahead -= TAU;
          if (ahead < -0.35) a.aim = sim.phase + 1.9;
          if (ahead > 0.15) [tx, ty] = sim.pathAt(a.aim);
        } else {
          // blocker: hold position inside the range; pick on the nearest rival inside it
          a.mark = -1;
          let best = 3.6 * 3.6;
          for (const o of sim.agents) {
            if (o === a || !o.inRange) continue;
            const d = (o.x - a.x) ** 2 + (o.y - a.y) ** 2;
            if (d < best) {
              best = d;
              a.mark = o.id;
            }
          }
          if (a.mark >= 0) {
            const o = sim.agents[a.mark];
            tx = o.x + (o.x - bx) * 0.3;
            ty = o.y + (o.y - by) * 0.3;
          } else {
            tx = bx + bvx * 0.15;
            ty = by + bvy * 0.15;
          }
        }
        let dx = tx - a.x,
          dy = ty - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 1e-6) {
          dx /= d;
          dy /= d;
        }
        const sp = a.maxSpeed * clamp(d / 2.5, 0, 1);
        a.vx += (dx * sp - a.vx) * 0.12;
        a.vy += (dy * sp - a.vy) * 0.12;
      }

      // collisions (O(n²), n ≤ 8): separate and add knockback; the blocker hits harder
      const ar = sim.agentR * 2;
      for (let i = 0; i < sim.agents.length; i++)
        for (let j = i + 1; j < sim.agents.length; j++) {
          const a = sim.agents[i],
            b = sim.agents[j];
          const dx = b.x - a.x,
            dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d >= ar) continue;
          const nx = d > 1e-6 ? dx / d : 1,
            ny = d > 1e-6 ? dy / d : 0;
          const push = (ar - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          const blockA = a.role === "blocker",
            blockB = b.role === "blocker";
          const kick = Math.max(0, rel) * 0.6 + (blockA || blockB ? 5 : 1.2);
          if (blockA || blockB) {
            // knock the rival, the blocker barely moves
            const victim = blockA ? b : a;
            const s = blockA ? 1 : -1;
            victim.vx += nx * kick * s;
            victim.vy += ny * kick * s;
            if (victim.hitAge > 12) {
              victim.hitAge = 0;
              listeners.forEach((l) => l({ kind: "bump", x: a.x + nx * d * 0.5, y: a.y + ny * d * 0.5, id: victim.id }));
            }
          } else {
            a.vx -= nx * kick * 0.5;
            a.vy -= ny * kick * 0.5;
            b.vx += nx * kick * 0.5;
            b.vy += ny * kick * 0.5;
          }
        }

      // integrate, keep inside the arena wall, score, trail
      let inside = 0;
      const wall = R - sim.agentR;
      for (const a of sim.agents) {
        a.x += a.vx * DT;
        a.y += a.vy * DT;
        const r = Math.hypot(a.x, a.y);
        if (r > wall && r > 1e-6) {
          a.x *= wall / r;
          a.y *= wall / r;
          a.vx *= 0.5;
          a.vy *= 0.5;
        }
        a.hitAge++;
        a.inRange = (a.x - bx) ** 2 + (a.y - by) ** 2 <= cr * cr;
        if (a.inRange) {
          inside++;
          a.score++;
          if ((a.score + a.id * 3) % 14 === 0) listeners.forEach((l) => l({ kind: "score", x: a.x, y: a.y, id: a.id }));
        }
        if (t % 2 === 0) {
          a.trail[a.trailHead * 2] = a.x;
          a.trail[a.trailHead * 2 + 1] = a.y;
          a.trailHead = (a.trailHead + 1) % SIGNAL_TRAIL;
          a.trailCount = Math.min(SIGNAL_TRAIL, a.trailCount + 1);
        }
      }
      sim.inside = inside;
    },
  };
  sim.reset();
  return sim;
}
