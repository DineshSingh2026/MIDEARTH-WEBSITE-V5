/**
 * Geometry builders for the Watch scene. Everything returned here is owned by the caller and must be disposed.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* ── The MidEarth dome (brand mascot, see components/brand/Logo.tsx) as a surface of revolution ──
   Local frame: base at y=0, front (eyes) faces +Z. */
export const DOME = { R: 0.6, y0: 0.16, H: 0.74 };

/** point on the dome surface: az (rad, 0 = front +Z, + = towards +X), el (rad, 0 = equator) */
export function domeSurface(az: number, el: number, out: THREE.Vector3, lift = 0) {
  const { R, y0, H } = DOME;
  const r = R * Math.cos(el) + lift;
  out.set(r * Math.sin(az), y0 + H * Math.sin(el) + lift * Math.sin(el), r * Math.cos(az));
  return out;
}

const BRAND = ["#2a9bf0", "#36bfb0", "#3edb8e", "#57ff5e"].map((c) => new THREE.Color(c));

export function domeGeometry(radial = 56, rings = 28) {
  const { R, y0, H } = DOME;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(R * 0.82, 0), new THREE.Vector2(R * 0.93, 0.012), new THREE.Vector2(R * 0.985, 0.05), new THREE.Vector2(R, 0.1), new THREE.Vector2(R, y0)];
  for (let i = 1; i <= rings; i++) {
    const el = (i / rings) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, R * Math.cos(el)), y0 + H * Math.sin(el)));
  }
  const g = new THREE.LatheGeometry(pts, radial);
  // brand gradient baked as vertex colour: green core high on the front-right, blue at the base and back
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const core = new THREE.Vector3(0.45, 0.62, 0.64).normalize();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i) - y0 * 0.6, pos.getZ(i)).normalize();
    const h = THREE.MathUtils.clamp(pos.getY(i) / (y0 + H), 0, 1);
    let f = 0.4 * Math.pow(h, 1.3) + 0.62 * Math.pow(0.5 + 0.5 * v.dot(core), 1.4) - 0.04;
    f = THREE.MathUtils.clamp(f * 1.08 - 0.04, 0, 1);
    const s = f * 3;
    const k = Math.min(2, Math.floor(s));
    c.copy(BRAND[k]).lerp(BRAND[k + 1], THREE.MathUtils.smoothstep(s - k, 0, 1));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

/** a small, cheaper dome for the agents on the board */
export function miniDomeGeometry() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(0.92, 0), new THREE.Vector2(1, 0.12)];
  for (let i = 1; i <= 8; i++) {
    const el = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(el)), 0.12 + 1.1 * Math.sin(el)));
  }
  return new THREE.LatheGeometry(pts, 20);
}

/** chair shell: seat pad + curved back, merged (one geometry → one instanced draw call). Back sits on local −Z. */
export function chairGeometry() {
  const seat = new RoundedBoxGeometry(1.18, 0.16, 1.0, 3, 0.07);
  seat.translate(0, -0.08, -0.04);
  const back = new RoundedBoxGeometry(1.26, 0.66, 0.16, 3, 0.07);
  back.translate(0, 0.3, 0);
  back.rotateX(-0.16);
  back.translate(0, 0, -0.62);
  const stem = new THREE.CylinderGeometry(0.09, 0.14, 0.5, 12);
  stem.translate(0, -0.4, -0.05);
  const parts = [seat, back, stem].map((g) => (g.index ? g.toNonIndexed() : g));
  // keep attribute sets identical (RoundedBox has no index, Cylinder does)
  parts.forEach((g) => {
    if (g.attributes.uv === undefined) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  });
  const merged = mergeGeometries(parts, false)!;
  seat.dispose();
  back.dispose();
  stem.dispose();
  parts.forEach((g) => g.dispose());
  return merged;
}

/** amphitheatre tiers as one lathe: (r, y) steps around the pit */
export const TIERS = [
  { r0: 4.35, r1: 5.9, y: 0.32 },
  { r0: 5.9, r1: 7.5, y: 0.72 },
  { r0: 7.5, r1: 9.6, y: 1.12 },
] as const;

export function tierGeometry() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(4.35, 0)];
  for (const t of TIERS) {
    pts.push(new THREE.Vector2(t.r0, t.y - 0.02), new THREE.Vector2(t.r0 + 0.02, t.y), new THREE.Vector2(t.r1, t.y));
  }
  pts.push(new THREE.Vector2(9.6, 0));
  // lathe winds the profile; we want normals facing up/inwards → reverse
  return new THREE.LatheGeometry(pts.reverse(), 128);
}

/* ── Canvas textures ── */
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** console screen UI: a little bit of everything, drawn once (dark ground so additive glow stays clean) */
export function consoleTexture(p: { signal: string; agent: string; value: string; frost: string }) {
  const c = canvas(256, 160);
  const g = c.getContext("2d")!;
  g.fillStyle = "#03080c";
  g.fillRect(0, 0, 256, 160);
  const grad = g.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, "rgba(56,198,228,0.18)");
  grad.addColorStop(1, "rgba(56,198,228,0.02)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = p.agent;
  g.globalAlpha = 0.9;
  g.lineWidth = 3;
  roundRect(g, 4, 4, 248, 152, 14);
  g.stroke();
  // mini board
  g.globalAlpha = 1;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const v = (x * 7 + y * 13 + x * y) % 9;
      g.fillStyle = v < 3 ? p.signal : v < 4 ? p.value : v < 5 ? p.agent : "rgba(140,170,190,0.16)";
      g.globalAlpha = v < 5 ? 0.85 : 1;
      g.fillRect(18 + x * 12, 22 + y * 12, 10, 10);
    }
  // bars
  g.globalAlpha = 1;
  const bars = [0.82, 0.6, 0.44, 0.3];
  bars.forEach((b, i) => {
    g.fillStyle = "rgba(160,190,205,0.18)";
    g.fillRect(132, 28 + i * 22, 104, 8);
    g.fillStyle = [p.signal, p.agent, p.value, p.frost][i];
    g.fillRect(132, 28 + i * 22, 104 * b, 8);
  });
  // ring gauge
  g.fillStyle = p.frost;
  g.globalAlpha = 0.55;
  g.fillRect(18, 128, 100, 3);
  g.fillRect(132, 128, 70, 3);
  g.fillRect(132, 138, 46, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** wall art panel: equaliser bars + dots (decor, static) */
export function wallPanelTexture(p: { signal: string; agent: string; blue: string }) {
  const c = canvas(512, 256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = p.signal;
  g.lineWidth = 5;
  g.shadowColor = p.signal;
  g.shadowBlur = 12;
  roundRect(g, 10, 10, 492, 236, 34);
  g.stroke();
  g.shadowBlur = 0;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = p.agent;
    g.beginPath();
    g.arc(70, 66 + i * 42, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = i % 2 ? p.blue : p.agent;
    g.globalAlpha = 0.9;
    roundRect(g, 96, 58 + i * 42, 300 - i * 46, 16, 8);
    g.fill();
    g.globalAlpha = 0.22;
    roundRect(g, 96, 58 + i * 42, 360, 16, 8);
    g.fill();
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** soft round sprite for glows */
export function glowTexture() {
  const c = canvas(128, 128);
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.45)");
  r.addColorStop(0.6, "rgba(255,255,255,0.08)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
