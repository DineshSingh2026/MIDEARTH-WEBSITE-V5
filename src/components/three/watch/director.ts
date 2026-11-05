/**
 * Director: the scene's single source of truth. Owns the REAL Territory Control sim (src/sim/territory.ts),
 * steps it on a fixed 20 Hz clock, turns state changes into events (claims, flips, settles) and
 * exposes everything renderers need as preallocated arrays. No per-frame allocation.
 */
import { createTerritory, type TerritorySim } from "@/sim/territory";
import { AGENT_COLORS, DT } from "@/sim/rng";

export const SIM_AGENTS = 10;
export const GRID = 40;
export const N_TILES = GRID * GRID;
/** board edge length in world units (the hologram is centred on the origin) */
export const BOARD = 3.95;
export const BOARD_Y = 1.32;
export const MAX_SPECTATORS = 12;

/** Live data written by the React side (stage), read by the scene. Plain mutable object. */
export type LiveFeed = {
  colors: string[];
  names: string[];
  lockText: string;
  seatText: string;
  seatFill: number;
  status: "pending" | "live" | "snapshot";
  version: number;
  /** pending chat pulses (agent id hash + colour), consumed by the director */
  chats: { key: number; color: string }[];
  /** recent public chat for quiet-time ambience */
  recent: { key: number; color: string }[];
};

export const createFeed = (): LiveFeed => ({
  colors: [],
  names: [],
  lockText: "CONNECTING",
  seatText: "",
  seatFill: 0,
  status: "pending",
  version: 0,
  chats: [],
  recent: [],
});

export const hashKey = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const HOLD_AFTER_END = 3.2;
const CHAT_REPLAY_EVERY = 7.5;
const CHAT_QUIET = 18;

export class Director {
  sim: TerritorySim;
  feed: LiveFeed;
  time = 0;
  private acc = 0;
  private seedBase = 11;
  /** interpolation alpha between the previous and current sim step */
  alpha = 0;
  prevX = new Float32Array(SIM_AGENTS);
  prevY = new Float32Array(SIM_AGENTS);
  private prevOwner = new Int16Array(N_TILES);
  /** time of the most recent claim/flip per tile (scene seconds), and its kind (1 claim, 2 flip) */
  tileAt = new Float32Array(N_TILES).fill(-99);
  tileKind = new Uint8Array(N_TILES);
  /** bumped whenever tile state changed (renderers re-upload attributes) */
  tileVersion = 0;
  /** flip shockwaves: ring buffer */
  readonly waveCap = 12;
  waveX = new Float32Array(12);
  waveZ = new Float32Array(12);
  waveAt = new Float32Array(12).fill(-99);
  waveColor: string[] = new Array(12).fill("#ffffff");
  private waveIdx = 0;
  /** excitement 0..1 (flips raise it, it decays) and moments */
  excite = 0;
  lastFlipAt = -99;
  lastFlipX = 0;
  lastFlipZ = 0;
  reactAt = -99;
  settleAt = -99;
  private holdUntil = 0;
  /** gaze target in world space, smoothed */
  gazeX = 0;
  gazeZ = 0;
  leaderId = 0;
  private leaderTimer = 0;
  /** per spectator chat flash 0..1 + colour */
  chatFlash = new Float32Array(MAX_SPECTATORS);
  chatColor: string[] = new Array(MAX_SPECTATORS).fill("#38c6e4");
  chatAt = new Float32Array(MAX_SPECTATORS).fill(-99);
  spectators = 4;
  private lastLiveChat = -99;
  private replayT = 3;
  private replayIdx = 0;
  matchNo = 1;
  private seenVersion = -1;

  constructor(feed: LiveFeed) {
    this.feed = feed;
    this.sim = createTerritory({ seed: this.seedBase, agents: SIM_AGENTS, colors: feed.colors.length ? feed.colors : AGENT_COLORS });
    this.warm(9);
  }

  /** pre-simulate so the first frame is mid-match */
  private warm(sec: number) {
    const steps = Math.round(sec / DT);
    for (let i = 0; i < steps && !this.sim.ended; i++) this.sim.step();
    this.prevOwner.set(this.sim.owner);
    for (const a of this.sim.agents) {
      this.prevX[a.id] = a.x;
      this.prevY[a.id] = a.y;
    }
    this.tileAt.fill(-99);
    this.tileVersion++;
  }

  setColors(colors: readonly string[]) {
    if (colors.length) this.sim.setColors(colors);
    this.tileVersion++;
  }

  /** tile index → world x/z (centre) */
  tileX(ix: number) {
    return ((ix + 0.5) / GRID - 0.5) * BOARD;
  }
  agentWorld(i: number, out: { x: number; z: number }) {
    const a = this.sim.agents[i];
    const px = this.prevX[i] + (a.x - this.prevX[i]) * this.alpha;
    const py = this.prevY[i] + (a.y - this.prevY[i]) * this.alpha;
    out.x = (px / GRID - 0.5) * BOARD;
    out.z = (py / GRID - 0.5) * BOARD;
    return out;
  }

  chat(key: number, color: string, live: boolean) {
    const n = Math.max(1, this.spectators);
    const s = key % n;
    this.chatFlash[s] = 1;
    this.chatAt[s] = this.time;
    this.chatColor[s] = color;
    if (live) this.lastLiveChat = this.time;
  }

  private spawnWave(x: number, z: number, color: string) {
    const i = this.waveIdx;
    this.waveIdx = (i + 1) % this.waveCap;
    this.waveX[i] = x;
    this.waveZ[i] = z;
    this.waveAt[i] = this.time;
    this.waveColor[i] = color;
  }

  update(dt: number) {
    dt = Math.min(0.05, Math.max(0, dt));
    this.time += dt;
    const sim = this.sim;
    const t = this.time;

    // live leaderboard colours → sim agents
    if (this.feed.version !== this.seenVersion) {
      this.seenVersion = this.feed.version;
      if (this.feed.colors.length) this.setColors(this.feed.colors);
    }

    // live chats
    const q = this.feed.chats;
    while (q.length) {
      const c = q.shift()!;
      this.chat(c.key, c.color, true);
    }
    this.replayT += dt;
    if (this.replayT > CHAT_REPLAY_EVERY) {
      this.replayT = 0;
      const r = this.feed.recent;
      if (r.length && t - this.lastLiveChat > CHAT_QUIET) {
        const m = r[this.replayIdx % r.length];
        this.replayIdx = (this.replayIdx + 1) % 100000;
        this.chat(m.key + this.replayIdx, m.color, false);
      }
    }
    for (let i = 0; i < MAX_SPECTATORS; i++) this.chatFlash[i] *= Math.exp(-dt * 1.6);

    // match lifecycle
    if (sim.ended) {
      if (t >= this.holdUntil) {
        this.matchNo++;
        sim.reset(this.seedBase + this.matchNo);
        if (this.feed.colors.length) sim.setColors(this.feed.colors);
        this.warm(1.5);
      }
    } else {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= DT && steps < 4) {
        this.acc -= DT;
        steps++;
        for (const a of sim.agents) {
          this.prevX[a.id] = a.x;
          this.prevY[a.id] = a.y;
        }
        sim.step();
        this.scanTiles();
        if (sim.ended) {
          this.settleAt = t;
          this.reactAt = t;
          this.excite = 1;
          this.holdUntil = t + HOLD_AFTER_END;
          this.acc = 0;
          break;
        }
      }
      if (steps === 4) this.acc = 0;
      this.alpha = sim.ended ? 1 : Math.min(1, this.acc / DT);
    }

    this.excite *= Math.exp(-dt * 0.55);

    // leader (1 Hz, no allocation)
    this.leaderTimer -= dt;
    if (this.leaderTimer <= 0) {
      this.leaderTimer = 1;
      let best = 0;
      for (const a of sim.agents) if (a.tiles > sim.agents[best].tiles) best = a.id;
      this.leaderId = best;
    }

    // gaze: last flip for a moment, otherwise follow the leader
    let gx: number;
    let gz: number;
    if (t - this.lastFlipAt < 1.6) {
      gx = this.lastFlipX;
      gz = this.lastFlipZ;
    } else {
      const a = sim.agents[this.leaderId];
      gx = (a.x / GRID - 0.5) * BOARD;
      gz = (a.y / GRID - 0.5) * BOARD;
    }
    const k = 1 - Math.exp(-dt * 2.2);
    this.gazeX += (gx - this.gazeX) * k;
    this.gazeZ += (gz - this.gazeZ) * k;
  }

  private scanTiles() {
    const sim = this.sim;
    const owner = sim.owner;
    const prev = this.prevOwner;
    const t = this.time;
    let changed = false;
    for (let i = 0; i < N_TILES; i++) {
      const o = owner[i];
      const p = prev[i];
      if (o === p) continue;
      prev[i] = o;
      changed = true;
      this.tileAt[i] = t;
      if (p >= 0 && o >= 0) {
        this.tileKind[i] = 2;
        const x = this.tileX(i % GRID);
        const z = this.tileX((i / GRID) | 0);
        this.lastFlipAt = t;
        this.lastFlipX = x;
        this.lastFlipZ = z;
        this.excite = Math.min(1, this.excite + 0.28);
        this.spawnWave(x, z, sim.agents[o].color);
        if (t - this.reactAt > 1.4) this.reactAt = t;
      } else this.tileKind[i] = 1;
    }
    // flip progress / frozen state also change every step
    if (changed || sim.claimed > 0) this.tileVersion++;
  }
}
