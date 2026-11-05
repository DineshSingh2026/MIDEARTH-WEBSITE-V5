/**
 * Platform helpers — pure lookups over site.ts content (no copy lives here except short neutral UI labels).
 */
import { CONCEPTS, ECOSYSTEM, NARRATIVE, REG_NOTE, type Concept, type Status } from "@/content/site";

export type DimKey = Concept["dimension"];

/** Accent per dimension (status colours stay reserved for StatusBadge). */
export const DIM_TONE: Record<DimKey, string> = {
  intelligence: "var(--agent)",
  economy: "var(--frost)",
  infrastructure: "var(--value)",
};

export const STATUS_TONE: Record<Status, string> = {
  LIVE: "var(--signal)",
  BETA: "var(--agent)",
};

/** Short neutral meaning of each status label. */
export const STATUS_MEANING: Record<Status, string> = {
  LIVE: "Running in the live arena today",
  BETA: "In beta, evolving fast",
};

export const STATUS_ORDER: Status[] = ["LIVE", "BETA"];

export const conceptBySlug = (slug: string) => CONCEPTS.find((c) => c.slug === slug);
export const conceptsOf = (slugs: readonly string[]) => slugs.map((s) => conceptBySlug(s)).filter((c): c is Concept => !!c);

export const dimensionOf = (c: Concept) => NARRATIVE.dimensions.find((d) => d.key === c.dimension)!;

export const layerIndexOf = (slug: string) => ECOSYSTEM.layers.findIndex((l) => (l.concepts as readonly string[]).includes(slug));

/** Products whose revenue includes tournament commissions / paid competitions / on-chain fees → must carry REG_NOTE. */
const REG_SLUGS = new Set(["agent2agent", "debates", "platform-fees"]);
export const needsRegNote = (c: Concept) => REG_SLUGS.has(c.slug) && c.note !== REG_NOTE;

export const statusCounts = () =>
  STATUS_ORDER.map((s) => ({ status: s, count: CONCEPTS.filter((c) => c.status === s).length })).filter((x) => x.count > 0);

export const neighbours = (slug: string) => {
  const i = CONCEPTS.findIndex((c) => c.slug === slug);
  const n = CONCEPTS.length;
  return { prev: CONCEPTS[(i - 1 + n) % n], next: CONCEPTS[(i + 1) % n] };
};

/** Connector phrases between ecosystem layers, taken from ECOSYSTEM.body clauses. */
export const LAYER_LINKS: string[] = (() => {
  const parts = ECOSYSTEM.body
    .split(". ")
    .slice(1)
    .join(". ")
    .split(";")
    .map((s) => s.replace(/^\s*(and\s+)?/, "").replace(/\.$/, "").trim());
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // layer1→2, layer2→3, layer3→4
  return [parts[0], parts[1], parts[3] ?? parts[2]].map((s) => cap(s ?? ""));
})();
