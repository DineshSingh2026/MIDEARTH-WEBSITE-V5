/**
 * Section-background engine: a small 2D-canvas loop shared by every data background,
 * plus the light & material toolkit the scenes paint with.
 *
 * Rules it enforces (so individual scenes can't break them):
 *  - ≤30fps, only while the section is on screen and the tab is visible
 *  - DPR capped at 1.5; a host under 8px (or absurdly large) paints nothing: guards the zero-size canvas case
 *  - the host gets `data-on` the first time it is seen, so CSS fades the scene in as the section arrives
 *  - reduced motion → one static, composed frame
 *  - colours come from theme tokens and are re-read when the theme / mode changes
 *
 * Light & material (see `Fx`):
 *  - every glow is a cached sprite (drawImage), never shadowBlur; the sprite cache is bounded
 *  - dark themes paint light additively ("lighter"); light themes paint ink (source-over, no glow)
 *  - a fine dither is laid only over painted pixels on dark grounds, so soft gradients never band
 *  - `fx.par` is a smoothed scroll parallax (-1…1) scenes use for near/far depth layers
 */

export type Palette = {
  paper: string;
  dim: string;
  signal: string;
  agent: string;
  value: string;
  hot: string;
  frost: string;
  void: string;
  /** the theme's signature light for structure: cyan (Obsidian), champagne (Aurum), platinum ice (Sapphire), brass (Emerald), ink (light themes) */
  lux: string;
  /** specular highlight tint (glints, meniscus lines, glass edges) */
  hi: string;
  /** true on light grounds (Porcelain / Travertine / Stands): ink, mineral pigments, engraving; no glow */
  light: boolean;
  /** glow strength for this theme (0 on light grounds) */
  glow: number;
  /** semantic colours lifted toward the specular tint: the hot core of a light (equal to the colour on light grounds) */
  glo: { signal: string; agent: string; value: string; hot: string; frost: string };
  /** bumps whenever tokens are re-read, so scenes can rebuild cached gradients */
  ver: number;
};

/** `rgba()` from a token hex (or any rgb()/hex the browser resolved). */
export function rgba(c: string, a: number): string {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
}

function rgbOf(c: string): [number, number, number] {
  const s = c.trim();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/[\d.]+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [128, 128, 128];
}

/** mix two colours (0 → a, 1 → b), returned as hex */
export function mix(a: string, b: string, u: number): string {
  const A = rgbOf(a);
  const B = rgbOf(b);
  const h = (i: number) => Math.round(A[i] + (B[i] - A[i]) * u).toString(16).padStart(2, "0");
  return `#${h(0)}${h(1)}${h(2)}`;
}

function luminance(c: string): number {
  const [r, g, b] = rgbOf(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

let palVer = 0;
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (k: string, fb: string) => cs.getPropertyValue(k).trim() || fb;
  const voidC = v("--void", "#04070b");
  const light = luminance(voidC) > 0.5;
  const theme = document.documentElement.dataset.theme || "obsidian";
  const paper = v("--paper", "#e4ecef");
  const agent = v("--agent", "#38c6e4");
  const value = v("--value", "#e2b552");
  const frost = v("--frost", "#b8dcf2");
  const accent = v("--accent", "#2ee6a1");
  // per-theme light: each dark theme gets its own signature light and specular tint
  let lux = agent;
  let hi = mix(agent, "#ffffff", 0.82);
  let glow = 1;
  if (light) {
    lux = paper;
    hi = paper;
    glow = 0;
  } else if (theme === "aurum") {
    lux = mix(accent, "#fff3dc", 0.12); // champagne gold
    hi = "#fff1d4";
    glow = 0.92;
  } else if (theme === "sapphire") {
    lux = mix(frost, "#ffffff", 0.1); // platinum ice
    hi = "#eef4ff";
    glow = 0.82;
  } else if (theme === "emerald") {
    lux = mix(value, paper, 0.18); // brass
    hi = "#f8ebc8";
    glow = 0.9;
  }
  const signal = v("--signal", "#2ee6a1");
  const hot = v("--hot", "#f2884a");
  const lift = (c: string) => (light ? c : mix(c, hi, 0.4));
  return {
    paper,
    dim: v("--paper-dim", "#8d9ea8"),
    signal,
    agent,
    value,
    hot,
    frost,
    void: voidC,
    lux,
    hi,
    light,
    glow,
    glo: { signal: lift(signal), agent: lift(agent), value: lift(value), hot: lift(hot), frost: lift(frost) },
    ver: ++palVer,
  };
}

/** Deterministic PRNG so a layout is stable across renders / resizes of the same size. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash → [0,1). Lets scenes pick "random" things as a pure function of time. */
export const hash01 = (a: number, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** gentle sine in-out: the default luxury ease */
export const easeSine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** smooth bump 0→1→0 over [0,1] */
export const bump = (x: number) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));

/* ───────────────────────── light & material toolkit ───────────────────────── */

type SpriteKind = "glow" | "bokeh" | "orb";
const SPRITE = 64;
const ORB = 128;
const MAX_SPRITES = 40;

export type Fx = {
  /** soft bloom (cached gaussian-like sprite). No-op on light grounds. `sy` squashes it (anamorphic streaks). */
  glow: (x: number, y: number, r: number, c: string, a: number, sy?: number) => void;
  /** out-of-focus disc with a faint rim: far-layer depth of field. On light grounds a faint ink ring. */
  bokeh: (x: number, y: number, r: number, c: string, a: number) => void;
  /** a lit sphere with a specular highlight (dark) / an engraved globe outline (light) */
  orb: (x: number, y: number, r: number, c: string, a: number) => void;
  /** a 4-point glint: crisp core + horizontal/vertical streaks (dark only) */
  glint: (x: number, y: number, r: number, c: string, a: number) => void;
  /** watercolour pigment wash for light grounds (no-op on dark) */
  wash: (x: number, y: number, r: number, c: string, a: number) => void;
  /** the additive blend on dark grounds, normal ink on light */
  light: () => void;
  /** back to normal compositing */
  normal: () => void;
  /** smoothed scroll parallax, -1 (section below the fold) … 1 (above) */
  par: number;
  /** phone / low-power variant: scenes draw fewer elements */
  lite: boolean;
};

function makeFx(ctx: CanvasRenderingContext2D, getPal: () => Palette) {
  const cache = new Map<string, HTMLCanvasElement>();
  const sprite = (kind: SpriteKind, c: string): HTMLCanvasElement => {
    const key = kind + c;
    let s = cache.get(key);
    if (s) return s;
    if (cache.size >= MAX_SPRITES) cache.clear();
    const n = kind === "orb" ? ORB : SPRITE;
    s = document.createElement("canvas");
    s.width = n;
    s.height = n;
    const g = s.getContext("2d")!;
    const r = n / 2;
    if (kind === "glow") {
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      // gaussian-ish falloff reads as real bloom (a linear ramp reads as a flat disc)
      gr.addColorStop(0, rgba(c, 1));
      gr.addColorStop(0.1, rgba(c, 0.72));
      gr.addColorStop(0.24, rgba(c, 0.36));
      gr.addColorStop(0.42, rgba(c, 0.14));
      gr.addColorStop(0.66, rgba(c, 0.04));
      gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, n, n);
    } else if (kind === "bokeh") {
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, rgba(c, 0.32));
      gr.addColorStop(0.62, rgba(c, 0.4));
      gr.addColorStop(0.84, rgba(c, 0.55));
      gr.addColorStop(0.93, rgba(c, 0.18));
      gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, n, n);
    } else {
      const p = getPal();
      // body: lit from the upper left, falling to a dark limb, with a thin rim light
      const body = g.createRadialGradient(r * 0.72, r * 0.64, r * 0.04, r, r, r * 0.98);
      body.addColorStop(0, rgba(mix(c, p.hi, 0.75), 0.95));
      body.addColorStop(0.28, rgba(c, 0.62));
      body.addColorStop(0.72, rgba(mix(c, p.void, 0.55), 0.42));
      body.addColorStop(0.94, rgba(mix(c, p.void, 0.3), 0.5));
      body.addColorStop(1, rgba(c, 0));
      g.fillStyle = body;
      g.beginPath();
      g.arc(r, r, r * 0.98, 0, Math.PI * 2);
      g.fill();
      const spec = g.createRadialGradient(r * 0.66, r * 0.56, 0, r * 0.66, r * 0.56, r * 0.3);
      spec.addColorStop(0, rgba(p.hi, 0.85));
      spec.addColorStop(1, rgba(p.hi, 0));
      g.fillStyle = spec;
      g.fillRect(0, 0, n, n);
    }
    cache.set(key, s);
    return s;
  };

  const fx: Fx = {
    par: 0,
    lite: false,
    glow(x, y, r, c, a, sy = 1) {
      const p = getPal();
      const al = a * p.glow;
      if (al <= 0.004 || r < 0.5) return;
      ctx.globalAlpha = al > 1 ? 1 : al;
      ctx.drawImage(sprite("glow", c), x - r, y - r * sy, r * 2, r * 2 * sy);
      ctx.globalAlpha = 1;
    },
    bokeh(x, y, r, c, a) {
      if (a <= 0.004 || r < 0.5) return;
      const p = getPal();
      if (p.light) {
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(sprite("bokeh", c), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    },
    orb(x, y, r, c, a) {
      if (a <= 0.004 || r < 1) return;
      const p = getPal();
      if (p.light) {
        // engraved globe: limb, two meridians, an equator and a shaded crescent of fine arcs
        ctx.globalAlpha = a;
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.42, r, 0, 0, Math.PI * 2);
        ctx.moveTo(x + r, y);
        ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 1; i <= 4; i++) {
          ctx.globalAlpha = a * (0.55 - i * 0.1);
          ctx.beginPath();
          ctx.arc(x - i * r * 0.04, y - i * r * 0.03, r * (1 - i * 0.035), 0.1 * Math.PI, 0.75 * Math.PI);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(sprite("orb", c), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    },
    glint(x, y, r, c, a) {
      const p = getPal();
      if (p.light || a <= 0.004) return;
      fx.glow(x, y, r * 0.5, c, a * 0.9);
      fx.glow(x, y, r * 1.6, p.hi, a * 0.5, 0.06);
      fx.glow(x, y, r * 0.09, p.hi, a * 0.35, 1 / 0.09 * 0.9);
      fx.glow(x, y, r * 0.16, p.hi, a);
    },
    wash(x, y, r, c, a) {
      const p = getPal();
      if (!p.light || a <= 0.004 || r < 0.5) return;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite("glow", c), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    },
    light() {
      ctx.globalCompositeOperation = getPal().light ? "source-over" : "lighter";
    },
    normal() {
      ctx.globalCompositeOperation = "source-over";
    },
  };
  return { fx, clear: () => cache.clear() };
}

/** a 128px tile of faint luminance noise: dithers soft glows so they never band */
function makeDither(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const g = c.getContext("2d");
  if (!g) return null;
  const img = g.createImageData(n, n);
  const rnd = mulberry32(7);
  for (let i = 0; i < n * n; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = Math.floor(rnd() * 16);
  }
  g.putImageData(img, 0, 0);
  return ctx.createPattern(c, "repeat");
}

/**
 * A scene: `init` builds layout for a size (seeded, deterministic); `draw` paints frame `t` (seconds).
 * Scenes may keep small mutable state on the object returned by `init` (preallocate; no per-frame arrays).
 */
export type Scene<S = unknown> = {
  init: (w: number, h: number, rand: () => number, lite: boolean) => S;
  draw: (ctx: CanvasRenderingContext2D, s: S, t: number, p: Palette, w: number, h: number, fx: Fx) => void;
  /** time used for the reduced-motion still frame (pick a representative moment) */
  still: number;
};

const FRAME_MS = 1000 / 30;
const DPR_CAP = 1.5;
const MIN_SIDE = 8;
const MAX_SIDE = 8192;

/**
 * Mounts a scene on a canvas. Returns a disposer. `motion=false` paints a single still frame.
 */
export function mountScene<S>(canvas: HTMLCanvasElement, scene: Scene<S>, opts: { motion: boolean; seed: number }): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const host = canvas.parentElement ?? canvas;
  let w = 0;
  let h = 0;
  let state: S | null = null;
  let pal = readPalette(canvas);
  const { fx, clear } = makeFx(ctx, () => pal);
  const dither = makeDither(ctx);
  let visible = false;
  let raf = 0;
  let last = 0;
  let clock = scene.still; // scene time (s); advances only while running so it resumes where it paused
  let prev = 0;
  let parTarget = 0;

  const paint = (t: number) => {
    if (!state || w < MIN_SIDE || h < MIN_SIDE) return;
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    scene.draw(ctx, state, t, pal, w, h, fx);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    if (!pal.light && dither) {
      // dither only where light was painted (source-atop), so empty canvas stays empty
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = dither;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }
    if (pal.light) {
      // light grounds (Porcelain / Travertine): ink reads heavier, so erase harder behind the text column
      if (!erase || eraseW !== w) {
        erase = ctx.createLinearGradient(0, 0, w * 0.64, 0);
        erase.addColorStop(0, "rgba(0,0,0,1)");
        erase.addColorStop(0.72, "rgba(0,0,0,0.85)");
        erase.addColorStop(1, "rgba(0,0,0,0)");
        eraseW = w;
      }
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = erase;
      ctx.fillRect(0, 0, w * 0.64, h);
      ctx.globalCompositeOperation = "source-over";
    }
  };
  let erase: CanvasGradient | null = null;
  let eraseW = 0;

  const readPar = () => {
    const r = host.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const c = (r.top + r.height / 2 - vh / 2) / vh;
    parTarget = c < -1 ? -1 : c > 1 ? 1 : c;
  };

  const resize = () => {
    const r = host.getBoundingClientRect();
    const nw = Math.round(r.width);
    const nh = Math.round(r.height);
    if (!(nw >= MIN_SIDE && nh >= MIN_SIDE && nw <= MAX_SIDE && nh <= MAX_SIDE)) {
      // hidden / collapsed / mid-layout: drop the layout and paint nothing until a real size arrives
      w = 0;
      h = 0;
      state = null;
      return;
    }
    if (nw === w && nh === h && state) return;
    w = nw;
    h = nh;
    fx.lite = true; // medium motion: every scene runs its lighter element set (about half the elements)
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    state = scene.init(w, h, mulberry32(opts.seed), fx.lite);
    readPar();
    fx.par = parTarget;
    paint(clock);
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS - 2) return;
    const dt = prev ? Math.min(0.1, (now - prev) / 1000) : 0;
    prev = now;
    last = now;
    clock += dt;
    // parallax glides toward the scroll position (critically damped feel), never snaps
    fx.par += (parTarget - fx.par) * Math.min(1, dt * 3);
    paint(clock);
  };
  const start = () => {
    if (raf || !opts.motion || !visible || document.hidden) return;
    prev = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  if (!opts.motion) host.setAttribute("data-on", "");
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        if (!host.hasAttribute("data-on")) host.setAttribute("data-on", "");
        start();
      } else stop();
    },
    { rootMargin: "60px" },
  );
  io.observe(host);

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  const onScroll = () => {
    if (raf) readPar();
  };
  if (opts.motion) window.addEventListener("scroll", onScroll, { passive: true });

  // theme / mode switch → re-read tokens, drop tinted sprites and repaint
  const mo = new MutationObserver(() => {
    pal = readPalette(canvas);
    clear();
    paint(clock);
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("scroll", onScroll);
    clear();
  };
}
