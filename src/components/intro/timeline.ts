/** Film clock (seconds). Shared by the WebGL film, the DOM titles and the SVG fallback. */
export const T = {
  nodes: 0.6,
  step: 0.15,
  launch: 2.4,
  flash: 4.35,
  solid: 4.55,
  word: 4.75,
  tagline: 5.55,
  status: 5.95,
  exit: 6.75,
  exitDur: 0.95,
} as const;
export const FILM_END = T.exit + T.exitDur;

/** Twelve regions — lat, lon (deg); lon 0 faces camera. */
export const NODES: readonly [number, number][] = [
  [3, -2],
  [30, -36],
  [-24, 38],
  [48, 20],
  [-42, -28],
  [12, 56],
  [-6, -58],
  [62, -12],
  [-58, 14],
  [34, 70],
  [-30, -76],
  [6, 82],
];

export const ignitionTime = (i: number) => (i === 0 ? 0 : T.nodes + (i - 1) * T.step + 0.15);

export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const expoOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
