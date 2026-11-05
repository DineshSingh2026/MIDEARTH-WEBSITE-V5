/**
 * The MidEarth Core: a wordless, living orrery of the agent economy (Canvas 2D, projected 3D).
 *
 *  - Core: the planet at the centre, in the dome mascot's gradient (green core, cyan, brand blue).
 *  - Crown: the tilted ring of the eight products. Brightness is status: live burns, beta glows.
 *    Live products are fed by light from the core.
 *  - Agents: every agent on the live leaderboard is a bead of its own colour on one of three orbits
 *    (top earners closest to the core), trailing a comet tail.
 *  - Arena: the live product node. Its halo fills with the seats taken in open pools and its
 *    heartbeat quickens as the next lock nears. A filled seat fires a shockwave.
 *  - Chat: a real message is a packet of light thrown from one agent to another.
 *  - Value: gold leaves the arena and settles on five fine rings (the revenue pillars),
 *    at a rate driven by real lifetime earnings. Two gates on the outer ring are the chain
 *    touches: funds arriving from Solana, and withdrawals leaving.
 *
 * The world is static; the camera turns. Every collection has a hard cap, every loop a fixed bound.
 * Pure drawing code, no React. The host component owns the canvas, the loop and the data feed.
 */
import { CONCEPTS, type Status } from "@/content/site";
import type { ChatT, LeaderT } from "@/lib/arena/schemas";

export type RGB = readonly [number, number, number];
export type Palette = {
  ink: RGB;
  dim: RGB;
  signal: RGB;
  agent: RGB;
  value: RGB;
  frost: RGB;
  light: boolean;
};

const TAU = Math.PI * 2;
const F = 7; // camera distance in world units
const CORE_R = 0.4;
const RING_R = 1;
const RING_INC = 0.17;
const RING_NODE = 0.55;
const PILLAR_R = [1.36, 1.43, 1.5, 1.57, 1.64] as const;
const GATE_IN = 2.2;
const GATE_OUT = 5.15;
const BASE_PITCH = 0.56;

const MAX_AGENTS = 28;
const MAX_GOLD = 80;
const MAX_GLINTS = 64;
const MAX_ARCS = 6;
const MAX_SPARKS = 72;
const MAX_WAVES = 6;
const MAX_MOTES = 4;
const DUST = 64;
const SEG_RING = 120;
const SEG_SPHERE = 36;

const ORBITS = [
  { r: 0.64, inc: 1.02, node: 0.7, speed: 0.36, cap: 4 },
  { r: 0.84, inc: -0.74, node: 2.3, speed: -0.26, cap: 8 },
  { r: 1.2, inc: 0.44, node: 4.1, speed: 0.17, cap: 16 },
] as const;

/** the logo dome gradient */
const BRAND: RGB[] = [
  [0x57, 0xff, 0x5e],
  [0x3e, 0xdb, 0x8e],
  [0x36, 0xbf, 0xb0],
  [0x2a, 0x9b, 0xf0],
];

/** crown order follows the agent cycle: context, compete, reputation, rent, revenue */
const CROWN = ["context-pools", "predictions", "agent2agent", "debates", "social", "rankings", "rent", "platform-fees"];
const ARENA_SLUG = "agent2agent";

/* ───────────── small math ───────────── */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`;
const WHITE: RGB = [255, 255, 255];

export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function hexToRgb(hex: string | null | undefined): RGB | null {
  if (!hex) return null;
  const h = hex.trim().replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** deterministic PRNG so the composition (dust, still frame) is identical on every load */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type V3 = { x: number; y: number; z: number };

/** point on a circular orbit of radius r, inclined by inc about X, turned by node about Y */
function orbitPoint(r: number, inc: number, node: number, a: number, o: V3) {
  const px = r * Math.cos(a);
  const pz = r * Math.sin(a);
  const y1 = -pz * Math.sin(inc);
  const z1 = pz * Math.cos(inc);
  o.x = px * Math.cos(node) + z1 * Math.sin(node);
  o.y = y1;
  o.z = -px * Math.sin(node) + z1 * Math.cos(node);
  return o;
}

/* ───────────── sprites (cached glow textures) ───────────── */

const sprites = new Map<string, HTMLCanvasElement>();
function sprite(c: RGB, kind: "glow" | "bead", light: boolean) {
  const key = `${c[0] | 0},${c[1] | 0},${c[2] | 0}|${kind}|${light ? 1 : 0}`;
  let s = sprites.get(key);
  if (s) return s;
  if (sprites.size > 96) sprites.clear();
  s = document.createElement("canvas");
  const n = 64;
  s.width = n;
  s.height = n;
  const x = s.getContext("2d");
  if (x) {
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    if (kind === "glow") {
      g.addColorStop(0, rgba(c, 1));
      g.addColorStop(0.22, rgba(c, 0.42));
      g.addColorStop(0.55, rgba(c, 0.1));
      g.addColorStop(1, rgba(c, 0));
    } else {
      const hot = light ? c : mix(c, WHITE, 0.65);
      g.addColorStop(0, rgba(hot, 1));
      g.addColorStop(0.14, rgba(c, 1));
      g.addColorStop(0.24, rgba(c, 0.45));
      g.addColorStop(0.5, rgba(c, light ? 0.06 : 0.12));
      g.addColorStop(1, rgba(c, 0));
    }
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
  }
  sprites.set(key, s);
  return s;
}

/* ───────────── scene state ───────────── */

type Crown = { slug: string; status: Status; a: number; p: V3 };
type Agent = {
  id: string;
  col: RGB | null;
  orbit: number;
  phase: number;
  size: number;
  alpha: number;
  target: number;
  flash: number;
  sp: number;
};
type Gold = {
  r0: number;
  th0: number;
  y0: number;
  ring: number;
  dth: number;
  t: number;
  dur: number;
};
type Glint = { ring: number; th: number; t: number; life: number; sp: number };
type Arc = {
  from: string | null;
  to: string | null;
  t: number;
  dur: number;
  col: RGB | null;
};
type Spark = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  life: number;
};
type Mote = { kind: "in" | "out"; t: number; dur: number };

export type ArenaState = {
  fill: number;
  open: number;
  lockSec: number;
  running: boolean;
  paid: number;
};

export class CoreScene {
  time = 0;
  private reveal = 0;
  private still = false;
  private yaw = 0;
  private pYaw = 0;
  private pPitch = 0;
  private tYaw = 0;
  private tPitch = 0;

  private crown: Crown[];
  private arena: Crown;
  private agents: Agent[] = [];
  private gold: Gold[] = [];
  private glints: Glint[] = [];
  private arcs: Arc[] = [];
  private sparks: Spark[] = [];
  private waves: number[] = [];
  private motes: Mote[] = [];
  private energy = [0.2, 0.2, 0.2, 0.2, 0.2];
  private goldAcc = 0;
  private moteIn = 3;
  private moteOut = 7;
  private dust: V3[] = [];
  private dustA: number[] = [];
  private rnd = prng(7);

  arenaState: ArenaState = {
    fill: 0,
    open: 0,
    lockSec: 0,
    running: false,
    paid: 0,
  };

  // scratch
  private q: V3 = { x: 0, y: 0, z: 0 };
  private pr = { x: 0, y: 0, z: 0, s: 1 };
  private cx = 0;
  private cy = 0;
  private S = 1;
  private cosY = 1;
  private sinY = 0;
  private cosP = 1;
  private sinP = 0;

  constructor() {
    const status = new Map(CONCEPTS.map((c) => [c.slug, c.status] as const));
    this.crown = CROWN.map((slug, i) => {
      const a = (i / CROWN.length) * TAU + 0.35;
      return {
        slug,
        status: status.get(slug) ?? ("BETA" as Status),
        a,
        p: orbitPoint(RING_R, RING_INC, RING_NODE, a, { x: 0, y: 0, z: 0 }),
      };
    });
    this.arena = this.crown.find((c) => c.slug === ARENA_SLUG) ?? this.crown.find((c) => c.status === "LIVE") ?? this.crown[0];
    const r = prng(11);
    for (let i = 0; i < DUST; i++) {
      const u = r() * 2 - 1;
      const th = r() * TAU;
      const rad = 2.1 + r() * 1.6;
      const k = Math.sqrt(1 - u * u);
      this.dust.push({
        x: rad * k * Math.cos(th),
        y: rad * u * 0.75,
        z: rad * k * Math.sin(th),
      });
      this.dustA.push(0.25 + r() * 0.75);
    }
  }

  /* ── data in ── */

  setAgents(leaders: LeaderT[]) {
    const sorted = [...leaders].sort((a, b) => b.earned - a.earned).slice(0, MAX_AGENTS);
    const max = Math.max(1, ...sorted.map((l) => l.earned));
    const keep = new Set(sorted.map((l) => l.agent_id));
    for (const a of this.agents) if (!keep.has(a.id)) a.target = 0;
    const count = [0, 0, 0];
    for (const a of this.agents) if (a.target > 0) count[a.orbit]++;
    sorted.forEach((l, rank) => {
      const col = hexToRgb(l.color);
      const size = 2.4 + 2 * Math.sqrt(Math.max(0, l.earned) / max);
      const ex = this.agents.find((a) => a.id === l.agent_id);
      if (ex) {
        ex.col = col;
        ex.size = size;
        ex.target = 1;
        return;
      }
      if (this.agents.length >= MAX_AGENTS * 2) return;
      let orbit = rank < ORBITS[0].cap ? 0 : rank < ORBITS[0].cap + ORBITS[1].cap ? 1 : 2;
      while (orbit < 2 && count[orbit] >= ORBITS[orbit].cap) orbit++;
      const h = hash01(l.agent_id);
      const n = ORBITS[orbit].cap;
      const slot = count[orbit]++;
      this.agents.push({
        id: l.agent_id,
        col,
        orbit,
        phase: (slot / n) * TAU + h * 0.5,
        size,
        alpha: 0,
        target: 1,
        flash: 0,
        sp: 0.85 + h * 0.3,
      });
    });
  }

  setArena(s: ArenaState) {
    this.arenaState = s;
    const g = this.goldLevel();
    for (let i = 0; i < 5; i++) this.energy[i] = Math.max(this.energy[i], 0.15 + g * 0.35);
  }

  private goldLevel() {
    return clamp01(Math.log10(1 + Math.max(0, this.arenaState.paid)) / 5.5);
  }

  chat(msg: ChatT, list: ChatT[]) {
    if (this.arcs.length >= MAX_ARCS) return;
    const present = (id: string | null | undefined) => (id ? (this.agents.find((a) => a.id === id && a.target > 0) ?? null) : null);
    const from = present(msg.agent_id);
    let to = msg.reply_to ? present(list.find((m) => m.id === msg.reply_to)?.agent_id) : null;
    if (!to || to === from) {
      const others = this.agents.filter((a) => a.target > 0 && a !== from);
      if (others.length) to = others[Math.floor(hash01(msg.id) * others.length) % others.length];
    }
    if (!from && !to) return;
    if (from) from.flash = 1;
    this.arcs.push({
      from: from?.id ?? null,
      to: to?.id ?? null,
      t: 0,
      dur: 1.15,
      col: from?.col ?? hexToRgb(msg.color),
    });
  }

  slot(delta: number) {
    const n = Math.max(1, Math.min(3, Math.round(delta)));
    for (let i = 0; i < n && this.waves.length < MAX_WAVES; i++) this.waves.push(-i * 0.18);
    const p = this.arena.p;
    for (let i = 0; i < 10 * n && this.sparks.length < MAX_SPARKS; i++) {
      const u = this.rnd() * 2 - 1;
      const th = this.rnd() * TAU;
      const k = Math.sqrt(1 - u * u);
      const v = 0.25 + this.rnd() * 0.45;
      this.sparks.push({
        x: p.x,
        y: p.y,
        z: p.z,
        vx: k * Math.cos(th) * v,
        vy: u * v,
        vz: k * Math.sin(th) * v,
        t: 0,
        life: 0.9 + this.rnd() * 0.7,
      });
    }
    for (let i = 0; i < 2 * n; i++) this.spawnGold();
  }

  pointer(nx: number, ny: number) {
    this.tYaw = Math.max(-1, Math.min(1, nx)) * 0.2;
    this.tPitch = Math.max(-1, Math.min(1, ny)) * 0.08;
  }

  /* ── time ── */

  private spawnGold() {
    if (this.gold.length >= MAX_GOLD) return;
    const p = this.arena.p;
    const r0 = Math.hypot(p.x, p.z);
    this.gold.push({
      r0,
      th0: Math.atan2(p.z, p.x),
      y0: p.y,
      ring: Math.floor(this.rnd() * 5) % 5,
      dth: 1.1 + this.rnd() * 1.6,
      t: 0,
      dur: 2.6 + this.rnd() * 1.2,
    });
  }

  step(dt: number) {
    if (!(dt > 0)) return;
    this.time += dt;
    this.reveal = easeOutExpo(clamp01(this.time / 2.6));
    const k = 1 - Math.exp(-dt * 2.4);
    this.pYaw += (this.tYaw - this.pYaw) * k;
    this.pPitch += (this.tPitch - this.pPitch) * k;
    this.yaw += dt * 0.045;
    if (this.yaw > TAU) this.yaw -= TAU;

    for (const a of this.agents) {
      a.alpha += (a.target - a.alpha) * (1 - Math.exp(-dt * 1.6));
      a.flash = Math.max(0, a.flash - dt * 1.4);
    }
    for (let i = this.agents.length - 1; i >= 0; i--) if (this.agents[i].target === 0 && this.agents[i].alpha < 0.01) this.agents.splice(i, 1);

    // value: gold leaves the arena at a rate set by real lifetime earnings
    const g = this.goldLevel();
    const live = this.agents.length > 0 || this.arenaState.open > 0;
    if (live) {
      this.goldAcc += dt * (0.35 + 1.9 * g);
      let guard = 0;
      while (this.goldAcc >= 1 && guard++ < 8) {
        this.goldAcc -= 1;
        this.spawnGold();
      }
      if (this.goldAcc > 1) this.goldAcc = 0;
    }
    for (let i = this.gold.length - 1; i >= 0; i--) {
      const p = this.gold[i];
      p.t += dt;
      if (p.t >= p.dur) {
        this.energy[p.ring] = Math.min(1, this.energy[p.ring] + 0.07);
        if (this.glints.length < MAX_GLINTS)
          this.glints.push({
            ring: p.ring,
            th: p.th0 + p.dth,
            t: 0,
            life: 4 + this.rnd() * 3,
            sp: 0.16 + this.rnd() * 0.12,
          });
        this.gold.splice(i, 1);
      }
    }
    for (let i = this.glints.length - 1; i >= 0; i--) {
      const gl = this.glints[i];
      gl.t += dt;
      gl.th += gl.sp * dt;
      if (gl.t >= gl.life) this.glints.splice(i, 1);
    }
    const floor = 0.15 + g * 0.3;
    for (let i = 0; i < 5; i++) this.energy[i] = floor + (this.energy[i] - floor) * Math.exp(-dt * 0.12);

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.t += dt;
      if (a.t >= a.dur) {
        const to = a.to ? this.agents.find((x) => x.id === a.to) : null;
        if (to) to.flash = 1;
        if (a.t >= a.dur + 0.5) this.arcs.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt;
      const damp = Math.exp(-dt * 2.2);
      s.vx *= damp;
      s.vy *= damp;
      s.vz *= damp;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.t >= s.life) this.sparks.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      this.waves[i] += dt;
      if (this.waves[i] > 1.6) this.waves.splice(i, 1);
    }

    // chain touches: funds arrive from Solana, withdrawals leave
    if (live) {
      this.moteIn -= dt;
      this.moteOut -= dt;
      if (this.moteIn <= 0 && this.motes.length < MAX_MOTES) {
        this.moteIn = 8 + this.rnd() * 4;
        this.motes.push({ kind: "in", t: 0, dur: 3.6 });
      }
      if (this.moteOut <= 0 && this.motes.length < MAX_MOTES) {
        this.moteOut = 10 + this.rnd() * 5;
        this.motes.push({ kind: "out", t: 0, dur: 2.8 });
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      this.motes[i].t += dt;
      if (this.motes[i].t >= this.motes[i].dur) this.motes.splice(i, 1);
    }
  }

  /** composed still frame (reduced motion): fully revealed, no transients, value resting on the rings */
  settle() {
    this.still = true;
    this.time = 19;
    this.reveal = 1;
    this.yaw = 0.25;
    this.pYaw = this.pPitch = this.tYaw = this.tPitch = 0;
    this.gold.length = 0;
    this.arcs.length = 0;
    this.sparks.length = 0;
    this.waves.length = 0;
    this.motes.length = 0;
    this.glints.length = 0;
    for (const a of this.agents) {
      a.alpha = a.target;
      a.flash = 0;
    }
    const g = this.goldLevel();
    const r = prng(23);
    for (let ring = 0; ring < 5; ring++) {
      this.energy[ring] = 0.2 + g * 0.4;
      const n = 2 + Math.round(g * 3);
      for (let j = 0; j < n && this.glints.length < MAX_GLINTS; j++) this.glints.push({ ring, th: r() * TAU, t: 1, life: 4, sp: 0 });
    }
  }

  resume() {
    this.still = false;
  }

  /* ── projection ── */

  private camera() {
    const yaw = this.yaw + this.pYaw;
    const pitch = BASE_PITCH + this.pPitch;
    this.cosY = Math.cos(yaw);
    this.sinY = Math.sin(yaw);
    this.cosP = Math.cos(pitch);
    this.sinP = Math.sin(pitch);
  }

  /** world → screen, written into this.pr; z > 0 is behind the core */
  private proj(x: number, y: number, z: number, depthScale = 1) {
    const x1 = x * this.cosY + z * this.sinY;
    const z1 = -x * this.sinY + z * this.cosY;
    const y2 = y * this.cosP - z1 * this.sinP;
    const z2 = y * this.sinP + z1 * this.cosP;
    const s = F / (F + z2 * depthScale);
    const pr = this.pr;
    pr.x = this.cx + x1 * this.S * s;
    pr.y = this.cy + y2 * this.S * s;
    pr.z = z2;
    pr.s = s;
    return pr;
  }

  private agentPos(a: Agent, t: number, o: V3) {
    const ob = ORBITS[a.orbit];
    return orbitPoint(ob.r, ob.inc, ob.node, a.phase + ob.speed * a.sp * t, o);
  }

  /* ── drawing ── */

  /**
   * Draw a circle-like polyline split by depth. layer 0 = behind the core, 1 = in front.
   * fn writes the world point for parameter u in [0, 1].
   */
  private strokeLoop(ctx: CanvasRenderingContext2D, layer: 0 | 1, seg: number, frac: number, fn: (u: number, o: V3) => V3) {
    const q = this.q;
    let pen = false;
    let px = 0;
    let py = 0;
    let pz = 0;
    const n = Math.max(2, Math.min(512, Math.floor(seg * frac)));
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      fn((i / seg) % 1, q);
      const p = this.proj(q.x, q.y, q.z);
      if (i > 0) {
        const back = (pz + p.z) / 2 > 0;
        if (back === (layer === 0)) {
          if (!pen) ctx.moveTo(px, py);
          ctx.lineTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      px = p.x;
      py = p.y;
      pz = p.z;
    }
    ctx.stroke();
  }

  private blit(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, r: number, a: number) {
    if (!(r > 0.2) || !(a > 0.004)) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette, unit: number) {
    if (!(w > 8) || !(h > 8)) return;
    const L = pal.light;
    const t = this.time;
    const rv = this.still ? 1 : this.reveal;
    const add: GlobalCompositeOperation = L ? "source-over" : "lighter";
    const glowK = L ? 0.5 : 1;

    this.cx = w / 2;
    this.cy = h / 2 - unit * 0.025;
    this.S = unit * 0.28 * (0.9 + 0.1 * rv);
    this.camera();
    const px = Math.max(0.78, unit / 600); // pixel scale relative to a 600px stage
    const compact = unit < 460; // phones: fewer elements, shorter tails, no dust or gates

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const ink = pal.ink;
    const tone = (s: Status): RGB => (s === "LIVE" ? pal.signal : s === "BETA" ? pal.agent : pal.dim);
    const core: RGB[] = [mix(BRAND[0], pal.signal, 0.3), mix(BRAND[1], pal.signal, 0.3), mix(BRAND[2], pal.agent, 0.3), mix(BRAND[3], pal.agent, 0.3)];
    const arenaTone = this.arenaState.running ? pal.value : pal.signal;
    const g = this.goldLevel();

    /* dust: a slow far parallax layer */
    if (!compact) {
      const sY = this.cosY;
      const sX = this.sinY;
      const dy = 0.35;
      const cY = Math.cos(this.yaw * dy + this.pYaw * 0.5);
      const sY2 = Math.sin(this.yaw * dy + this.pYaw * 0.5);
      this.cosY = cY;
      this.sinY = sY2;
      ctx.fillStyle = rgba(L ? pal.dim : pal.frost, 1);
      for (let i = 0; i < this.dust.length; i++) {
        const d = this.dust[i];
        const p = this.proj(d.x, d.y, d.z);
        const a = this.dustA[i] * (L ? 0.22 : 0.3) * rv * (0.55 + 0.45 * Math.sin(t * 0.6 + i * 1.7));
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        const r = (0.5 + this.dustA[i] * 0.8) * px * p.s;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      this.cosY = sY;
      this.sinY = sX;
    }

    /* atmosphere behind everything */
    ctx.globalCompositeOperation = add;
    const breath = 0.85 + 0.15 * Math.sin(t * 0.9);
    const rcPx = CORE_R * this.S * (F / Math.sqrt(F * F - CORE_R * CORE_R));
    this.blit(ctx, sprite(core[1], "glow", L), this.cx, this.cy, rcPx * (L ? 2.6 : 3.6 + 0.3 * this.arenaState.fill) * rv, (L ? 0.14 : 0.34) * breath * rv);
    if (!L) this.blit(ctx, sprite(core[3], "glow", L), this.cx, this.cy + rcPx * 0.3, rcPx * 6.2 * rv, 0.12 * rv);

    for (const layer of [0, 1] as const) {
      const depthA = layer === 0 ? 0.55 : 1;

      /* pillar rings: five fine gold rings, brighter as value settles on them */
      ctx.globalCompositeOperation = L ? "source-over" : "lighter";
      for (let i = 0; i < 5; i++) {
        const r = PILLAR_R[i];
        ctx.strokeStyle = rgba(pal.value, ((L ? 0.16 : 0.06) + this.energy[i] * (L ? 0.3 : 0.24)) * depthA);
        ctx.lineWidth = (0.7 + this.energy[i] * 0.5) * px;
        this.strokeLoop(ctx, layer, SEG_RING, rv, (u, o) => {
          o.x = r * Math.cos(u * TAU);
          o.y = 0;
          o.z = r * Math.sin(u * TAU);
          return o;
        });
      }

      /* agent orbit paths */
      ctx.strokeStyle = rgba(L ? ink : pal.frost, (L ? 0.1 : 0.07) * depthA);
      ctx.lineWidth = 0.75 * px;
      for (const ob of ORBITS) this.strokeLoop(ctx, layer, 96, rv, (u, o) => orbitPoint(ob.r, ob.inc, ob.node, u * TAU, o));

      /* the crown ring */
      ctx.strokeStyle = rgba(L ? ink : pal.frost, (L ? 0.26 : 0.24) * depthA);
      ctx.lineWidth = 1 * px;
      this.strokeLoop(ctx, layer, SEG_RING, rv, (u, o) => orbitPoint(RING_R, RING_INC, RING_NODE, u * TAU, o));
      // lit arcs: the ring burns around products that are lit
      for (const c of this.crown) {
        const lit = c.status === "LIVE" ? 1 : c.status === "BETA" ? 0.6 : 0.4;
        ctx.strokeStyle = rgba(tone(c.status), (L ? 0.5 : 0.42) * lit * depthA * rv);
        for (const [span, lw] of [
          [0.42, 1.1],
          [0.2, 1.8],
        ] as const) {
          ctx.lineWidth = lw * px;
          const n = 14;
          ctx.beginPath();
          let pen = false;
          for (let j = 0; j <= n; j++) {
            const a = c.a - span + (2 * span * j) / n;
            orbitPoint(RING_R, RING_INC, RING_NODE, a, this.q);
            const p = this.proj(this.q.x, this.q.y, this.q.z);
            if (p.z > 0 !== (layer === 0)) {
              pen = false;
              continue;
            }
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          }
          ctx.stroke();
        }
      }

      /* spokes: light flows from the core to every lit product */
      for (let i = 0; i < this.crown.length; i++) {
        const c = this.crown[i];
        if (c.status !== "LIVE" && c.status !== "BETA") continue;
        const mid = this.proj(c.p.x * 0.6, c.p.y * 0.6, c.p.z * 0.6);
        if (mid.z > 0 !== (layer === 0)) continue;
        const a0 = this.proj(c.p.x * (CORE_R / RING_R) * 1.05, c.p.y * (CORE_R / RING_R) * 1.05, c.p.z * (CORE_R / RING_R) * 1.05);
        const ax = a0.x;
        const ay = a0.y;
        const b = this.proj(c.p.x, c.p.y, c.p.z);
        const col = tone(c.status);
        const grad = ctx.createLinearGradient(ax, ay, b.x, b.y);
        grad.addColorStop(0, rgba(col, 0));
        grad.addColorStop(1, rgba(col, (L ? 0.35 : 0.3) * depthA * rv));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.9 * px;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (!this.still) {
          const period = c.status === "LIVE" ? 2.4 : 3.8;
          const u = easeInOut(((t + i * 0.7) % period) / period);
          const f = CORE_R / RING_R + (1 - CORE_R / RING_R) * u;
          const p = this.proj(c.p.x * f, c.p.y * f, c.p.z * f);
          this.blit(ctx, sprite(col, "bead", L), p.x, p.y, 7 * px * p.s, Math.sin(u * Math.PI) * 0.9 * depthA * rv);
        }
      }

      /* chain gates on the outer ring */
      if (!compact)
        for (const [th, kind] of [
          [GATE_IN, "in"],
          [GATE_OUT, "out"],
        ] as const) {
          const r = PILLAR_R[4] + 0.07;
          const p = this.proj(r * Math.cos(th), 0, r * Math.sin(th));
          if (p.z > 0 !== (layer === 0)) continue;
          const col = kind === "in" ? pal.frost : pal.value;
          const d = 3.2 * px * p.s;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(L ? mix(col, ink, 0.35) : col, 0.75 * depthA * rv);
          ctx.lineWidth = 1 * px;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - d);
          ctx.lineTo(p.x + d, p.y);
          ctx.lineTo(p.x, p.y + d);
          ctx.lineTo(p.x - d, p.y);
          ctx.closePath();
          ctx.stroke();
          this.blit(ctx, sprite(col, "glow", L), p.x, p.y, 16 * px * p.s, 0.22 * glowK * depthA * rv);
        }

      /* glints: value resting and circling on the pillar rings */
      ctx.globalCompositeOperation = add;
      const goldBead = sprite(pal.value, "bead", L);
      for (const gl of this.glints) {
        const r = PILLAR_R[gl.ring];
        const p = this.proj(r * Math.cos(gl.th), 0, r * Math.sin(gl.th));
        if (p.z > 0 !== (layer === 0)) continue;
        const life = this.still ? 0.8 : Math.min(1, gl.t / 0.4) * (1 - clamp01((gl.t - gl.life + 1.5) / 1.5));
        const a = life * depthA * rv;
        // short tail along the ring
        ctx.strokeStyle = rgba(pal.value, 0.5 * a);
        ctx.lineWidth = 1.4 * px * p.s;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        for (let j = 1; j <= 6; j++) {
          const th = gl.th - j * 0.03;
          const q = this.proj(r * Math.cos(th), 0, r * Math.sin(th));
          ctx.lineTo(q.x, q.y);
        }
        ctx.globalAlpha = 1;
        ctx.stroke();
        const p2 = this.proj(r * Math.cos(gl.th), 0, r * Math.sin(gl.th));
        this.blit(ctx, goldBead, p2.x, p2.y, 10 * px * p2.s, a);
      }

      /* gold leaving the arena, spiralling out to the pillars */
      for (const gd of this.gold) {
        const u = gd.t / gd.dur;
        const e = easeInOut(u);
        const r = gd.r0 + (PILLAR_R[gd.ring] - gd.r0) * e;
        const th = gd.th0 + gd.dth * e;
        const y = gd.y0 * (1 - e);
        const p = this.proj(r * Math.cos(th), y, r * Math.sin(th));
        if (p.z > 0 !== (layer === 0)) continue;
        const a = Math.min(1, u * 5) * depthA * rv * (0.7 + 0.3 * g);
        const hx = p.x;
        const hy = p.y;
        const hs = p.s;
        ctx.strokeStyle = rgba(pal.value, 0.4 * a);
        ctx.lineWidth = 1.1 * px * hs;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        for (let j = 1; j <= 5; j++) {
          const e2 = easeInOut(Math.max(0, u - j * 0.025));
          const r2 = gd.r0 + (PILLAR_R[gd.ring] - gd.r0) * e2;
          const th2 = gd.th0 + gd.dth * e2;
          const q = this.proj(r2 * Math.cos(th2), gd.y0 * (1 - e2), r2 * Math.sin(th2));
          ctx.lineTo(q.x, q.y);
        }
        ctx.globalAlpha = 1;
        ctx.stroke();
        this.blit(ctx, goldBead, hx, hy, 9 * px * hs, a);
      }

      /* chain motes */
      if (!compact)
        for (const m of this.motes) {
          const u = clamp01(m.t / m.dur);
          const e = easeInOut(u);
          let r: number;
          let th: number;
          if (m.kind === "in") {
            r = 2.4 + (CORE_R * 1.1 - 2.4) * e;
            th = GATE_IN + 0.9 * e;
          } else {
            r = PILLAR_R[4] + 0.07 + 0.9 * e;
            th = GATE_OUT - 0.25 * e;
          }
          const p = this.proj(r * Math.cos(th), 0, r * Math.sin(th));
          if (p.z > 0 !== (layer === 0)) continue;
          const col = m.kind === "in" ? pal.frost : pal.value;
          const a = Math.sin(u * Math.PI) * depthA * rv;
          this.blit(ctx, sprite(col, "bead", L), p.x, p.y, 8 * px * p.s, a);
          this.blit(ctx, sprite(col, "glow", L), p.x, p.y, 20 * px * p.s, 0.25 * a * glowK);
        }

      /* crown nodes */
      ctx.globalCompositeOperation = "source-over";
      for (const c of this.crown) {
        const p = this.proj(c.p.x, c.p.y, c.p.z);
        if (p.z > 0 !== (layer === 0)) continue;
        const col = c === this.arena ? arenaTone : tone(c.status);
        const s = p.s * px;
        const x = p.x;
        const y = p.y;
        ctx.globalAlpha = rv * depthA;
        if (c.status === "BETA") {
          ctx.globalCompositeOperation = add;
          this.blit(ctx, sprite(col, "glow", L), x, y, (c.status === "BETA" ? 22 : 16) * s, (c.status === "BETA" ? 0.32 : 0.22) * glowK * depthA * rv);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = rv * depthA;
          ctx.strokeStyle = rgba(col, 0.9);
          ctx.lineWidth = 1.1 * px;
          ctx.beginPath();
          ctx.arc(x, y, 4.2 * s, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = rgba(col, 1);
          ctx.beginPath();
          ctx.arc(x, y, (c.status === "BETA" ? 1.9 : 1.4) * s, 0, TAU);
          ctx.fill();
          continue;
        }
        // LIVE
        ctx.globalCompositeOperation = add;
        const beat = c === this.arena ? this.heartbeat(t) : 0.5 + 0.5 * Math.sin(t * 1.4);
        this.blit(ctx, sprite(col, "glow", L), x, y, (30 + 8 * beat) * s, (0.4 + 0.2 * beat) * glowK * depthA * rv);
        this.blit(ctx, sprite(col, "bead", L), x, y, 13 * s, depthA * rv);
        if (c === this.arena) this.drawArena(ctx, x, y, s, col, depthA * rv, L);
        ctx.globalCompositeOperation = "source-over";
      }

      /* agents */
      ctx.globalCompositeOperation = add;
      const q = this.q;
      const agentCap = compact ? 16 : MAX_AGENTS * 2;
      const tail = compact ? 7 : 10;
      for (let i = 0; i < this.agents.length && i < agentCap; i++) {
        const ag = this.agents[i];
        const stagger = this.still ? 1 : clamp01((t - 0.8 - i * 0.05) / 0.9);
        const a = ag.alpha * stagger * rv;
        if (a < 0.01) continue;
        this.agentPos(ag, t, q);
        const p = this.proj(q.x, q.y, q.z);
        if (p.z > 0 !== (layer === 0)) continue;
        const base = ag.col ?? pal.agent;
        const col = L ? mix(base, ink, 0.28) : base;
        const hx = p.x;
        const hy = p.y;
        const hs = p.s;
        const ob = ORBITS[ag.orbit];
        const dir = Math.sign(ob.speed) || 1;
        const ang = ag.phase + ob.speed * ag.sp * t;
        // comet tail along the orbit
        let lx = hx;
        let ly = hy;
        ctx.lineWidth = ag.size * 0.75 * px * hs;
        for (let j = 1; j <= tail; j++) {
          orbitPoint(ob.r, ob.inc, ob.node, ang - dir * j * 0.045, q);
          const tp = this.proj(q.x, q.y, q.z);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(col, (1 - j / (tail + 1)) * 0.42 * a * depthA);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(tp.x, tp.y);
          ctx.stroke();
          lx = tp.x;
          ly = tp.y;
        }
        const f = ag.flash;
        if (f > 0.02) this.blit(ctx, sprite(col, "glow", L), hx, hy, (14 + 22 * f) * px * hs, 0.55 * f * glowK * depthA);
        this.blit(ctx, sprite(col, "bead", L), hx, hy, ag.size * (3.4 + f * 1.4) * px * hs, a * depthA);
      }

      /* chat: light thrown from agent to agent */
      for (const arc of this.arcs) {
        this.drawArc(ctx, arc, layer, pal, px, depthA * rv);
      }

      /* sparks from a filled seat */
      for (const s of this.sparks) {
        const p = this.proj(s.x, s.y, s.z);
        if (p.z > 0 !== (layer === 0)) continue;
        const u = s.t / s.life;
        this.blit(ctx, sprite(arenaTone, "bead", L), p.x, p.y, 5 * px * p.s, (1 - u) * depthA);
      }

      /* the core sits between the two layers */
      if (layer === 0) this.drawCore(ctx, core, pal, rcPx, rv, t, px);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  private heartbeat(t: number) {
    const lock = this.arenaState.lockSec;
    const period = this.arenaState.running ? 1.1 : lock > 0 ? Math.max(1.2, Math.min(3.2, lock / 45)) : 3.2;
    const ph = (t % period) / period;
    return Math.exp(-ph * 6);
  }

  private drawArena(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: RGB, a: number, L: boolean) {
    const t = this.time;
    const st = this.arenaState;
    ctx.globalCompositeOperation = "source-over";
    // seat halo: the share of seats taken in open pools
    const R = 11 * s;
    ctx.globalAlpha = a;
    ctx.lineWidth = 1 * s;
    ctx.strokeStyle = rgba(L ? [0, 0, 0] : [255, 255, 255], L ? 0.12 : 0.14);
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.stroke();
    const fill = clamp01(st.fill);
    if (fill > 0) {
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.02, fill));
      ctx.stroke();
    }
    // heartbeat ring
    if (!this.still) {
      const lock = st.lockSec;
      const period = st.running ? 1.1 : lock > 0 ? Math.max(1.2, Math.min(3.2, lock / 45)) : 3.2;
      const ph = (t % period) / period;
      const e = easeOutExpo(ph);
      ctx.strokeStyle = rgba(col, (1 - ph) * 0.5);
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(x, y, R + e * 16 * s, 0, TAU);
      ctx.stroke();
    }
    // shockwaves from filled seats
    for (const w of this.waves) {
      if (w < 0) continue;
      const u = w / 1.6;
      const e = easeOutExpo(u);
      ctx.strokeStyle = rgba(col, (1 - u) * 0.8);
      ctx.lineWidth = (2 - u) * s;
      ctx.beginPath();
      ctx.arc(x, y, R + e * 60 * s, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawArc(ctx: CanvasRenderingContext2D, arc: Arc, layer: 0 | 1, pal: Palette, px: number, a: number) {
    const t = this.time;
    const pos = (id: string | null, o: V3) => {
      const ag = id ? this.agents.find((x) => x.id === id) : null;
      if (ag) return this.agentPos(ag, t, o);
      o.x = this.arena.p.x;
      o.y = this.arena.p.y;
      o.z = this.arena.p.z;
      return o;
    };
    const A = pos(arc.from, { x: 0, y: 0, z: 0 });
    const B = pos(arc.to, { x: 0, y: 0, z: 0 });
    // control point: lifted above the core so the packet arcs over it
    const C = {
      x: (A.x + B.x) * 0.25,
      y: Math.min(A.y, B.y) - 0.55,
      z: (A.z + B.z) * 0.25,
    };
    const col = arc.col ?? pal.agent;
    const L = pal.light;
    const c2 = L ? mix(col, pal.ink, 0.25) : col;
    const u = clamp01(arc.t / arc.dur);
    const head = easeInOut(u);
    const fade = arc.t > arc.dur ? 1 - clamp01((arc.t - arc.dur) / 0.5) : 1;
    const tailLen = 0.4;
    const n = 18;
    const pt = (k: number) => {
      const m = 1 - k;
      return this.proj(m * m * A.x + 2 * m * k * C.x + k * k * B.x, m * m * A.y + 2 * m * k * C.y + k * k * B.y, m * m * A.z + 2 * m * k * C.z + k * k * B.z);
    };
    // faint full path, then the bright travelling packet
    ctx.globalAlpha = 1;
    ctx.lineWidth = 0.8 * px;
    ctx.strokeStyle = rgba(c2, 0.14 * a * fade);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const p = pt(i / n);
      if (p.z > 0 !== (layer === 0)) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
      pen = true;
    }
    ctx.stroke();
    const from = Math.max(0, head - tailLen);
    let prev = pt(from);
    let lx = prev.x;
    let ly = prev.y;
    let lz = prev.z;
    for (let i = 1; i <= 10; i++) {
      const k = from + ((head - from) * i) / 10;
      prev = pt(k);
      if ((lz + prev.z) / 2 > 0 === (layer === 0)) {
        ctx.strokeStyle = rgba(c2, (i / 10) * 0.9 * a * fade);
        ctx.lineWidth = (0.6 + (i / 10) * 1.6) * px;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(prev.x, prev.y);
        ctx.stroke();
      }
      lx = prev.x;
      ly = prev.y;
      lz = prev.z;
    }
    if (u < 1 && lz > 0 === (layer === 0)) this.blit(ctx, sprite(col, "bead", L), lx, ly, 9 * px, a * fade);
  }

  private drawCore(ctx: CanvasRenderingContext2D, core: RGB[], pal: Palette, rc: number, rv: number, t: number, px: number) {
    const L = pal.light;
    const cx = this.cx;
    const cy = this.cy;
    const r = rc * (0.94 + 0.06 * rv);
    if (!(r > 1)) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = rv;
    // body: lit from the upper right, like the mascot
    if (L) {
      ctx.save();
      ctx.shadowColor = rgba(pal.ink, 0.22);
      ctx.shadowBlur = 36 * px;
      ctx.shadowOffsetY = 14 * px;
    }
    const g = ctx.createRadialGradient(cx + r * 0.34, cy - r * 0.4, 0, cx + r * 0.1, cy - r * 0.1, r * 1.45);
    g.addColorStop(0, rgba(core[0], 1));
    g.addColorStop(0.4, rgba(core[1], 1));
    g.addColorStop(0.74, rgba(core[2], 1));
    g.addColorStop(1, rgba(core[3], 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    if (L) ctx.restore();
    ctx.globalAlpha = rv;
    // the logo's blue underlight
    const ul = ctx.createLinearGradient(cx - r * 0.5, cy + r, cx + r * 0.3, cy - r * 0.2);
    ul.addColorStop(0, rgba(mix(BRAND[3], pal.agent, 0.3), 0.85));
    ul.addColorStop(1, rgba(BRAND[3], 0));
    ctx.fillStyle = ul;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();

    // fine meridians and parallels, turning with the world
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = rgba(WHITE, L ? 0.3 : 0.22);
    ctx.lineWidth = 0.7 * px;
    const spin = t * 0.08;
    const R = CORE_R;
    ctx.beginPath();
    for (let m = 0; m < 10; m++) {
      const lon = spin + (m / 10) * Math.PI;
      let pen = false;
      for (let i = 0; i <= SEG_SPHERE; i++) {
        const lat = (i / SEG_SPHERE) * TAU;
        const x = R * Math.cos(lat) * Math.cos(lon);
        const z = R * Math.cos(lat) * Math.sin(lon);
        const y = R * Math.sin(lat);
        const p = this.proj(x, y, z);
        if (p.z > 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        pen = true;
      }
    }
    for (const lat of [-1.05, -0.55, 0, 0.55, 1.05]) {
      let pen = false;
      const rr = R * Math.cos(lat);
      const y = R * Math.sin(lat);
      for (let i = 0; i <= SEG_SPHERE; i++) {
        const lon = (i / SEG_SPHERE) * TAU;
        const p = this.proj(rr * Math.cos(lon), y, rr * Math.sin(lon));
        if (p.z > 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        pen = true;
      }
    }
    ctx.stroke();
    // terminator: shade the lower left limb for volume
    const sh = ctx.createRadialGradient(cx + r * 0.45, cy - r * 0.5, r * 0.6, cx + r * 0.2, cy - r * 0.2, r * 1.6);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, `rgba(0,18,40,${L ? 0.28 : 0.45})`);
    ctx.fillStyle = sh;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    // rim light and specular
    ctx.globalCompositeOperation = L ? "source-over" : "lighter";
    ctx.strokeStyle = rgba(WHITE, L ? 0.55 : 0.4);
    ctx.lineWidth = 1 * px;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, -Math.PI * 0.95, -Math.PI * 0.05);
    ctx.stroke();
    this.blit(ctx, sprite(WHITE, "glow", L), cx + r * 0.4, cy - r * 0.45, r * 0.7, (L ? 0.35 : 0.3) * rv);
    ctx.globalAlpha = 1;
  }
}
