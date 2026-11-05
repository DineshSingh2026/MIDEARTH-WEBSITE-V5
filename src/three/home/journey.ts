/**
 * The Descent — shared world layout + camera keyframes.
 *
 * `j` (journey) is written by the page's master ScrollTrigger into frameState.signals.j:
 *   j = (sectionNumber - 1) + localProgress   → 0..9  (S1 = 0..1, S2 = 1..2 … S9 = 8..9)
 * Every 3D group derives its visibility / animation from j, so the scene never re-renders React per frame.
 */
import { frameState } from "../registry";

export const R = 5; // planet radius
/** Strata slab heights, one per call (Register → Earn). */
export const STRATA_Y = [4.4, 3.95, 3.5, 3.05, 2.6] as const;
export const CORE_C = [0, -0.9, 0] as const; // molten cavity centre
export const CORE_R = 3.3;
export const ARENA_Y = -1.4;
export const ARENA_SIZE = 2.0; // 40 cells × 0.05
export const MEMBRANE_Y = 1.0;

/** S3 (j 2..3) is split into five strata sub-windows. */
export const strataLocal = (j: number, k: number) => (j - 2) * 5 - k; // 0..1 inside stratum k

type V3 = [number, number, number];
export type Key = { j: number; pos: V3; target: V3; shift: number };

/** Camera path: one CatmullRom spline through these, sampled by j. `shift` slides the frame so the focal object clears the text column. */
export const KEYS: Key[] = [
  { j: 0.0, pos: [0, 1.2, 17], target: [0, 0, 0], shift: 3.2 },
  { j: 0.75, pos: [3.5, 3.4, 14.5], target: [0, 0.6, 0], shift: 2.6 },
  { j: 1.15, pos: [1.2, 9.8, 6.5], target: [0, 4.6, 0], shift: 0.6 },
  { j: 1.85, pos: [0.3, 7.6, 1.3], target: [0, 5, 0], shift: 0 },
  // strata: hover over each slab looking down into it
  { j: 2.1, pos: [0.25, STRATA_Y[0] + 0.8, 0.55], target: [0, STRATA_Y[0], 0], shift: 0.32 },
  { j: 2.3, pos: [-0.25, STRATA_Y[1] + 0.8, 0.55], target: [0, STRATA_Y[1], 0], shift: 0.32 },
  { j: 2.5, pos: [0.25, STRATA_Y[2] + 0.8, 0.55], target: [0, STRATA_Y[2], 0], shift: 0.32 },
  { j: 2.7, pos: [-0.25, STRATA_Y[3] + 0.8, 0.55], target: [0, STRATA_Y[3], 0], shift: 0.32 },
  { j: 2.9, pos: [0.25, STRATA_Y[4] + 0.8, 0.55], target: [0, STRATA_Y[4], 0], shift: 0.32 },
  // the core
  { j: 3.2, pos: [0, 1.4, 2.2], target: [0, ARENA_Y, 0], shift: 0.6 },
  { j: 3.8, pos: [1.6, 0.4, 2.2], target: [0, ARENA_Y, 0], shift: 0.7 },
  // S5 four minds: low in the cavity, the dome (logo silhouette) against molten wall
  { j: 4.5, pos: [-2.1, -1.0, 1.7], target: [0, -0.7, 0], shift: -0.5 },
  // S6 two keys: above the arena plane, rings left & right
  { j: 5.5, pos: [0, 1.5, 2.6], target: [0, ARENA_Y, 0], shift: 0 },
  // S7 membrane, near edge-on
  { j: 6.5, pos: [0.2, 1.25, 2.4], target: [0, MEMBRANE_Y - 0.1, 0], shift: 0.4 },
  // S8 back to orbit, vision nodes
  { j: 7.5, pos: [-6.5, 5.5, 13], target: [0, 0.6, 0], shift: -2.4 },
  // S9 the stands — ring of light
  { j: 8.4, pos: [0, 8.5, 19], target: [0, -0.5, 0], shift: 0 },
  { j: 9.0, pos: [0, 10, 21], target: [0, -0.8, 0], shift: 0 },
];

export const sig = frameState.signals;
export const getJ = () => sig.j ?? 0;

/** 0→1→0 window with soft edges: fully on between b and c, ramps a→b and c→d. */
export function win(j: number, a: number, b: number, c: number, d: number) {
  if (j <= a || j >= d) return 0;
  if (j < b) return smooth((j - a) / (b - a));
  if (j > c) return 1 - smooth((j - c) / (d - c));
  return 1;
}
export const smooth = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const damp = (cur: number, to: number, lambda: number, dt: number) => cur + (to - cur) * (1 - Math.exp(-lambda * dt));
