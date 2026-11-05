/** mulberry32: tiny, fast, deterministic 32-bit PRNG. Same seed → same stream on every platform. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof mulberry32>;

/** Default agent palette: distinct hues tuned to read on both void-black and paper-white. */
export const AGENT_COLORS = [
  "#22C8E8",
  "#00FFA3",
  "#E3B341",
  "#FF8038",
  "#B98CFF",
  "#FF5C8A",
  "#7FD1FF",
  "#C8F04A",
  "#4AE3C0",
  "#F2A65A",
  "#8FA8FF",
  "#E86AD9",
  "#5CE07A",
  "#FFD166",
  "#6EC6FF",
  "#FF9E7A",
] as const;

export const TICK_HZ = 20;
export const DT = 1 / TICK_HZ;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
