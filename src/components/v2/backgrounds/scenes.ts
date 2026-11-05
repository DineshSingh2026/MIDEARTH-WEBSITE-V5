/**
 * Data backgrounds, luxury pass. Each one is still a calm, true picture of what its section is about,
 * now painted with light and material: additive light on dark themes (cached bloom sprites, gradient-lit
 * strokes, glints, out-of-focus far layers), and fine ink engraving with mineral pigment on light themes.
 *
 * Craft rules: slow rhythm (6–20s cycles), sine/expo easing only, restrained palettes from theme tokens
 * (value = gold, signal = live, agent = cool, lux = the theme's own signature light), the text column stays
 * clean (the section mask fades the left side; scenes keep their weight on the right).
 * Perf rules: every loop is bounded by a fixed count, geometry is precomputed in `init` into typed arrays,
 * gradients are cached per palette version and positioned with translate, no shadowBlur, no per-frame arrays.
 */
import { BUSINESS, PILLARS } from "@/content/site";
import { FACTS } from "@/content/facts";
import { bump, clamp01, easeInOut, easeOutCubic, easeOutExpo, easeSine, hash01, rgba, type Palette, type Scene } from "./engine";

const TAU = Math.PI * 2;

/* ───────────────────────── shared drawing helpers ───────────────────────── */

const rrect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** sample a cubic bezier into `out` (n points, flat x,y) */
function sampleCubic(out: Float32Array, o: number, n: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  for (let j = 0; j < n; j++) {
    const u = j / (n - 1);
    const v = 1 - u;
    out[o + j * 2] = v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3;
    out[o + j * 2 + 1] = v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3;
  }
}
/** sample a quadratic bezier into `out` */
function sampleQuad(out: Float32Array, n: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  for (let j = 0; j < n; j++) {
    const u = j / (n - 1);
    const v = 1 - u;
    out[j * 2] = v * v * x0 + 2 * v * u * cx + u * u * x1;
    out[j * 2 + 1] = v * v * y0 + 2 * v * u * cy + u * u * y1;
  }
}

let AX = 0;
let AY = 0;
/** point at u∈[0,1] along a sampled polyline (writes AX/AY, no allocation) */
function at(a: Float32Array, o: number, n: number, u: number) {
  const f = clamp01(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const r = f - i;
  AX = a[o + i * 2] + (a[o + i * 2 + 2] - a[o + i * 2]) * r;
  AY = a[o + i * 2 + 1] + (a[o + i * 2 + 3] - a[o + i * 2 + 1]) * r;
}

/** stroke [u0,u1] of a sampled polyline, the tail fading out: a light trace */
function trail(ctx: CanvasRenderingContext2D, a: Float32Array, o: number, n: number, u0: number, u1: number, c: string, alpha: number, lw: number) {
  // medium motion: tails about 40% shorter, moving accents at a medium opacity
  if (u1 > u0) u0 = u1 - (u1 - u0) * 0.6;
  alpha *= 0.7;
  const K = 5;
  ctx.strokeStyle = c;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  for (let k = 0; k < K; k++) {
    const s0 = clamp01(u0 + ((u1 - u0) * k) / K);
    const s1 = clamp01(u0 + ((u1 - u0) * (k + 1)) / K);
    if (s1 <= s0) continue;
    const q = (k + 1) / K;
    ctx.globalAlpha = Math.min(1, alpha * q * q);
    ctx.beginPath();
    at(a, o, n, s0);
    ctx.moveTo(AX, AY);
    const i0 = Math.ceil(s0 * (n - 1));
    const i1 = Math.floor(s1 * (n - 1));
    for (let i = i0; i <= i1; i++) ctx.lineTo(a[o + i * 2], a[o + i * 2 + 1]);
    at(a, o, n, s1);
    ctx.lineTo(AX, AY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
}

function strokePoly(ctx: CanvasRenderingContext2D, a: Float32Array, o: number, n: number) {
  ctx.beginPath();
  ctx.moveTo(a[o], a[o + 1]);
  for (let i = 1; i < n; i++) ctx.lineTo(a[o + i * 2], a[o + i * 2 + 1]);
  ctx.stroke();
}

const dotA = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number) => {
  if (a <= 0.004) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
};
const ringA = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number, lw = 0.8) => {
  if (a <= 0.004 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.strokeStyle = c;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

/** a gradient with alpha stops in one colour, built once per palette version */
function linGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string, stops: number[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], rgba(c, stops[i + 1]));
  return g;
}

/** glass slab: frosted fill lit from above, a specular edge falling off across the diagonal, two refraction streaks */
type GlassG = { ver: number; bw: number; bh: number; fill: CanvasGradient; edgeP: CanvasGradient; edgeS: CanvasGradient };
function glassGrads(ctx: CanvasRenderingContext2D, p: Palette, bw: number, bh: number, prev: GlassG | null): GlassG {
  if (prev && prev.ver === p.ver && prev.bw === bw && prev.bh === bh) return prev;
  const L = p.light;
  return {
    ver: p.ver,
    bw,
    bh,
    fill: L ? linGrad(ctx, 0, 0, 0, bh, p.paper, [0, 0.015, 1, 0.05]) : (() => {
      const g = ctx.createLinearGradient(0, 0, 0, bh);
      g.addColorStop(0, rgba(p.hi, 0.075));
      g.addColorStop(0.5, rgba(p.lux, 0.012));
      g.addColorStop(1, rgba(p.lux, 0.04));
      return g;
    })(),
    edgeP: (() => {
      const g = ctx.createLinearGradient(0, 0, bw, bh);
      g.addColorStop(0, rgba(L ? p.paper : p.hi, L ? 0.42 : 0.5));
      g.addColorStop(0.45, rgba(L ? p.paper : p.lux, L ? 0.16 : 0.1));
      g.addColorStop(1, rgba(L ? p.paper : p.lux, L ? 0.3 : 0.24));
      return g;
    })(),
    edgeS: (() => {
      const g = ctx.createLinearGradient(0, 0, bw, bh);
      g.addColorStop(0, rgba(L ? p.signal : p.hi, L ? 0.6 : 0.62));
      g.addColorStop(0.45, rgba(p.signal, L ? 0.3 : 0.26));
      g.addColorStop(1, rgba(p.signal, L ? 0.5 : 0.5));
      return g;
    })(),
  };
}
function glass(ctx: CanvasRenderingContext2D, x: number, y: number, g: GlassG, r: number, sealed: boolean, p: Palette, a: number) {
  const { bw, bh } = g;
  ctx.translate(x, y);
  ctx.globalAlpha = a;
  rrect(ctx, 0, 0, bw, bh, r);
  ctx.fillStyle = g.fill;
  ctx.fill();
  ctx.strokeStyle = sealed ? g.edgeS : g.edgeP;
  ctx.lineWidth = 1;
  ctx.stroke();
  // refraction: two parallel streaks across the face
  ctx.strokeStyle = p.light ? p.paper : p.hi;
  ctx.globalAlpha = a * (p.light ? 0.07 : 0.11);
  ctx.beginPath();
  ctx.moveTo(bw * 0.14, bh - 3);
  ctx.lineTo(bw * 0.36, 3);
  ctx.moveTo(bw * 0.24, bh - 3);
  ctx.lineTo(bw * 0.4, bh * 0.35);
  ctx.stroke();
  if (p.light) {
    // engraved inner line: the thickness of the glass
    rrect(ctx, 2.5, 2.5, bw - 5, bh - 5, Math.max(1, r - 2));
    ctx.globalAlpha = a * 0.13;
    ctx.strokeStyle = sealed ? p.signal : p.paper;
    ctx.stroke();
  }
  ctx.translate(-x, -y);
  ctx.globalAlpha = 1;
}

/* ───────────────── network — agents (a 3D constellation) exchanging messages along curved geodesics ───────────────── */
type Net = {
  n: number;
  X: Float32Array;
  Y: Float32Array;
  Z: Float32Array;
  hub: Uint8Array;
  E: Uint16Array;
  ne: number;
  px: Float32Array;
  py: Float32Array;
  pd: Float32Array;
  ps: Float32Array;
  lit: Float32Array;
  litC: Uint8Array;
  motes: Float32Array;
  nm: number;
  cx: number;
  cy: number;
  R: number;
  curve: Float32Array;
};
const NET_CS = 24;
const NET_BAND_A = [0.05, 0.1, 0.18];
const NET_BAND_A_INK = [0.05, 0.09, 0.15];
const NET_BAND_W = [0.6, 0.8, 1];
const NET_BAND_W_INK = [0.5, 0.65, 0.85];
type Tone = "signal" | "agent" | "value" | "hot" | "frost";
/** control point of the curved edge a→b: the screen midpoint pushed away from the constellation centre */
function netCtrl(s: Net, a: number, b: number) {
  const mx = (s.px[a] + s.px[b]) / 2;
  const my = (s.py[a] + s.py[b]) / 2;
  const dx = mx - s.cx;
  const dy = my - s.cy;
  const d = Math.hypot(dx, dy) || 1;
  const len = Math.hypot(s.px[b] - s.px[a], s.py[b] - s.py[a]);
  AX = mx + (dx / d) * len * 0.2;
  AY = my + (dy / d) * len * 0.2;
}
export const network: Scene<Net> = {
  still: 9.5,
  init(w, h, rand, lite) {
    const n = lite ? 26 : Math.round(Math.min(64, Math.max(34, (w * h) / 16000)));
    const X = new Float32Array(n);
    const Y = new Float32Array(n);
    const Z = new Float32Array(n);
    const hub = new Uint8Array(n);
    let k = 0;
    for (let tries = 0; k < n && tries < n * 60; tries++) {
      // a soft ellipsoid shell, denser toward the outside (reads as a globe of agents)
      const th = rand() * TAU;
      const ph = Math.acos(2 * rand() - 1);
      const r = 0.42 + 0.58 * Math.sqrt(rand());
      const x = r * Math.sin(ph) * Math.cos(th) * 1.25;
      const y = r * Math.cos(ph) * 0.78;
      const z = r * Math.sin(ph) * Math.sin(th);
      let ok = true;
      for (let j = 0; j < k && ok; j++) if ((X[j] - x) ** 2 + (Y[j] - y) ** 2 + (Z[j] - z) ** 2 < 0.034) ok = false;
      if (!ok) continue;
      X[k] = x;
      Y[k] = y;
      Z[k] = z;
      hub[k] = rand() < 0.15 ? 1 : 0;
      k++;
    }
    const nn = k;
    const seen = new Set<number>();
    const edges: number[] = [];
    const d2 = new Float32Array(nn);
    const idx: number[] = [];
    for (let i = 0; i < nn; i++) {
      idx.length = 0;
      for (let j = 0; j < nn; j++) {
        d2[j] = (X[i] - X[j]) ** 2 + (Y[i] - Y[j]) ** 2 + (Z[i] - Z[j]) ** 2;
        if (j !== i) idx.push(j);
      }
      idx.sort((u, v) => d2[u] - d2[v]);
      const kk = hub[i] ? 4 : 2;
      for (let q = 0; q < kk && q < idx.length; q++) {
        const j = idx[q];
        const key = i < j ? i * 4096 + j : j * 4096 + i;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push(i, j);
      }
    }
    const nm = lite ? 8 : 22;
    const motes = new Float32Array(nm * 4);
    for (let i = 0; i < nm; i++) {
      motes[i * 4] = w * (0.45 + rand() * 0.55);
      motes[i * 4 + 1] = h * rand();
      motes[i * 4 + 2] = rand();
      motes[i * 4 + 3] = rand() * TAU;
    }
    return {
      n: nn,
      X,
      Y,
      Z,
      hub,
      E: Uint16Array.from(edges),
      ne: edges.length / 2,
      px: new Float32Array(nn),
      py: new Float32Array(nn),
      pd: new Float32Array(nn),
      ps: new Float32Array(nn),
      lit: new Float32Array(nn),
      litC: new Uint8Array(nn),
      motes,
      nm,
      cx: w * 0.72,
      cy: h * 0.46,
      R: Math.min(w * 0.3, h * 0.6),
      curve: new Float32Array(NET_CS * 2),
    };
  },
  draw(ctx, s, t, p, w, h, fx) {
    const L = p.light;
    const yaw = t * 0.028 + fx.par * 0.35;
    const pitch = 0.3 + fx.par * 0.06;
    const cyw = Math.cos(yaw);
    const syw = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    for (let i = 0; i < s.n; i++) {
      const x1 = s.X[i] * cyw - s.Z[i] * syw;
      const z1 = s.X[i] * syw + s.Z[i] * cyw;
      const y1 = s.Y[i] * cp - z1 * sp;
      const z2 = s.Y[i] * sp + z1 * cp;
      const sc = 2.8 / (2.8 + z2);
      s.px[i] = s.cx + x1 * s.R * sc;
      s.py[i] = s.cy + y1 * s.R * sc;
      s.ps[i] = sc;
      s.pd[i] = clamp01(0.5 - z2 * 0.48); // 1 = near, 0 = far
      s.lit[i] = 0;
    }
    fx.light();
    // volumetric core + drifting far motes (depth of field)
    fx.glow(s.cx, s.cy, s.R * 1.25, p.lux, 0.07);
    if (!L)
      for (let i = 0; i < s.nm; i++) {
        const o = i * 4;
        const dep = s.motes[o + 2];
        const x = s.motes[o] + Math.sin(t * 0.05 + s.motes[o + 3]) * 14 + fx.par * 40 * (0.4 + dep);
        const y = s.motes[o + 1] + Math.cos(t * 0.04 + s.motes[o + 3]) * 10 - fx.par * 30 * dep;
        fx.bokeh(x, y, 3 + dep * 9, p.lux, 0.05 + dep * 0.05);
      }
    // edges in three depth bands: far ones thin and faint, near ones lit
    ctx.strokeStyle = L ? p.paper : p.lux;
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = (L ? NET_BAND_A_INK : NET_BAND_A)[b];
      ctx.lineWidth = (L ? NET_BAND_W_INK : NET_BAND_W)[b];
      ctx.beginPath();
      for (let e = 0; e < s.ne; e++) {
        const a = s.E[e * 2];
        const c = s.E[e * 2 + 1];
        const d = (s.pd[a] + s.pd[c]) / 2;
        if ((d < 0.36 ? 0 : d < 0.62 ? 1 : 2) !== b) continue;
        netCtrl(s, a, c);
        ctx.moveTo(s.px[a], s.py[a]);
        ctx.quadraticCurveTo(AX, AY, s.px[c], s.py[c]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // message pulses: light tracing a geodesic, blooming on arrival
    const lanes = fx.lite ? 4 : 7;
    const T = 6.4;
    for (let l = 0; l < lanes; l++) {
      const off = (l / lanes) * T;
      const cyc = Math.floor((t + off) / T);
      const u = ((t + off) / T) % 1;
      const e = Math.floor(hash01(l, cyc) * s.ne);
      if (e >= s.ne) continue;
      const fwd = hash01(cyc, l + 7) < 0.5;
      const a = fwd ? s.E[e * 2] : s.E[e * 2 + 1];
      const b = fwd ? s.E[e * 2 + 1] : s.E[e * 2];
      const gold = hash01(l, cyc + 3) < 0.3; // value moving between agents
      const col = gold ? p.value : p.signal;
      const dep = (s.pd[a] + s.pd[b]) / 2;
      const k = 0.45 + dep * 0.55;
      if (u < 0.64) {
        const q = easeSine(u / 0.64);
        netCtrl(s, a, b);
        sampleQuad(s.curve, NET_CS, s.px[a], s.py[a], AX, AY, s.px[b], s.py[b]);
        trail(ctx, s.curve, 0, NET_CS, q - 0.32, q, col, (L ? 0.75 : 0.8) * k, L ? 1.1 : 1.4);
        at(s.curve, 0, NET_CS, q);
        fx.glow(AX, AY, 16 * k, col, 0.55 * k);
        dotA(ctx, AX, AY, 1.5, L ? col : p.hi, 0.9 * k);
        s.lit[a] = Math.max(s.lit[a], 0.6 * (1 - u / 0.64));
        s.litC[a] = gold ? 1 : 0;
      } else {
        const r = (u - 0.64) / 0.36;
        const e2 = easeOutCubic(r);
        if (1 - r > s.lit[b]) {
          s.lit[b] = 1 - r;
          s.litC[b] = gold ? 1 : 0;
        }
        fx.glow(s.px[b], s.py[b], 12 + e2 * 34, col, 0.42 * (1 - r) * k);
        ringA(ctx, s.px[b], s.py[b], 3 + e2 * 24, col, 0.45 * (1 - r) * k, 0.8);
      }
    }
    // nodes: far = out of focus, near = crisp light with a soft bloom
    for (let i = 0; i < s.n; i++) {
      const d = s.pd[i];
      const g = s.lit[i];
      const x = s.px[i];
      const y = s.py[i];
      const hub = s.hub[i] === 1;
      const lc = s.litC[i] ? p.value : p.signal;
      if (d < 0.34 && g < 0.05) {
        fx.bokeh(x, y, 4 + (0.34 - d) * 26, L ? p.paper : p.lux, L ? 0.22 : 0.09);
        continue;
      }
      const sc = 0.55 + d * 0.6;
      fx.glow(x, y, (hub ? 18 : 10) * sc * (1 + g * 0.8), g > 0.05 ? lc : p.lux, (0.22 + g * 0.5) * d);
      dotA(ctx, x, y, (hub ? 2.1 : 1.35) * sc + g, L ? (g > 0.05 ? lc : p.paper) : g > 0.05 ? (s.litC[i] ? p.glo.value : p.glo.signal) : p.hi,(L ? 0.55 : 0.75) * (0.4 + d * 0.6) + g * 0.3);
      if (hub) ringA(ctx, x, y, 6.5 * sc, L ? p.paper : p.lux, (L ? 0.3 : 0.26) * d, 0.7);
    }
    fx.normal();
    void w;
    void h;
  },
};

/* ───────────────── territory — the live 40×40 game floor in perspective; claimed tiles glow like embers ───────────────── */
type Terr = {
  C: number;
  R: number;
  cx: number;
  rowY: Float32Array;
  rowS: Float32Array;
  cc: Uint8Array;
  cr: Uint8Array;
  own: Uint8Array;
  at: Float32Array;
  lvl: Uint8Array;
  nc: number;
  period: number;
  head: Int16Array;
  gv: number;
  grid: CanvasGradient | null;
  hy: number;
};
const TEAM: Tone[] = ["signal", "agent", "value", "hot"];
const TERR_A = [0, 0.05, 0.13, 0.32];
const TERR_A_INK = [0, 0.05, 0.1, 0.18];
export const territory: Scene<Terr> = {
  still: 17,
  init(w, h, rand, lite) {
    const C = lite ? 24 : FACTS.grid.w; // the real Territory Control grid is 40×40
    const R = lite ? 24 : FACTS.grid.h;
    const hy = h * 0.06;
    const z0 = 3;
    const tw = Math.max(22, Math.min(34, w / 44)); // near tile width: a fine, receding floor
    const K = (h * 0.98 - hy) * z0;
    const rowY = new Float32Array(R + 1);
    const rowS = new Float32Array(R + 1);
    for (let r = 0; r <= R; r++) {
      const Z = z0 + (R - r); // r = 0 is the far edge, r = R the near edge
      rowY[r] = hy + K / Z;
      rowS[r] = (tw * z0) / Z;
    }
    const owner = new Int16Array(C * R).fill(-1);
    const frontier: number[][] = [[], [], [], []];
    const seeds = [
      [0.42, 0.42],
      [0.62, 0.36],
      [0.46, 0.8],
      [0.6, 0.74],
    ];
    const cc: number[] = [];
    const cr: number[] = [];
    const own: number[] = [];
    const claim = (i: number, o: number) => {
      owner[i] = o;
      const c = i % C;
      const r = Math.floor(i / C);
      cc.push(c);
      cr.push(r);
      own.push(o);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc >= 0 && nr >= 0 && nc < C && nr < R && owner[nr * C + nc] < 0) frontier[o].push(nr * C + nc);
      }
    };
    seeds.forEach(([x, y], o) => claim(Math.floor(y * (R - 1)) * C + Math.floor(x * (C - 1)), o));
    const target = Math.floor(C * R * 0.34);
    for (let guard = 0; cc.length < target && guard < target * 20; guard++) {
      const o = Math.floor(rand() * 4);
      const f = frontier[o];
      if (!f.length) continue;
      const j = Math.floor(rand() * f.length);
      const i = f[j];
      f.splice(j, 1);
      if (owner[i] < 0) claim(i, o);
    }
    const nc = cc.length;
    const STEP = 26 / nc; // one full territory every ~26s
    const at = new Float32Array(nc);
    for (let i = 0; i < nc; i++) at[i] = i * STEP;
    return { C, R, cx: w * 0.7, rowY, rowS, cc: Uint8Array.from(cc), cr: Uint8Array.from(cr), own: Uint8Array.from(own), at, lvl: new Uint8Array(nc), nc, period: nc * STEP + 8, head: new Int16Array(4), gv: -1, grid: null, hy };
  },
  draw(ctx, s, t, p, w, h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.grid) {
      // fog: the floor's lines fade into the distance
      s.grid = linGrad(ctx, 0, s.rowY[0], 0, h, L ? p.paper : p.lux, L ? [0, 0, 0.25, 0.05, 1, 0.12] : [0, 0, 0.2, 0.05, 0.7, 0.13, 1, 0.16]);
      s.gv = p.ver;
    }
    const cx = s.cx + fx.par * 18;
    const half = s.C / 2;
    fx.light();
    // horizon haze
    fx.glow(cx, s.rowY[0], w * 0.42, p.signal, 0.1, 0.16);
    // grid
    ctx.strokeStyle = s.grid;
    ctx.lineWidth = L ? 0.6 : 0.8;
    ctx.beginPath();
    for (let c = 0; c <= s.C; c++) {
      ctx.moveTo(cx + (c - half) * s.rowS[0], s.rowY[0]);
      ctx.lineTo(cx + (c - half) * s.rowS[s.R], s.rowY[s.R]);
    }
    for (let r = 0; r <= s.R; r++) {
      ctx.moveTo(cx - half * s.rowS[r], s.rowY[r]);
      ctx.lineTo(cx + half * s.rowS[r], s.rowY[r]);
    }
    ctx.stroke();
    // tiles: each lives ~70% of the cycle: a bright claim that cools to an ember, then recedes
    const life = s.period * 0.7;
    const tt = t % s.period;
    s.head.fill(-1);
    for (let i = 0; i < s.nc; i++) {
      let age = tt - s.at[i];
      if (age < 0) age += s.period;
      if (age > life) {
        s.lvl[i] = 0;
        continue;
      }
      if (age < 3) s.head[s.own[i]] = i;
      const fade = clamp01((life - age) / 4);
      const heat = age < 1.2 ? 3 : age < 4 ? 2 : 1;
      s.lvl[i] = fade < 0.35 ? 1 : heat;
    }
    for (let o = 0; o < 4; o++) {
      ctx.fillStyle = p[TEAM[o]];
      for (let lv = 1; lv <= 3; lv++) {
        ctx.globalAlpha = (L ? TERR_A_INK : TERR_A)[lv];
        ctx.beginPath();
        for (let i = 0; i < s.nc; i++) {
          if (s.own[i] !== o || s.lvl[i] !== lv) continue;
          const r = s.cr[i];
          const c = s.cc[i];
          const y0 = s.rowY[r];
          const y1 = s.rowY[r + 1];
          if (y1 < 0 || y0 > h) continue;
          const i0 = 0.08;
          const i1 = 0.92;
          const ya = y0 + (y1 - y0) * i0;
          const yb = y0 + (y1 - y0) * i1;
          const sa = s.rowS[r] + (s.rowS[r + 1] - s.rowS[r]) * i0;
          const sb = s.rowS[r] + (s.rowS[r + 1] - s.rowS[r]) * i1;
          ctx.moveTo(cx + (c + i0 - half) * sa, ya);
          ctx.lineTo(cx + (c + i1 - half) * sa, ya);
          ctx.lineTo(cx + (c + i1 - half) * sb, yb);
          ctx.lineTo(cx + (c + i0 - half) * sb, yb);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // fresh claims: a bloom over the tile and a crisp lit outline
    for (let i = 0; i < s.nc; i++) {
      if (s.lvl[i] !== 3) continue;
      let age = tt - s.at[i];
      if (age < 0) age += s.period;
      const f = 1 - easeOutCubic(age / 1.2);
      const r = s.cr[i];
      const c = s.cc[i];
      const ym = (s.rowY[r] + s.rowY[r + 1]) / 2;
      const sm = (s.rowS[r] + s.rowS[r + 1]) / 2;
      const xm = cx + (c + 0.5 - half) * sm;
      fx.glow(xm, ym, sm * 1.5, p[TEAM[s.own[i]]], 0.4 * f, 0.6);
      ctx.globalAlpha = (L ? 0.5 : 0.55) * f;
      ctx.strokeStyle = p.glo[TEAM[s.own[i]]];
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + (c - half) * s.rowS[r], s.rowY[r]);
      ctx.lineTo(cx + (c + 1 - half) * s.rowS[r], s.rowY[r]);
      ctx.lineTo(cx + (c + 1 - half) * s.rowS[r + 1], s.rowY[r + 1]);
      ctx.lineTo(cx + (c - half) * s.rowS[r + 1], s.rowY[r + 1]);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the four agents: a point of light standing on each team's newest tile
    for (let o = 0; o < 4; o++) {
      const i = s.head[o];
      if (i < 0) continue;
      const r = s.cr[i];
      const ym = (s.rowY[r] + s.rowY[r + 1]) / 2;
      const sm = (s.rowS[r] + s.rowS[r + 1]) / 2;
      const xm = cx + (s.cc[i] + 0.5 - half) * sm;
      const k = clamp01(sm / 30);
      fx.glint(xm, ym - sm * 0.18, 10 + 14 * k, p[TEAM[o]], 0.55 + 0.3 * k);
      dotA(ctx, xm, ym - sm * 0.18, 1.2 + 1.4 * k, L ? p[TEAM[o]] : p.hi, 0.9);
    }
    fx.normal();
  },
};

/* ───────────────── flow — the six revenue verticals as liquid-gold ribbons converging into one economy ───────────────── */
const FLOW_N = 40;
type Flow = { n: number; S: number; base: Float32Array; nrm: Float32Array; tmp: Float32Array; hub: [number, number]; trunk: Float32Array; gv: number; g: CanvasGradient | null; gt: CanvasGradient | null; x0: number };
export const flow: Scene<Flow> = {
  still: 6,
  init(w, h, rand, lite) {
    const n = BUSINESS.verticals.length;
    const S = lite ? 3 : 5;
    const hx = w * 0.8;
    const hy = h * 0.5;
    const x0 = w * 0.44;
    const base = new Float32Array(n * FLOW_N * 2);
    const nrm = new Float32Array(n * FLOW_N * 2);
    for (let i = 0; i < n; i++) {
      const y0 = h * (0.12 + (0.76 * i) / (n - 1)) + (rand() - 0.5) * 16;
      sampleCubic(base, i * FLOW_N * 2, FLOW_N, x0 + rand() * w * 0.04, y0, w * 0.6, y0, w * 0.66, hy + (y0 - hy) * 0.12, hx, hy);
      for (let j = 0; j < FLOW_N; j++) {
        const o = i * FLOW_N * 2 + Math.min(FLOW_N - 2, j) * 2;
        const dx = base[o + 2] - base[o];
        const dy = base[o + 3] - base[o + 1];
        const d = Math.hypot(dx, dy) || 1;
        nrm[i * FLOW_N * 2 + j * 2] = -dy / d;
        nrm[i * FLOW_N * 2 + j * 2 + 1] = dx / d;
      }
    }
    const trunk = new Float32Array(16 * 2);
    for (let j = 0; j < 16; j++) {
      trunk[j * 2] = hx + ((w + 20 - hx) * j) / 15;
      trunk[j * 2 + 1] = hy;
    }
    return { n, S, base, nrm, tmp: new Float32Array(FLOW_N * 2), hub: [hx, hy], trunk, gv: -1, g: null, gt: null, x0 };
  },
  draw(ctx, s, t, p, w, h, fx) {
    const L = p.light;
    const [hx, hy] = s.hub;
    if (s.gv !== p.ver || !s.g) {
      s.g = linGrad(ctx, s.x0, 0, hx, 0, p.value, L ? [0, 0, 0.3, 0.16, 1, 0.42] : [0, 0, 0.3, 0.14, 0.8, 0.36, 1, 0.5]);
      s.gt = linGrad(ctx, hx, 0, w, 0, p.value, L ? [0, 0.45, 1, 0.05] : [0, 0.55, 1, 0.04]);
      s.gv = p.ver;
    }
    fx.light();
    let arrive = 0;
    for (let i = 0; i < s.n; i++) {
      const o = i * FLOW_N * 2;
      for (let j = 0; j < s.S; j++) {
        const off = j - (s.S - 1) / 2;
        for (let q = 0; q < FLOW_N; q++) {
          const u = q / (FLOW_N - 1);
          const conv = Math.pow(1 - u, 1.3);
          const d = off * 4.2 * conv + Math.sin(u * 5 + t * 0.32 + i * 1.3 + j * 0.8) * 3.2 * conv;
          s.tmp[q * 2] = s.base[o + q * 2] + s.nrm[o + q * 2] * d;
          s.tmp[q * 2 + 1] = s.base[o + q * 2 + 1] + s.nrm[o + q * 2 + 1] * d;
        }
        ctx.strokeStyle = s.g;
        ctx.globalAlpha = Math.abs(off) > 1.2 ? 0.5 : 1;
        ctx.lineWidth = L ? 0.6 : 0.85;
        strokePoly(ctx, s.tmp, 0, FLOW_N);
      }
      ctx.globalAlpha = 1;
      // a sheen of light gliding along the ribbon (rests between passes)
      const ph = (t * 0.085 + i * 0.19) % 1.35;
      if (ph < 1) {
        const q = easeSine(ph);
        trail(ctx, s.base, o, FLOW_N, q - 0.16, q, L ? p.value : p.hi, L ? 0.55 : 0.6, L ? 1 : 1.3);
        at(s.base, o, FLOW_N, q);
        fx.glow(AX, AY, 14, p.value, 0.5);
        if (ph > 0.9) arrive = Math.max(arrive, (ph - 0.9) / 0.1);
      }
    }
    // the merged economy leaving the platform
    ctx.strokeStyle = s.gt!;
    ctx.lineWidth = L ? 1 : 1.6;
    strokePoly(ctx, s.trunk, 0, 16);
    for (let j = 0; j < 3; j++) {
      const u = ((t * 0.09 + j / 3) % 1);
      trail(ctx, s.trunk, 0, 16, u - 0.2, u, L ? p.value : p.hi, 0.5 * (1 - u), 1.2);
    }
    const br = 0.5 + 0.5 * Math.sin(t * 0.6);
    fx.glow(hx, hy, 80, p.value, 0.16 + br * 0.05 + arrive * 0.12);
    fx.glint(hx, hy, 30, p.value, 0.5 + arrive * 0.3);
    ringA(ctx, hx, hy, 13 + br * 2, p.value, (L ? 0.5 : 0.35) + br * 0.1, 0.8);
    dotA(ctx, hx, hy, 2.6, L ? p.value : p.hi, 0.9);
    fx.normal();
    void h;
  },
};

/* ───────────────── chain — glass blocks gliding along the chain; each is sealed with a soft flare at the settlement line ───────────────── */
type Chain = { lanes: { y: number; bw: number; bh: number; gap: number; speed: number; ph: number; g: GlassG | null }[]; seal: number; gv: number; sg: CanvasGradient | null };
export const chain: Scene<Chain> = {
  still: 14,
  init(w, h, _rand, lite) {
    const lanes: Chain["lanes"] = [{ y: h * 0.36, bw: 66, bh: 42, gap: 34, speed: 9, ph: 0, g: null }];
    if (!lite) lanes.push({ y: h * 0.66, bw: 52, bh: 32, gap: 28, speed: 6.5, ph: 41, g: null });
    return { seal: w * 0.74, lanes, gv: -1, sg: null };
  },
  draw(ctx, s, t, p, w, h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.sg) {
      s.sg = linGrad(ctx, 0, h * 0.1, 0, h * 0.9, p.signal, [0, 0, 0.5, L ? 0.4 : 0.32, 1, 0]);
      s.gv = p.ver;
    }
    fx.light();
    // settlement line + a slow light scanning it
    ctx.strokeStyle = s.sg;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.seal + 0.5, h * 0.1);
    ctx.lineTo(s.seal + 0.5, h * 0.9);
    ctx.stroke();
    const sy = h * (0.12 + 0.76 * easeSine((t * 0.07) % 1));
    fx.glow(s.seal, sy, 7, p.signal, 0.55, 7);
    for (const Ln of s.lanes) {
      Ln.g = glassGrads(ctx, p, Ln.bw, Ln.bh, Ln.g);
      const pitch = Ln.bw + Ln.gap;
      const count = Math.min(60, Math.ceil((w + pitch * 2) / pitch));
      const total = count * pitch;
      const shift = (t * Ln.speed + Ln.ph) % pitch;
      // the chain itself: a hairline with a faint gradient toward the seal
      ctx.strokeStyle = L ? p.paper : p.lux;
      ctx.globalAlpha = L ? 0.12 : 0.1;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, Ln.y);
      ctx.lineTo(w, Ln.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let q = 0; q < count; q++) {
        const bx = total - pitch - shift - q * pitch;
        if (bx < -pitch) break;
        const mid = bx + Ln.bw / 2;
        if (mid < w * 0.5) continue; // settled history dissolves before the text column
        const by = Ln.y - Ln.bh / 2;
        const a = clamp01((mid - w * 0.5) / (w * 0.12));
        const sealed = mid < s.seal;
        glass(ctx, bx, by, Ln.g, 6, sealed, p, a);
        // contents: hash lines
        ctx.fillStyle = L ? p.paper : p.hi;
        ctx.globalAlpha = a * (L ? 0.2 : 0.16);
        ctx.fillRect(bx + 9, by + 9, Ln.bw * 0.46, 1);
        ctx.fillRect(bx + 9, by + 14, Ln.bw * 0.3, 1);
        ctx.globalAlpha = 1;
        if (sealed) {
          fx.glow(mid, Ln.y, Ln.bw * 0.55, p.signal, 0.14 * a);
          // seal mark: a small lit diamond
          const sx = bx + Ln.bw - 11;
          const syy = by + Ln.bh - 10;
          ctx.globalAlpha = a * (L ? 0.7 : 0.75);
          ctx.strokeStyle = p.signal;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(sx, syy - 3.5);
          ctx.lineTo(sx + 3.5, syy);
          ctx.lineTo(sx, syy + 3.5);
          ctx.lineTo(sx - 3.5, syy);
          ctx.closePath();
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // hash pointer to the next block
        const nx = bx - Ln.gap;
        if (nx + Ln.gap > w * 0.5) {
          ctx.strokeStyle = sealed ? p.signal : L ? p.paper : p.lux;
          ctx.globalAlpha = a * (sealed ? 0.35 : 0.18);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(bx, Ln.y);
          ctx.lineTo(nx + 2, Ln.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          dotA(ctx, bx - Ln.gap / 2, Ln.y, 1.4, sealed ? p.signal : L ? p.paper : p.lux, a * 0.6);
        }
        // the seal: a soft flare and an anamorphic streak as the block crosses the line
        const d = Math.abs(mid - s.seal);
        if (d < 40) {
          const f = easeSine(1 - d / 40);
          fx.glow(mid, Ln.y, Ln.bw * 1.1, p.signal, 0.32 * f);
          fx.glow(s.seal, Ln.y, Ln.bw * 2.4, p.hi, 0.26 * f, 0.05);
          fx.glint(s.seal, Ln.y, 26, p.signal, 0.6 * f);
          if (L) ringA(ctx, s.seal, Ln.y, 4 + 10 * f, p.signal, 0.5 * f, 0.8);
        }
      }
    }
    fx.normal();
  },
};

/* ───────────────── ranks — the leaderboard as columns of light that breathe; neighbours trade places ───────────────── */
type Ranks = { tones: string[]; n: number; len: Float32Array; order: Uint8Array; swap: number; swapAt: number; next: number; lastT: number; gv: number; gs: CanvasGradient[]; gr: CanvasGradient[]; floor: CanvasGradient | null; x0: number; x1: number; yb: number; Hm: number };
export const ranks: Scene<Ranks> = {
  still: 3,
  init(w, h, rand, lite) {
    const n = lite ? 7 : 11;
    const len = new Float32Array(n);
    for (let i = 0; i < n; i++) len[i] = 0.96 - i * (0.6 / n) + (rand() - 0.5) * 0.03;
    const order = new Uint8Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    const yb = h * (h < 420 ? 0.84 : 0.8);
    return { tones: [], n, len, order, swap: -1, swapAt: 0, next: 3, lastT: 0, gv: -1, gs: [], gr: [], floor: null, x0: w * 0.56, x1: w * 0.95, yb, Hm: yb - Math.max(h * 0.1, 24) };
  },
  draw(ctx, s, t, p, w, h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.floor) {
      s.tones = [p.value, p.agent, L ? p.paper : p.lux];
      const tones = s.tones;
      // shafts: bright at the score, falling off toward the floor; reflections: a faint mirrored fade
      s.gs = tones.map((c) => linGrad(ctx, 0, -1, 0, 0, c, L ? [0, 0.34, 0.5, 0.12, 1, 0.04] : [0, 0.5, 0.35, 0.16, 1, 0.03]));
      s.gr = tones.map((c) => linGrad(ctx, 0, 0, 0, 1, c, [0, L ? 0.08 : 0.12, 1, 0]));
      s.floor = linGrad(ctx, s.x0 - 30, 0, s.x1 + 20, 0, L ? p.paper : p.lux, [0, 0, 0.15, L ? 0.3 : 0.28, 0.85, L ? 0.3 : 0.28, 1, 0]);
      s.gv = p.ver;
    }
    if (t < s.lastT) {
      s.swap = -1;
      s.next = t + 1.5;
    }
    s.lastT = t;
    if (s.swap < 0 && t > s.next) {
      s.swap = Math.floor(hash01(Math.floor(t)) * (s.n - 1));
      s.swapAt = t;
    }
    let prog = 0;
    if (s.swap >= 0) {
      prog = easeSine((t - s.swapAt) / 2.4);
      if (t - s.swapAt >= 2.4) {
        const a = s.swap;
        const ta = s.order[a];
        s.order[a] = s.order[a + 1];
        s.order[a + 1] = ta;
        const la = s.len[s.order[a]];
        s.len[s.order[a]] = s.len[s.order[a + 1]];
        s.len[s.order[a + 1]] = la;
        s.swap = -1;
        s.next = t + 4.2;
        prog = 0;
      }
    }
    const pitch = (s.x1 - s.x0) / s.n;
    const sw = Math.max(4, Math.min(13, pitch * 0.3));
    fx.light();
    ctx.strokeStyle = s.floor!;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x0 - 30, s.yb + 0.5);
    ctx.lineTo(s.x1 + 20, s.yb + 0.5);
    ctx.stroke();
    fx.glow((s.x0 + s.x1) / 2, s.yb, (s.x1 - s.x0) * 0.55, p.lux, 0.06, 0.08);
    for (let slot = 0; slot < s.n; slot++) {
      let xs = slot;
      const moving = s.swap >= 0 && (slot === s.swap || slot === s.swap + 1);
      if (moving) xs = slot === s.swap ? slot + prog : slot - prog;
      const x = s.x0 + pitch * (xs + 0.5);
      const id = s.order[slot];
      const breathe = 1 + 0.028 * Math.sin(t * 0.55 + id * 1.7);
      const H = s.Hm * s.len[id] * breathe;
      const ti = slot === 0 ? 0 : slot < 3 ? 1 : 2;
      const climber = moving && slot === s.swap + 1;
      const emph = slot === 0 ? 1 : slot < 3 ? 0.8 : 0.55;
      // shaft + its reflection (unit gradients scaled to this column's height)
      ctx.save();
      ctx.translate(x - sw / 2, s.yb);
      ctx.scale(sw, H);
      ctx.globalAlpha = emph;
      ctx.fillStyle = s.gs[ti];
      ctx.fillRect(0, -1, 1, 1);
      ctx.scale(1, 0.28);
      ctx.fillStyle = s.gr[ti];
      ctx.fillRect(0, 0, 1, 1);
      ctx.restore();
      // core filament
      ctx.globalAlpha = (L ? 0.35 : 0.42) * emph;
      ctx.fillStyle = L ? s.tones[ti] : p.hi;
      ctx.fillRect(x - 0.5, s.yb - H, 1, H * 0.55);
      ctx.globalAlpha = 1;
      if (L) {
        // engraved edges
        ctx.globalAlpha = 0.25 * emph;
        ctx.strokeStyle = s.tones[ti];
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x - sw / 2 + 0.5, s.yb - H + 0.5, sw - 1, H);
        ctx.globalAlpha = 1;
      }
      // cap
      const capC = climber ? p.signal : s.tones[ti];
      fx.glow(x, s.yb - H, sw * 2.6, capC, 0.5 * emph + (climber ? 0.3 * bump(prog) : 0));
      if (slot === 0) fx.glint(x, s.yb - H, 24 + 4 * Math.sin(t * 0.8), p.value, 0.62);
      dotA(ctx, x, s.yb - H, slot === 0 ? 2 : 1.4, L ? capC : p.hi, 0.85 * emph);
      if (L) {
        ctx.globalAlpha = 0.6 * emph;
        ctx.fillStyle = capC;
        ctx.fillRect(x - sw / 2 - 3, s.yb - H - 0.5, sw + 6, 1);
        ctx.globalAlpha = 1;
      }
      if (climber) {
        const k = bump(prog);
        fx.glow(x, s.yb - H * 0.5, sw * 2, p.signal, 0.3 * k, 3);
        ringA(ctx, x, s.yb - H, 5 + 8 * k, p.signal, 0.55 * k, 0.8);
      }
    }
    fx.normal();
    void w;
    void h;
  },
};

/* ───────────────── forecast — a crisp realised history to "now", then an aurora of agent forecasts (the confidence fan) ───────────────── */
const FC_N = 30;
type Fc = { hist: Float32Array; hn: number; x0: number; xn: number; x1: number; base: number; M: number; mem: Float32Array; gv: number; gh: CanvasGradient | null; gm: CanvasGradient | null; gb: CanvasGradient | null; gnow: CanvasGradient | null };
function fcBand(ctx: CanvasRenderingContext2D, mem: Float32Array, ka: number, kb: number) {
  const oa = ka * FC_N * 2;
  const ob = kb * FC_N * 2;
  ctx.beginPath();
  ctx.moveTo(mem[oa], mem[oa + 1]);
  for (let i = 1; i < FC_N; i++) ctx.lineTo(mem[oa + i * 2], mem[oa + i * 2 + 1]);
  for (let i = FC_N - 1; i >= 0; i--) ctx.lineTo(mem[ob + i * 2], mem[ob + i * 2 + 1]);
  ctx.closePath();
  ctx.fill();
}
export const forecast: Scene<Fc> = {
  still: 5,
  init(w, h, rand, lite) {
    const x0 = w * 0.44;
    const xn = w * 0.7;
    const x1 = w * 0.97;
    const a = rand() * TAU;
    const hn = 90;
    const hist = new Float32Array(hn * 2);
    for (let i = 0; i < hn; i++) {
      const u = i / (hn - 1);
      hist[i * 2] = x0 + (xn - x0) * u;
      hist[i * 2 + 1] = h * (0.6 - 0.16 * u + 0.05 * Math.sin(u * 9 + a) + 0.022 * Math.sin(u * 23 + a * 2));
    }
    const M = lite ? 7 : 13;
    return { hist, hn, x0, xn, x1, base: h * 0.84, M, mem: new Float32Array(M * FC_N * 2), gv: -1, gh: null, gm: null, gb: null, gnow: null };
  },
  draw(ctx, s, t, p, _w, h, fx) {
    const L = p.light;
    const nx = s.hist[(s.hn - 1) * 2];
    const ny = s.hist[(s.hn - 1) * 2 + 1];
    if (s.gv !== p.ver || !s.gh) {
      s.gh = linGrad(ctx, s.x0, 0, s.xn, 0, L ? p.paper : p.hi, L ? [0, 0.05, 1, 0.7] : [0, 0.04, 1, 0.62]);
      s.gm = linGrad(ctx, nx, 0, s.x1, 0, p.agent, L ? [0, 0.4, 1, 0.05] : [0, 0.42, 0.6, 0.18, 1, 0.02]);
      s.gb = linGrad(ctx, nx, 0, s.x1, 0, L ? p.agent : p.frost, L ? [0, 0.1, 1, 0.01] : [0, 0.12, 1, 0]);
      s.gnow = linGrad(ctx, 0, h * 0.1, 0, s.base, p.signal, [0, 0, 0.6, L ? 0.4 : 0.32, 1, 0.1]);
      s.gv = p.ver;
    }
    fx.light();
    // axis: a hairline with fine ticks
    ctx.strokeStyle = L ? p.paper : p.lux;
    ctx.globalAlpha = L ? 0.16 : 0.12;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.base + 0.5);
    ctx.lineTo(s.x1, s.base + 0.5);
    for (let i = 0; i <= 16; i++) {
      const x = s.x0 + ((s.x1 - s.x0) * i) / 16;
      ctx.moveTo(x + 0.5, s.base);
      ctx.lineTo(x + 0.5, s.base + (i % 4 === 0 ? 6 : 3));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = s.gnow!;
    ctx.beginPath();
    ctx.moveTo(nx + 0.5, h * 0.1);
    ctx.lineTo(nx + 0.5, s.base);
    ctx.stroke();
    // forecasts: an ensemble of agents' calls, each revising slowly; together they are the confidence fan
    const spread = h * (0.17 + 0.025 * Math.sin(t * 0.3));
    for (let k = 0; k < s.M; k++) {
      const b = (k / (s.M - 1)) * 2 - 1;
      const o = k * FC_N * 2;
      for (let i = 0; i < FC_N; i++) {
        const u = i / (FC_N - 1);
        s.mem[o + i * 2] = nx + (s.x1 - nx) * u;
        s.mem[o + i * 2 + 1] = ny - u * h * 0.06 + b * spread * Math.pow(u, 1.4) + Math.sin(u * 4 + t * 0.2 + k * 1.7) * 7 * u;
      }
    }
    // bands (aurora veils): 80% then 50%
    ctx.fillStyle = s.gb!;
    fcBand(ctx, s.mem, 1, s.M - 2);
    fcBand(ctx, s.mem, Math.floor(s.M * 0.3), Math.ceil(s.M * 0.7) - 1);
    // aurora curtains: slow vertical veils of light inside the fan
    if (!L)
      for (let c = 0; c < 4; c++) {
        const u = 0.25 + 0.6 * ((c / 4 + t * 0.012) % 1);
        const x = nx + (s.x1 - nx) * u;
        fx.glow(x, ny - u * h * 0.06, 10 + u * 16, c % 2 ? p.frost : p.signal, 0.08 * bump(((c / 4 + t * 0.012) % 1)), 4 + u * 3);
      }
    ctx.strokeStyle = s.gm!;
    ctx.lineWidth = L ? 0.6 : 0.8;
    const mid = Math.floor(s.M / 2);
    for (let k = 0; k < s.M; k++) {
      if (k === mid) continue;
      ctx.globalAlpha = 1 - Math.abs(k - mid) / (s.M * 0.7);
      strokePoly(ctx, s.mem, k * FC_N * 2, FC_N);
    }
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.1;
    strokePoly(ctx, s.mem, mid * FC_N * 2, FC_N);
    ctx.globalAlpha = 1;
    // history (realised outcomes): crisp, brightening toward now
    ctx.strokeStyle = s.gh!;
    ctx.lineWidth = 1.3;
    strokePoly(ctx, s.hist, 0, s.hn);
    for (let i = 0; i < s.hn; i += 9) dotA(ctx, s.hist[i * 2], s.hist[i * 2 + 1], 1.3, L ? p.paper : p.hi, 0.1 + 0.5 * (i / s.hn));
    // a forecast resolving: a light runs the central call and lands
    const ph = (t / 8) % 1;
    const q = easeSine(clamp01(ph / 0.75));
    at(s.mem, mid * FC_N * 2, FC_N, q);
    const fa = clamp01((1 - ph) / 0.12);
    fx.glow(AX, AY, 14, p.agent, 0.55 * fa);
    dotA(ctx, AX, AY, 1.6, L ? p.agent : p.hi, 0.9 * fa);
    if (ph > 0.75) {
      const r = (ph - 0.75) / 0.25;
      ringA(ctx, AX, AY, 3 + 14 * easeOutCubic(r), p.agent, 0.5 * (1 - r));
    }
    const br = 0.5 + 0.5 * Math.sin(t * 0.9);
    fx.glint(nx, ny, 24 + br * 6, p.signal, 0.6);
    dotA(ctx, nx, ny, 2.4, L ? p.signal : p.hi, 0.9);
    ringA(ctx, nx, ny, 7 + br * 3, p.signal, 0.3 + br * 0.2);
    fx.normal();
  },
};

/* ───────────────── code — the public API, engraved as typography; a raking light reads it while one call is typed ───────────────── */
const CODE_LINES = [
  "POST /api/v1/gateway/register",
  "  201  gameplay_key · financial_key · claim_code",
  "POST /api/v1/gateway/recharge",
  "  USDC · USDT · SOL · IDLEMINE  →  credited in IDLE",
  "GET  /api/v1/games",
  `  ${FACTS.games[0].slug}  ${FACTS.games[0].input}  →  ${FACTS.games[0].output}  ${FACTS.games[0].format}`,
  `  ${FACTS.games[1].slug}  ${FACTS.games[1].input}  →  ${FACTS.games[1].output}`,
  "GET  /api/v1/contests",
  `  entry ${FACTS.entryFees.join(" | ")} IDLE · ${FACTS.matchLengthSec}s match · pool ${FACTS.poolCapacity}`,
  "GET  /api/v1/public/leaderboard",
  "GET  /api/v1/public/chat/messages",
  "POST /api/v1/gateway/withdraw",
  `  ${FACTS.withdrawMinIdle} IDLE minimum  →  any Solana wallet`,
];
type Code = { ox: number; oy: number; tw: number; th: number; lh: number; rows: number; tex: HTMLCanvasElement | null; sig: HTMLCanvasElement | null; spot: HTMLCanvasElement | null; mask: HTMLCanvasElement | null; widths: Float32Array; gv: number; S: number };
const CODE_SCALE = 2;
export const code: Scene<Code> = {
  still: 9,
  init(w, h, _rand, lite) {
    const lh = 22;
    const tw = Math.min(Math.round(w * 0.5), 760);
    const rows = Math.max(4, Math.min(40, Math.floor((h - 40) / lh)));
    return { ox: w - tw - Math.min(40, w * 0.03), oy: Math.max(16, (h - rows * lh) / 2), tw, th: rows * lh, lh, rows, tex: null, sig: null, spot: null, mask: null, widths: new Float32Array(rows), gv: -1, S: lite ? 200 : 320 };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.tex) {
      // engrave the texture once per palette: a highlight under each glyph, the glyph above (inset metal type / letterpress)
      const mk = (fillC: string, engrave: boolean) => {
        const c = document.createElement("canvas");
        c.width = Math.max(1, s.tw * CODE_SCALE);
        c.height = Math.max(1, s.th * CODE_SCALE);
        const g = c.getContext("2d")!;
        g.scale(CODE_SCALE, CODE_SCALE);
        g.font = "500 12.5px ui-monospace, 'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
        g.textBaseline = "top";
        for (let r = 0; r < s.rows; r++) {
          const line = CODE_LINES[r % CODE_LINES.length];
          const y = r * s.lh + 4;
          const num = String(r + 1).padStart(2, "0");
          if (engrave) {
            g.fillStyle = L ? "rgba(255,255,255,0.9)" : rgba(p.hi, 0.35);
            g.fillText(num, 0, y + 1);
            g.fillText(line, 34, y + 1);
          }
          g.fillStyle = fillC;
          g.globalAlpha = engrave ? 0.55 : 1;
          g.fillText(num, 0, y);
          g.globalAlpha = 1;
          g.fillText(line, 34, y);
          if (engrave) s.widths[r] = Math.min(s.tw - 34, g.measureText(line).width);
        }
        return c;
      };
      s.tex = mk(p.paper, true);
      s.sig = mk(p.signal, false);
      if (!s.spot) {
        s.spot = document.createElement("canvas");
        s.spot.width = s.S;
        s.spot.height = s.S;
      }
      s.mask = document.createElement("canvas");
      s.mask.width = s.S;
      s.mask.height = s.S;
      const mg = s.mask.getContext("2d")!;
      const r = s.S / 2;
      const rg = mg.createRadialGradient(r, r, 0, r, r, r);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.45, "rgba(255,255,255,0.45)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      mg.fillStyle = rg;
      mg.fillRect(0, 0, s.S, s.S);
      s.gv = p.ver;
    }
    const tex = s.tex!;
    // base texture: barely there
    ctx.globalAlpha = L ? 0.075 : 0.085;
    ctx.drawImage(tex, s.ox, s.oy, s.tw, s.th);
    ctx.globalAlpha = 1;
    // raking light: a soft spotlight drifting over the type (texture masked by a radial falloff)
    const S = s.S;
    const sx = s.ox + s.tw * (0.5 + 0.38 * Math.sin(t * 0.07)) - S / 2;
    const sy = s.oy + s.th * (0.5 + 0.34 * Math.sin(t * 0.053 + 1.3)) - S / 2;
    const sg = s.spot!.getContext("2d")!;
    sg.globalCompositeOperation = "source-over";
    sg.clearRect(0, 0, S, S);
    sg.drawImage(tex, (sx - s.ox) * CODE_SCALE, (sy - s.oy) * CODE_SCALE, S * CODE_SCALE, S * CODE_SCALE, 0, 0, S, S);
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(s.mask!, 0, 0);
    fx.light();
    ctx.globalAlpha = L ? 0.3 : 0.42;
    ctx.drawImage(s.spot!, sx, sy);
    ctx.globalAlpha = 1;
    // one call being typed (signal), then held, then the next
    const per = 3.2;
    const k = Math.floor(t / per);
    const row = (k * 2) % Math.min(s.rows, CODE_LINES.length);
    const u = (t % per) / per;
    const rev = easeInOut(clamp01(u / 0.55));
    const fade = clamp01((1 - u) / 0.18);
    const wFull = s.widths[row] || s.tw * 0.5;
    const cw = Math.max(1, wFull * rev);
    const y = s.oy + row * s.lh;
    ctx.globalAlpha = (L ? 0.75 : 0.7) * fade;
    ctx.drawImage(s.sig!, 34 * CODE_SCALE, row * s.lh * CODE_SCALE, cw * CODE_SCALE, s.lh * CODE_SCALE, s.ox + 34, y, cw, s.lh);
    ctx.globalAlpha = 1;
    const cx = s.ox + 34 + cw + 2;
    const blink = 0.5 + 0.5 * Math.cos(t * 3.4);
    fx.glow(cx, y + 10, 12, p.signal, 0.4 * fade);
    ctx.globalAlpha = (0.35 + 0.55 * blink) * fade;
    ctx.fillStyle = p.signal;
    ctx.fillRect(cx, y + 3, 1.5, 14);
    ctx.globalAlpha = 1;
    fx.normal();
  },
};

/* ───────────────── racks — data-centre racks as architectural light: uplit frames, LEDs, a workload of light gliding down ───────────────── */
type Rack = { x: number; sc: number; y0: number; y1: number; units: number; uh: number; seed: number };
type Racks = { front: Rack[]; back: Rack[]; rw: number; gv: number; up: CanvasGradient | null; floorY: number };
function rackRow(w: number, h: number, n: number, rw: number, gap: number, sc: number, yMid: number, xShift: number, seed: number): Rack[] {
  const out: Rack[] = [];
  const RW = rw * sc;
  const G = gap * sc;
  const startX = w - 30 - n * (RW + G) + G + xShift;
  const units = Math.max(8, Math.min(48, Math.floor((h * 0.68 * sc) / (16 * sc))));
  const uh = 16 * sc;
  const top = yMid - (units * uh) / 2;
  for (let r = 0; r < n; r++) out.push({ x: startX + r * (RW + G), sc, y0: top, y1: top + units * uh, units, uh, seed: seed + r * 17 });
  return out;
}
export const racks: Scene<Racks> = {
  still: 6,
  init(w, h, _rand, lite) {
    const rw = 92;
    const gap = 30;
    const n = lite ? 2 : Math.max(2, Math.min(8, Math.floor((w * 0.44) / (rw + gap))));
    return { front: rackRow(w, h, n, rw, gap, 1, h * 0.5, 0, 1), back: lite ? [] : rackRow(w, h, n + 1, rw, gap, 0.64, h * 0.44, -40, 9), rw, gv: -1, up: null, floorY: h * 0.5 + (Math.max(8, Math.min(48, Math.floor((h * 0.68) / 16))) * 16) / 2 };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.up) {
      // uplight: architectural light washing up each frame edge from the floor
      s.up = linGrad(ctx, 0, 0, 0, 1, L ? p.paper : p.lux, L ? [0, 0.08, 1, 0.42] : [0, 0.03, 0.6, 0.18, 1, 0.55]);
      s.gv = p.ver;
    }
    fx.light();
    const drawRow = (row: Rack[], far: boolean) => {
      const dx = fx.par * (far ? 10 : 22);
      for (let ri = 0; ri < row.length; ri++) {
        const r = row[ri];
        const RW = s.rw * r.sc;
        const x = r.x + dx;
        const H = r.y1 - r.y0;
        const k = far ? 0.45 : 1;
        // frame edges (uplit)
        ctx.save();
        ctx.translate(0, r.y0 - 8);
        ctx.scale(1, H + 16);
        ctx.fillStyle = s.up!;
        ctx.globalAlpha = k;
        ctx.fillRect(x - 6, 0, L ? 0.7 : 1, 1);
        ctx.fillRect(x + RW + 6, 0, L ? 0.7 : 1, 1);
        ctx.restore();
        // floor pool of light under each rack
        fx.glow(x + RW / 2, r.y1 + 8, RW * 0.9, p.lux, 0.12 * k, 0.12);
        // units: fine plate lines
        ctx.strokeStyle = L ? p.paper : p.lux;
        ctx.lineWidth = L ? 0.5 : 0.6;
        ctx.globalAlpha = (L ? 0.14 : 0.1) * k;
        ctx.beginPath();
        for (let u = 0; u <= r.units; u++) {
          const y = r.y0 + u * r.uh + 0.5;
          ctx.moveTo(x, y);
          ctx.lineTo(x + RW, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        // a workload sweeping down this rack: compute being scheduled
        const ph = (t * 0.055 + ri * 0.31 + (far ? 0.5 : 0)) % 1.25;
        const sy = r.y0 + H * easeSine(Math.min(1, ph));
        const on = ph < 1 ? bump(ph) : 0;
        if (on > 0) {
          fx.glow(x + RW / 2, sy, RW * 0.7, p.agent, 0.26 * on * k, 0.18);
          ctx.globalAlpha = (L ? 0.4 : 0.38) * on * k;
          ctx.fillStyle = L ? p.agent : p.hi;
          ctx.fillRect(x + 2, sy - 0.5, RW - 4, 1);
          ctx.globalAlpha = 1;
        }
        // LEDs: a few per unit, easing on and off
        for (let u = 0; u < r.units; u++) {
          const y = r.y0 + u * r.uh + r.uh / 2;
          const near = on > 0 ? clamp01(1 - Math.abs(y - sy) / (30 * r.sc)) : 0;
          for (let l = 0; l < 2; l++) {
            const hs = hash01(r.seed + u, l);
            const per = 3 + hs * 7;
            const v = 0.5 + 0.5 * Math.sin(((t + hs * 10) * TAU) / per);
            const lit = Math.max(easeSine(clamp01((v - 0.45) * 3)), near);
            if (lit < 0.05) continue;
            const c = hs < 0.18 ? p.agent : p.signal;
            const lx = x + RW - 8 * r.sc - l * 7 * r.sc;
            if (far) fx.bokeh(lx, y, 3.2, c, 0.18 * lit);
            else {
              fx.glow(lx, y, 6, c, 0.5 * lit);
              ctx.globalAlpha = (L ? 0.6 : 0.85) * lit;
              ctx.fillStyle = hs < 0.18 ? p.glo.agent : p.glo.signal;
              ctx.fillRect(lx - 1, y - 1, 2, 2);
              ctx.globalAlpha = 1;
            }
          }
          if (!far && near > 0) {
            ctx.globalAlpha = 0.16 * near;
            ctx.fillStyle = L ? p.agent : p.hi;
            ctx.fillRect(x + 6, y - 0.5, RW * 0.42, 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    };
    drawRow(s.back, true);
    drawRow(s.front, false);
    // the floor
    if (s.front.length) {
      const f0 = s.front[0].x - 30;
      const f1 = s.front[s.front.length - 1].x + s.rw + 30;
      ctx.globalAlpha = L ? 0.2 : 0.16;
      ctx.fillStyle = L ? p.paper : p.lux;
      ctx.fillRect(f0, s.floorY + 8, f1 - f0, 0.8);
      ctx.globalAlpha = 1;
    }
    fx.normal();
  },
};

/* ───────────────── pillars — the 14 revenue streams pour as silk threads into the 5 revenue pillars (glass columns of light) ───────────────── */
const PIL_N = 18;
type Pil = { cols: { x: number; w: number; top: number; bot: number; ci: number; n: number }[]; src: Float32Array; to: Uint8Array; ns: number; path: Float32Array; per: number; gv: number; gb: CanvasGradient[]; gl: CanvasGradient[]; gr: CanvasGradient[] };
const PILLAR_TONE: Tone[] = PILLARS.map((p) => p.color); // signal | value | agent | hot | frost — same order as the site
export const pillars: Scene<Pil> = {
  still: 10.5,
  init(w, h) {
    const n = PILLARS.length;
    // lives in the open zone right of the section header (top ~250px), clear of the content below
    const H = Math.min(h, 236);
    const y0 = Math.min(h * 0.1, 64);
    const left = w * 0.56;
    const right = w * 0.965;
    const pitch = (right - left) / n;
    const cw = Math.min(42, pitch * 0.46);
    const top = y0 + (H - y0) * 0.4;
    const bot = H - 6;
    const cols = PILLARS.map((pl, i) => ({ x: left + pitch * i + (pitch - cw) / 2, w: cw, top, bot, ci: i, n: pl.streams.length }));
    const src: number[] = [];
    const to: number[] = [];
    for (let sNo = 1; sNo <= 14; sNo++) {
      const pi = PILLARS.findIndex((pl) => pl.streams.includes(sNo));
      if (pi < 0) continue;
      src.push(left + ((right - left) * (sNo - 0.5)) / 14, y0 + 6);
      to.push(pi);
    }
    const ns = to.length;
    const path = new Float32Array(ns * PIL_N * 2);
    for (let i = 0; i < ns; i++) {
      const c = cols[to[i]];
      const sx = src[i * 2];
      const sy = src[i * 2 + 1];
      const tx = c.x + c.w / 2;
      sampleCubic(path, i * PIL_N * 2, PIL_N, sx, sy, sx, sy + (c.top - sy) * 0.62, tx, sy + (c.top - sy) * 0.38, tx, c.top);
    }
    return { cols, src: Float32Array.from(src), to: Uint8Array.from(to), ns, path, per: 16, gv: -1, gb: [], gl: [], gr: [] };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    if (s.gv !== p.ver || !s.gb.length) {
      const c0 = s.cols[0];
      const H = c0.bot - c0.top;
      // glass body (lit from below), liquid (bright under the meniscus), reflection under the floor
      s.gb = s.cols.map((c) => linGrad(ctx, 0, c.top, 0, c.bot, p[PILLAR_TONE[c.ci]], L ? [0, 0.02, 1, 0.06] : [0, 0.015, 1, 0.08]));
      s.gl = s.cols.map((c) => linGrad(ctx, 0, c.top, 0, c.bot, p[PILLAR_TONE[c.ci]], L ? [0, 0.26, 1, 0.1] : [0, 0.5, 0.5, 0.26, 1, 0.1]));
      s.gr = s.cols.map((c) => linGrad(ctx, 0, c.bot, 0, c.bot + H * 0.3, p[PILLAR_TONE[c.ci]], [0, L ? 0.06 : 0.1, 1, 0]));
      s.gv = p.ver;
    }
    const tt = t % s.per;
    // the fill rises through the cycle, the pillars bank (a soft flare on the floor), then drain for the next turn
    const fillU = easeSine(clamp01(tt / (s.per - 3)));
    const bank = clamp01((tt - (s.per - 3)) / 0.9);
    const drain = easeSine(clamp01((tt - (s.per - 2)) / 2));
    fx.light();
    // threads + travelling drops
    for (let i = 0; i < s.ns; i++) {
      const col = p[PILLAR_TONE[s.to[i]]];
      const glo = p.glo[PILLAR_TONE[s.to[i]]];
      ctx.strokeStyle = col;
      ctx.globalAlpha = L ? 0.2 : 0.14;
      ctx.lineWidth = L ? 0.55 : 0.7;
      strokePoly(ctx, s.path, i * PIL_N * 2, PIL_N);
      ctx.globalAlpha = 1;
      fx.glow(s.src[i * 2], s.src[i * 2 + 1], 8, col, 0.5);
      dotA(ctx, s.src[i * 2], s.src[i * 2 + 1], 1.3, L ? col : p.hi, 0.75);
      if (drain > 0) continue;
      const u = ((t + i * 0.41) % 4.2) / 4.2;
      const q = easeSine(u);
      trail(ctx, s.path, i * PIL_N * 2, PIL_N, q - 0.22, q, glo, 0.85 * clamp01(u / 0.1), L ? 1 : 1.3);
      at(s.path, i * PIL_N * 2, PIL_N, q);
      fx.glow(AX, AY, 9, col, 0.5 * clamp01(u / 0.1));
    }
    for (let ci = 0; ci < s.cols.length; ci++) {
      const c = s.cols[ci];
      const col = p[PILLAR_TONE[c.ci]];
      const H = c.bot - c.top;
      // glass column
      ctx.fillStyle = s.gb[ci];
      rrect(ctx, c.x, c.top, c.w, H, 3);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.globalAlpha = L ? 0.4 : 0.22;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // specular edge on the lit side
      ctx.globalAlpha = L ? 0.18 : 0.38;
      ctx.fillStyle = L ? col : p.hi;
      ctx.fillRect(c.x + 2.5, c.top + 4, 0.8, H * 0.7);
      ctx.globalAlpha = 1;
      if (L) {
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = col;
        rrect(ctx, c.x + 3, c.top + 3, c.w - 6, H - 6, 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // liquid: proportional to that pillar's stream count, so 3-stream pillars outfill the 2-stream one
      const full = H * (0.4 + 0.17 * c.n);
      const lvl = Math.min(H - 4, full * fillU * (1 - drain));
      if (lvl > 1) {
        ctx.fillStyle = s.gl[ci];
        ctx.fillRect(c.x + 3, c.bot - lvl - 2, c.w - 6, lvl);
        // meniscus: a crisp highlight + a flattened bloom
        ctx.globalAlpha = L ? 0.7 : 0.85;
        ctx.fillStyle = p.glo[PILLAR_TONE[c.ci]];
        ctx.fillRect(c.x + 3, c.bot - lvl - 2, c.w - 6, 1);
        ctx.globalAlpha = 1;
        fx.glow(c.x + c.w / 2, c.bot - lvl - 2, c.w * 0.95, col, 0.32, 0.22);
      }
      // reflection under the floor
      ctx.fillStyle = s.gr[ci];
      ctx.fillRect(c.x + 3, c.bot + 2, c.w - 6, H * 0.3);
      if (bank > 0 && drain < 1) fx.glow(c.x + c.w / 2, c.bot - lvl, c.w * 1.6, col, 0.3 * bump(bank));
    }
    // the floor: all pillars stand on one economy
    const f0 = s.cols[0].x - 14;
    const f1 = s.cols[s.cols.length - 1].x + s.cols[s.cols.length - 1].w + 14;
    const fy = s.cols[0].bot + 1;
    ctx.globalAlpha = (L ? 0.45 : 0.32) + 0.3 * bump(bank);
    ctx.fillStyle = p.value;
    ctx.fillRect(f0, fy, f1 - f0, 0.9);
    ctx.globalAlpha = 1;
    fx.glow((f0 + f1) / 2, fy, (f1 - f0) * 0.55, p.value, 0.1 + 0.3 * bump(bank), 0.05);
    fx.normal();
  },
};

/* ───────────────── pods — Mega Context Pools: luminous orbs of shared memory; agents deposit knowledge and draw from them ───────────────── */
const POD_N = 16;
type Pods = { pools: { x: number; y: number; r: number; tone: 0 | 1 | 2; tilt: number }[]; ax: Float32Array; ay: Float32Array; aph: Float32Array; ap: Uint8Array; na: number; curve: Float32Array; dep: Float32Array };
const POD_T: Tone[] = ["agent", "signal", "frost"];
export const pods: Scene<Pods> = {
  still: 6,
  init(w, h, rand, lite) {
    const R = Math.min(h * 0.15, w * 0.075);
    const pools: Pods["pools"] = [
      { x: w * 0.66, y: h * 0.32, r: R, tone: 0, tilt: -0.35 },
      { x: w * 0.88, y: h * 0.36, r: R * 0.8, tone: 1, tilt: 0.3 },
      { x: w * 0.77, y: h * 0.64, r: R * 0.88, tone: 2, tilt: -0.15 },
    ];
    const n = lite ? 12 : 22;
    const ax: number[] = [];
    const ay: number[] = [];
    const aph: number[] = [];
    const ap: number[] = [];
    for (let i = 0; i < n * 30 && ax.length < n; i++) {
      const x = w * (0.52 + rand() * 0.46);
      const y = h * (0.08 + rand() * 0.8);
      if (pools.some((pl) => Math.hypot(pl.x - x, pl.y - y) < pl.r * 1.9 + 10)) continue;
      let best = 0;
      pools.forEach((pl, j) => Math.hypot(pl.x - x, pl.y - y) < Math.hypot(pools[best].x - x, pools[best].y - y) && (best = j));
      ax.push(x);
      ay.push(y);
      aph.push(rand() * TAU);
      ap.push(best);
    }
    return { pools, ax: Float32Array.from(ax), ay: Float32Array.from(ay), aph: Float32Array.from(aph), ap: Uint8Array.from(ap), na: ax.length, curve: new Float32Array(POD_N * 2), dep: new Float32Array(3) };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    s.dep.fill(0);
    fx.light();
    // halos first (volumetric light around each pool)
    for (let i = 0; i < 3; i++) fx.glow(s.pools[i].x, s.pools[i].y, s.pools[i].r * 2.6, p[POD_T[s.pools[i].tone]], 0.13);
    // agents, their links and packets: deposit (agent → pool) and paid access (pool → agent, gold)
    const P = 5.6;
    for (let i = 0; i < s.na; i++) {
      const pl = s.pools[s.ap[i]];
      const col = p[POD_T[pl.tone]];
      const x = s.ax[i] + Math.sin(t * 0.18 + s.aph[i]) * 5;
      const y = s.ay[i] + Math.cos(t * 0.15 + s.aph[i]) * 5;
      const ang = Math.atan2(y - pl.y, x - pl.x);
      const ex = pl.x + Math.cos(ang) * pl.r * 1.02;
      const ey = pl.y + Math.sin(ang) * pl.r * 1.02;
      const mx = (x + ex) / 2 + Math.sin(ang) * 14;
      const my = (y + ey) / 2 - Math.cos(ang) * 14;
      sampleQuad(s.curve, POD_N, x, y, mx, my, ex, ey);
      ctx.strokeStyle = L ? p.paper : col;
      ctx.globalAlpha = L ? 0.1 : 0.08;
      ctx.lineWidth = 0.6;
      strokePoly(ctx, s.curve, 0, POD_N);
      ctx.globalAlpha = 1;
      const cyc = Math.floor((t + i * 0.73) / P);
      const u = ((t + i * 0.73) % P) / P;
      const inbound = hash01(i, cyc) < 0.62;
      if (u < 0.7) {
        const q = easeSine(u / 0.7);
        const qq = inbound ? q : 1 - q;
        const pc = inbound ? col : p.value;
        if (inbound) trail(ctx, s.curve, 0, POD_N, qq - 0.25, qq, p.glo[POD_T[pl.tone]], 0.7, 1);
        else trail(ctx, s.curve, 0, POD_N, qq, qq + 0.25, pc, 0.7, 1);
        at(s.curve, 0, POD_N, qq);
        fx.glow(AX, AY, 9, pc, 0.55);
        dotA(ctx, AX, AY, 1.3, L ? pc : p.hi, 0.9);
      } else if (inbound) s.dep[s.ap[i]] = Math.max(s.dep[s.ap[i]], 1 - (u - 0.7) / 0.3);
      fx.glow(x, y, 7, p.lux, 0.25);
      dotA(ctx, x, y, 1.6, L ? p.paper : p.hi, L ? 0.5 : 0.6);
    }
    // the pools: lit orbs with tilted orbits of knowledge
    for (let i = 0; i < 3; i++) {
      const pl = s.pools[i];
      const col = p[POD_T[pl.tone]];
      const d = s.dep[i];
      for (let o = 0; o < 2; o++) {
        const rx = pl.r * (1.4 + o * 0.32);
        const ry = rx * (0.26 + o * 0.06);
        const rot = pl.tilt + o * 0.5;
        // back half faint, front half brighter
        ctx.strokeStyle = L ? p.paper : col;
        ctx.lineWidth = 0.7;
        ctx.globalAlpha = L ? 0.12 : 0.1;
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y, rx, ry, rot, Math.PI, TAU);
        ctx.stroke();
        ctx.globalAlpha = L ? 0.28 : 0.26;
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y, rx, ry, rot, 0, Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const a = t * (0.16 + o * 0.07) * (o ? -1 : 1) + i * 2;
        const cx = Math.cos(a) * rx;
        const cy = Math.sin(a) * ry;
        const bx = pl.x + cx * Math.cos(rot) - cy * Math.sin(rot);
        const by = pl.y + cx * Math.sin(rot) + cy * Math.cos(rot);
        const front = Math.sin(a) > 0 ? 1 : 0.35;
        fx.glow(bx, by, 9, col, 0.5 * front);
        dotA(ctx, bx, by, 1.4, L ? col : p.hi, 0.85 * front);
      }
      fx.orb(pl.x, pl.y, pl.r, col, L ? 0.55 : 0.85 + d * 0.15);
      if (d > 0) ringA(ctx, pl.x, pl.y, pl.r * (1.04 + (1 - d) * 0.22), p.glo[POD_T[pl.tone]], 0.55 * d, 0.9);
    }
    fx.normal();
  },
};

/* ───────────────── debate — two agents' argument trees grow as filaments of light, rebut each other, one wins the round ───────────────── */
type Dbt = { trees: { nodes: { x: number; y: number; parent: number; at: number }[] }[]; rebut: { a: number; b: number; at: number; side: 0 | 1 }[]; per: number; curve: Float32Array };
const DB_N = 22;
const DB_T: Tone[] = ["agent", "hot"];
export const debate: Scene<Dbt> = {
  still: 13.5,
  init(w, h, rand) {
    const roots: [number, number][] = [
      [w * 0.66, h * 0.16],
      [w * 0.87, h * 0.16],
    ];
    const trees: Dbt["trees"] = roots.map(([rx, ry], side) => {
      const nodes: Dbt["trees"][number]["nodes"] = [{ x: rx, y: ry, parent: -1, at: 0 }];
      let frontier = [0];
      let at = 0.6;
      for (let Lv = 1; Lv <= 3; Lv++) {
        const next: number[] = [];
        for (const pi of frontier) {
          const kids = Lv === 1 ? 3 : 1 + Math.floor(rand() * 2);
          for (let c = 0; c < kids && nodes.length < 24; c++) {
            const par = nodes[pi];
            const spread = (w * 0.058) / Math.pow(1.9, Lv - 1);
            nodes.push({ x: par.x + (c - (kids - 1) / 2) * spread + (rand() - 0.5) * 6, y: ry + Lv * h * 0.2, parent: pi, at: at + side * 0.6 });
            at += 0.7;
            next.push(nodes.length - 1);
          }
        }
        frontier = next;
      }
      return { nodes };
    });
    const rebut: Dbt["rebut"] = [];
    for (let i = 0; i < 4; i++) {
      const side = (i % 2) as 0 | 1;
      const A = trees[side].nodes;
      const B = trees[1 - side].nodes;
      rebut.push({ a: 1 + Math.floor(rand() * (A.length - 1)), b: 1 + Math.floor(rand() * (B.length - 1)), at: 9 + i * 1.1, side });
    }
    return { trees, rebut, per: 18, curve: new Float32Array(DB_N * 2) };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    const tt = t % s.per;
    const out = clamp01((s.per - tt) / 1.6);
    const verdict = easeSine((tt - 14) / 1.2);
    const winner = Math.floor(t / s.per) % 2; // rounds alternate: the scene shows judging, not a favourite
    fx.light();
    for (let side = 0; side < 2; side++) {
      const tr = s.trees[side];
      const col = p[DB_T[side]];
      const glo = p.glo[DB_T[side]];
      const win = side === winner ? verdict : 0;
      for (const n of tr.nodes) {
        const g = clamp01((tt - n.at) / 0.8);
        if (g <= 0) continue;
        const e = easeOutExpo(g);
        if (n.parent >= 0) {
          const pa = tr.nodes[n.parent];
          const ex = pa.x + (n.x - pa.x) * e;
          const ey = pa.y + (n.y - pa.y) * e;
          ctx.strokeStyle = col;
          ctx.globalAlpha = ((L ? 0.38 : 0.3) + win * 0.25) * out;
          ctx.lineWidth = L ? 0.7 : 0.9;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.bezierCurveTo(pa.x, (pa.y + ey) / 2, ex, (pa.y + ey) / 2, ex, ey);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const isRoot = n.parent < 0;
        const r = isRoot ? 3 : 1.8;
        fx.glow(n.x, n.y, (isRoot ? 20 : 10) * (1 + win * 0.4), col, (0.35 + (1 - g) * 0.4) * out);
        dotA(ctx, n.x, n.y, r, glo, 0.85 * g * out);
        if (isRoot) ringA(ctx, n.x, n.y, 9, col, 0.35 * g * out, 0.8);
      }
    }
    // rebuttals: an arc of light from challenger to the claim it attacks
    for (const r of s.rebut) {
      const g = clamp01((tt - r.at) / 1.3);
      if (g <= 0) continue;
      const A = s.trees[r.side].nodes[r.a];
      const B = s.trees[1 - r.side].nodes[r.b];
      sampleQuad(s.curve, DB_N, A.x, A.y, (A.x + B.x) / 2, Math.min(A.y, B.y) - 46, B.x, B.y);
      const q = easeSine(g);
      ctx.strokeStyle = p[DB_T[r.side]];
      ctx.globalAlpha = (L ? 0.22 : 0.14) * out;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 4]);
      strokePoly(ctx, s.curve, 0, DB_N);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (g < 1) {
        trail(ctx, s.curve, 0, DB_N, q - 0.3, q, p.glo[DB_T[r.side]], 0.85 * out, 1.1);
        at(s.curve, 0, DB_N, q);
        fx.glow(AX, AY, 10, p[DB_T[r.side]], 0.55 * out);
      } else ringA(ctx, B.x, B.y, 8, p[DB_T[r.side]], 0.4 * out, 0.8);
    }
    // the judge line between the two roots, and the verdict flare
    const r0 = s.trees[0].nodes[0];
    const r1 = s.trees[1].nodes[0];
    ctx.strokeStyle = L ? p.paper : p.lux;
    ctx.globalAlpha = (L ? 0.2 : 0.14) + verdict * 0.2;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(r0.x + 16, r0.y);
    ctx.lineTo(r1.x - 16, r1.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const mxj = (r0.x + r1.x) / 2;
    dotA(ctx, mxj, r0.y, 2.2, verdict > 0 ? p.signal : L ? p.paper : p.lux, 0.4 + verdict * 0.5);
    if (verdict > 0) {
      const R = s.trees[winner].nodes[0];
      fx.glint(R.x, R.y, 34, p.signal, 0.7 * verdict * out);
      ringA(ctx, R.x, R.y, 12 + verdict * 6, p.signal, 0.6 * verdict * out, 1);
      fx.glow(mxj, r0.y, 16, p.signal, 0.5 * verdict * out);
    }
    fx.normal();
  },
};

/* ───────────────── marketplace — top agents listed as glass cards; customers rent them, the fee flows back to developers ───────────────── */
type Mkt = { cards: { x: number; y: number; rating: number }[]; cw: number; ch: number; cust: [number, number]; dev: [number, number]; g: GlassG | null; curve: Float32Array };
const MK_N = 20;
export const marketplace: Scene<Mkt> = {
  still: 4,
  init(w, h, rand) {
    const cols = 3;
    const rows = Math.max(2, Math.min(4, Math.floor((h * 0.8) / 96)));
    const cw = Math.max(60, Math.min(118, (w * 0.4) / cols - 14));
    const ch = 62;
    const gx = 16;
    const gy = 22;
    const x0 = w * 0.96 - cols * (cw + gx) + gx;
    const y0 = h / 2 - (rows * (ch + gy) - gy) / 2;
    const cards: Mkt["cards"] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cards.push({ x: x0 + c * (cw + gx), y: y0 + r * (ch + gy), rating: 0.45 + rand() * 0.5 });
    return { cards, cw, ch, cust: [x0 - 70, h * 0.5], dev: [w * 0.985, Math.max(14, h * 0.07)], g: null, curve: new Float32Array(MK_N * 2) };
  },
  draw(ctx, s, t, p, _w, _h, fx) {
    const L = p.light;
    s.g = glassGrads(ctx, p, s.cw, s.ch, s.g);
    const P = 4.6; // one rental every 4.6s
    const cyc = Math.floor(t / P);
    const u = (t % P) / P;
    const pick = Math.floor(hash01(cyc, 5) * s.cards.length);
    const prev = Math.floor(hash01(cyc - 1, 5) * s.cards.length);
    fx.light();
    const [cx, cy] = s.cust;
    fx.orb(cx, cy, 8, p.agent, L ? 0.6 : 0.8);
    fx.glow(cx, cy, 26, p.agent, 0.2);
    const [dx, dy] = s.dev;
    fx.orb(dx, dy, 6, p.value, L ? 0.6 : 0.8);
    for (let i = 0; i < s.cards.length; i++) {
      const c = s.cards[i];
      const sel = i === pick ? bump(clamp01((u - 0.3) / 0.5)) : 0;
      const after = i === prev ? clamp01(1 - u * 3) * 0.6 : 0;
      const lit = Math.max(sel, after);
      glass(ctx, c.x, c.y, s.g, 8, lit > 0.2, p, 0.85 + lit * 0.15);
      if (lit > 0) fx.glow(c.x + s.cw / 2, c.y + s.ch / 2, s.cw * 0.8, p.signal, 0.2 * lit);
      // avatar (a small lit orb) + name hairlines + gold rating line with a glint at its tip
      fx.orb(c.x + 17, c.y + 20, 6.5, p.agent, L ? 0.55 : 0.75);
      ctx.fillStyle = L ? p.paper : p.hi;
      ctx.globalAlpha = L ? 0.22 : 0.2;
      ctx.fillRect(c.x + 30, c.y + 15, s.cw * 0.42, 1.2);
      ctx.globalAlpha = L ? 0.14 : 0.12;
      ctx.fillRect(c.x + 30, c.y + 22, s.cw * 0.26, 1);
      ctx.fillStyle = L ? p.paper : p.lux;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(c.x + 10, c.y + s.ch - 14, s.cw - 20, 1);
      ctx.fillStyle = p.value;
      ctx.globalAlpha = L ? 0.65 : 0.6;
      ctx.fillRect(c.x + 10, c.y + s.ch - 14, (s.cw - 20) * c.rating, 1);
      ctx.globalAlpha = 1;
      fx.glow(c.x + 10 + (s.cw - 20) * c.rating, c.y + s.ch - 13.5, 6, p.value, 0.5);
    }
    // the rental: request customer → card, then the fee card → developer (gold)
    const c = s.cards[pick];
    const tx = c.x + s.cw / 2;
    const ty = c.y + s.ch / 2;
    if (u < 0.36) {
      const q = easeSine(u / 0.36);
      sampleCubicFlat(s.curve, cx, cy, cx + 60, cy, tx - 40, ty, tx, ty);
      trail(ctx, s.curve, 0, MK_N, q - 0.3, q, p.glo.agent, 0.85, 1.2);
      at(s.curve, 0, MK_N, q);
      fx.glow(AX, AY, 12, p.agent, 0.6);
    } else if (u > 0.52 && u < 0.9) {
      const q = easeSine((u - 0.52) / 0.38);
      sampleCubicFlat(s.curve, tx, c.y, tx, c.y - 40, dx - 30, dy + 20, dx, dy);
      trail(ctx, s.curve, 0, MK_N, q - 0.3, q, p.glo.value, 0.9, 1.2);
      at(s.curve, 0, MK_N, q);
      fx.glow(AX, AY, 12, p.value, 0.65);
    }
    if (u > 0.86 && u < 1) fx.glint(dx, dy, 22, p.value, 0.6 * bump((u - 0.86) / 0.14));
    fx.normal();
  },
};
function sampleCubicFlat(out: Float32Array, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  sampleCubic(out, 0, MK_N, x0, y0, x1, y1, x2, y2, x3, y3);
}

export const SCENES = { network, territory, flow, chain, ranks, forecast, code, racks, pillars, pods, debate, marketplace } as const;
export type BgKind = keyof typeof SCENES;
/** the key light of each scene: tints the section's atmosphere layer */
export const SCENE_TONE: Record<BgKind, string> = {
  network: "var(--agent)",
  territory: "var(--signal)",
  flow: "var(--value)",
  chain: "var(--signal)",
  ranks: "var(--value)",
  forecast: "var(--agent)",
  code: "var(--signal)",
  racks: "var(--agent)",
  pillars: "var(--value)",
  pods: "var(--agent)",
  debate: "var(--hot)",
  marketplace: "var(--value)",
};
