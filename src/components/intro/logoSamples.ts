import { DOME_EYES, DOME_PATH } from "@/components/brand/Logo";

/**
 * Samples the real dome mascot (DOME_PATH + DOME_EYES, viewBox 240×200) into
 * particle targets: normalised uv (0..1, y down) + colour from the logo's own
 * radial gradient (#57FF5E → #3EDB8E → #36BFB0 → #2A9BF0) and blue under-light.
 */
export type LogoSamples = { uv: Float32Array; color: Float32Array; count: number };

const STOPS: [number, [number, number, number]][] = [
  [0, [0x57, 0xff, 0x5e]],
  [0.42, [0x3e, 0xdb, 0x8e]],
  [0.78, [0x36, 0xbf, 0xb0]],
  [1, [0x2a, 0x9b, 0xf0]],
];
// path bbox (approx, from the curve extremes)
const BX = 8.5,
  BY = 22,
  BW = 225,
  BH = 172;

function gradient(x: number, y: number): [number, number, number] {
  const u = (x - BX) / BW;
  const v = (y - BY) / BH;
  const t = Math.min(1, Math.hypot(u - 0.6, v - 0.42) / 0.78);
  let c = STOPS[STOPS.length - 1][1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (t >= a && t <= b) {
      const k = (t - a) / (b - a);
      c = [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
      break;
    }
  }
  // linear blue under-light: (0,1) → (0.6,0.3), #2A8DF5 at .9 → 0
  const dx = 0.6,
    dy = -0.7;
  const s = Math.max(0, Math.min(1, (u * dx + (v - 1) * dy) / (dx * dx + dy * dy)));
  const a = 0.9 * (1 - s) * 0.85;
  return [(c[0] + (0x2a - c[0]) * a) / 255, (c[1] + (0x8d - c[1]) * a) / 255, (c[2] + (0xf5 - c[2]) * a) / 255];
}

function inEye(x: number, y: number) {
  for (const e of DOME_EYES) {
    const r = (-e.rot * Math.PI) / 180;
    const dx = x - e.cx;
    const dy = y - e.cy;
    const lx = dx * Math.cos(r) - dy * Math.sin(r);
    const ly = dx * Math.sin(r) + dy * Math.cos(r);
    if ((lx * lx) / (e.rx * e.rx) + (ly * ly) / (e.ry * e.ry) <= 1) return true;
  }
  return false;
}

export function sampleLogo(count: number): LogoSamples {
  const uv = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext("2d");
  const path = new Path2D(DOME_PATH);
  const inside = (x: number, y: number) => (ctx ? ctx.isPointInPath(path, x, y) : true);
  const eyeN = Math.round(count * 0.05);
  const rimN = Math.round(count * 0.07);
  let n = 0;
  const push = (x: number, y: number, col: [number, number, number]) => {
    uv[n * 2] = x / 240;
    uv[n * 2 + 1] = y / 200;
    color[n * 3] = col[0];
    color[n * 3 + 1] = col[1];
    color[n * 3 + 2] = col[2];
    n++;
  };
  // eyes — dense, white
  let guard = 0;
  while (n < eyeN && guard++ < eyeN * 50) {
    const e = DOME_EYES[n % 2];
    const x = e.cx + (Math.random() * 2 - 1) * (e.ry + 1);
    const y = e.cy + (Math.random() * 2 - 1) * (e.ry + 1);
    if (inEye(x, y)) push(x, y, [1.25, 1.3, 1.3]);
  }
  // rim — crisp silhouette (sample just inside the outline)
  guard = 0;
  while (n < eyeN + rimN && guard++ < rimN * 400) {
    const x = BX + Math.random() * BW;
    const y = BY + Math.random() * BH;
    if (!inside(x, y)) continue;
    const near = !inside(x + 2.2, y) || !inside(x - 2.2, y) || !inside(x, y + 2.2) || !inside(x, y - 2.2);
    if (near) {
      const g = gradient(x, y);
      push(x, y, [g[0] * 1.15, g[1] * 1.15, g[2] * 1.15]);
    }
  }
  // body fill
  guard = 0;
  while (n < count && guard++ < count * 20) {
    const x = BX + Math.random() * BW;
    const y = BY + Math.random() * BH;
    if (!inside(x, y) || inEye(x, y)) continue;
    push(x, y, gradient(x, y));
  }
  return { uv, color, count: n };
}
