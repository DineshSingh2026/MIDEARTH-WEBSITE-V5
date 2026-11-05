/**
 * Glass pane sweep geometry — shared by the WebGL edge shader, the backdrop-blur
 * DOM band and the clip/veil layers so all three stay pixel-synchronised.
 * All values are CSS px, origin top-left, y down.
 */
export type Vec2 = { x: number; y: number };

export type Sweep = {
  w: number;
  h: number;
  dir: Vec2; // unit direction of travel
  min: number; // min projection of viewport corners on dir
  max: number;
  half: number; // half width of the pane (px)
};

export function makeSweep(w: number, h: number, angleDeg = 16, reverse = false): Sweep {
  const a = (angleDeg * Math.PI) / 180;
  let dir = { x: Math.cos(a), y: Math.sin(a) };
  if (reverse) dir = { x: -dir.x, y: -dir.y };
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ].map(([x, y]) => x * dir.x + y * dir.y);
  const half = Math.max(90, Math.min(260, Math.hypot(w, h) * 0.11));
  return { w, h, dir, min: Math.min(...corners), max: Math.max(...corners), half };
}

/** Pane centre-line projection for eased progress e ∈ [0,1] (pane fully off-screen at both ends). */
export function edgeAt(sw: Sweep, e: number) {
  const a = sw.min - sw.half * 1.15;
  const b = sw.max + sw.half * 1.15;
  return a + (b - a) * e;
}

/** Clip the viewport rect to the half-plane dot(p,dir) - s  (<0 when `behind`, >0 otherwise). */
export function halfPlane(sw: Sweep, s: number, behind: boolean): Vec2[] {
  const rect: Vec2[] = [
    { x: 0, y: 0 },
    { x: sw.w, y: 0 },
    { x: sw.w, y: sw.h },
    { x: 0, y: sw.h },
  ];
  const f = (p: Vec2) => (p.x * sw.dir.x + p.y * sw.dir.y - s) * (behind ? -1 : 1);
  const out: Vec2[] = [];
  for (let i = 0; i < rect.length; i++) {
    const a = rect[i];
    const b = rect[(i + 1) % rect.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Band polygon |dot(p,dir) - s| < half (as a long parallelogram, clip-path clips the rest). */
export function band(sw: Sweep, s: number, from: number, to: number): Vec2[] {
  const n = { x: -sw.dir.y, y: sw.dir.x };
  const L = Math.hypot(sw.w, sw.h) * 2;
  const cx = sw.w / 2;
  const cy = sw.h / 2;
  // base point on centre line nearest to viewport centre
  const proj = cx * sw.dir.x + cy * sw.dir.y;
  const bx = cx + (s - proj) * sw.dir.x;
  const by = cy + (s - proj) * sw.dir.y;
  const p = (along: number, off: number): Vec2 => ({ x: bx + n.x * along + sw.dir.x * off, y: by + n.y * along + sw.dir.y * off });
  return [p(-L, from), p(L, from), p(L, to), p(-L, to)];
}

export const poly = (pts: Vec2[]) =>
  pts.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(",")})`;

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
