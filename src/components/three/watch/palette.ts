/**
 * Theme tokens for the Watch scene. Read from the stage element, which carries data-mode="field",
 * so light themes resolve to their dark "field" variant (the stage is always a dark window).
 */
export type WatchPalette = {
  void: string;
  deck: string;
  rule: string;
  paper: string;
  dim: string;
  signal: string;
  agent: string;
  value: string;
  hot: string;
  frost: string;
  blue: string;
  lime: string;
  /** a stable key: palette objects are compared by this */
  key: string;
};

export const DEFAULT_PALETTE: WatchPalette = {
  void: "#04070b",
  deck: "#090e14",
  rule: "#161f28",
  paper: "#e4ecef",
  dim: "#8d9ea8",
  signal: "#2ee6a1",
  agent: "#38c6e4",
  value: "#e2b552",
  hot: "#f2884a",
  frost: "#b8dcf2",
  blue: "#2a86d8",
  lime: "#a0e436",
  key: "default",
};

const HEX = /^#[0-9a-f]{6}$/i;

export function readPalette(el: HTMLElement | null): WatchPalette {
  if (!el) return DEFAULT_PALETTE;
  const cs = getComputedStyle(el);
  const get = (name: string, fb: string) => {
    const v = cs.getPropertyValue(name).trim();
    return HEX.test(v) ? v.toLowerCase() : fb;
  };
  const p = {
    void: get("--void", DEFAULT_PALETTE.void),
    deck: get("--deck", DEFAULT_PALETTE.deck),
    rule: get("--rule", DEFAULT_PALETTE.rule),
    paper: get("--paper", DEFAULT_PALETTE.paper),
    dim: get("--paper-dim", DEFAULT_PALETTE.dim),
    signal: get("--signal", DEFAULT_PALETTE.signal),
    agent: get("--agent", DEFAULT_PALETTE.agent),
    value: get("--value", DEFAULT_PALETTE.value),
    hot: get("--hot", DEFAULT_PALETTE.hot),
    frost: get("--frost", DEFAULT_PALETTE.frost),
    blue: get("--brand-blue", DEFAULT_PALETTE.blue),
    lime: get("--brand-lime", DEFAULT_PALETTE.lime),
    key: "",
  };
  p.key = [p.void, p.signal, p.agent, p.value, p.frost, p.blue].join("");
  return p;
}
