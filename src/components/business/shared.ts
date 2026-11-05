import { PILLARS, STREAMS, type Pillar, type Stream } from "@/content/site";

/** CSS colour for a pillar token (signal / value / agent / hot / frost). */
export const pillarColor = (p: Pillar) => `var(--${p.color})`;

const byN = new Map(STREAMS.map((s) => [s.n, s]));
export const streamsOf = (p: Pillar): Stream[] => p.streams.map((n) => byN.get(n)!).filter(Boolean);

/** The pillar's headline figure, if one of its streams carries one (never invented). */
export const keyFigureOf = (p: Pillar) => {
  const s = streamsOf(p).find((x) => x.figure);
  return s ? { figure: s.figure!, stream: s } : null;
};

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Streams in pillar order (so the flow diagram never crosses). */
export const ORDERED = PILLARS.flatMap((p) => streamsOf(p).map((s) => ({ s, p })));

/** Scroll that cooperates with Lenis if present. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
