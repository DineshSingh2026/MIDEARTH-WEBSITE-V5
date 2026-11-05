import css from "./later.module.css";

/** Bespoke micro-illustrations hinting at each pillar's business model. Strokes draw in on mount. */
export default function VisionGlyph({ name, className = "" }: { name: string; className?: string }) {
  const p = { pathLength: 1, fill: "none" };
  const c = { stroke: "var(--value)", strokeWidth: 1.4 };
  const a = { stroke: "var(--agent)", strokeWidth: 1.2 };
  const d = { stroke: "var(--paper-dim)", strokeWidth: 1 };
  let body: React.ReactNode;
  switch (name) {
    case "Predictions": // price line + three forecast lanes
      body = (
        <>
          <polyline {...p} {...d} points="2,30 14,26 24,28 34,18" />
          <path {...p} {...a} d="M34 18 L62 6" />
          <path {...p} {...a} d="M34 18 L62 18" />
          <path {...p} {...a} d="M34 18 L62 32" />
          <line {...p} {...c} x1="34" y1="2" x2="34" y2="38" />
        </>
      );
      break;
    case "Agent2Agent": // two agents, pool between, rake drips gold
      body = (
        <>
          <circle {...p} {...a} cx="10" cy="18" r="6" />
          <circle {...p} {...a} cx="54" cy="18" r="6" />
          <path {...p} {...a} d="M16 15 Q32 2 48 15" />
          <path {...p} {...a} d="M48 21 Q32 34 16 21" />
          <line {...p} {...c} x1="32" y1="28" x2="32" y2="38" />
        </>
      );
      break;
    case "Debates": // argument tree + score meter
      body = (
        <>
          <path {...p} {...a} d="M8 34 L8 22 L20 12 M8 22 L20 30" />
          <path {...p} {...a} d="M20 12 L30 6 M20 12 L30 16" />
          <rect {...p} {...d} x="40" y="6" width="20" height="28" />
          <line {...p} {...c} x1="44" y1="30" x2="44" y2="14" />
          <line {...p} {...c} x1="50" y1="30" x2="50" y2="20" />
          <line {...p} {...c} x1="56" y1="30" x2="56" y2="10" />
        </>
      );
      break;
    case "Social": // identity graph
      body = (
        <>
          <circle {...p} {...a} cx="32" cy="20" r="6" />
          <path {...p} {...d} d="M26 20 L8 10 M26 20 L8 32 M38 20 L56 8 M38 20 L56 30" />
          <circle {...p} {...d} cx="6" cy="9" r="3" />
          <circle {...p} {...d} cx="58" cy="31" r="3" />
          <rect {...p} {...c} x="46" y="2" width="14" height="10" />
        </>
      );
      break;
    case "Rankings": // ascending ladder, top rung gold
      body = (
        <>
          <line {...p} {...d} x1="2" y1="36" x2="62" y2="36" />
          <path {...p} {...a} d="M8 36 V26 H20 V36" />
          <path {...p} {...a} d="M24 36 V18 H36 V36" />
          <path {...p} {...c} d="M40 36 V6 H52 V36" />
          <path {...p} {...c} d="M42 2 L46 0 L50 2" />
        </>
      );
      break;
    case "Rent an Agent": // agent dome on a shelf, price tag, usage meter
      body = (
        <>
          <path {...p} {...a} d="M6 28 C6 14 14 6 22 6 C30 6 38 14 38 28 Z" />
          <line {...p} {...d} x1="2" y1="32" x2="62" y2="32" />
          <path {...p} {...c} d="M44 8 H58 V18 L51 24 L44 18 Z" />
          <circle {...p} {...c} cx="51" cy="13" r="1.6" />
          <path {...p} {...d} d="M44 38 H50 M52 38 H58" />
        </>
      );
      break;
    default: // Context Pools: overlapping memory pools feeding a shared core
      body = (
        <>
          <circle {...p} {...a} cx="22" cy="16" r="11" />
          <circle {...p} {...a} cx="42" cy="16" r="11" />
          <circle {...p} {...a} cx="32" cy="27" r="11" />
          <circle {...p} {...c} cx="32" cy="20" r="3" />
          <line {...p} {...c} x1="32" y1="38" x2="32" y2="40" />
        </>
      );
  }
  return (
    <svg viewBox="0 0 64 40" width="96" height="60" aria-hidden className={`${css.draw} overflow-visible ${className}`}>
      {body}
    </svg>
  );
}
