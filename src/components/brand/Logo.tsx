import { useId } from "react";

/**
 * MidEarth dome mascot — vector rebuild of /brand/logo-lockup.png
 * (green core → cyan → brand blue, two white eyes looking up-right).
 */
export const DOME_PATH =
  "M10,168 C6,86 58,22 122,22 C186,22 236,84 232,166 C231,184 219,194 200,194 L42,194 C22,194 11,186 10,168 Z";
export const DOME_EYES = [
  { cx: 165, cy: 78, rx: 9.5, ry: 13.5, rot: -12 },
  { cx: 197, cy: 68, rx: 9.5, ry: 13.5, rot: -12 },
] as const;

export function Logo({ size = 28, className, title }: { size?: number; className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 240 200"
      width={size * 1.2}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <radialGradient id={`dg-${id}`} cx="0.6" cy="0.42" r="0.78">
          <stop offset="0" stopColor="#57FF5E" />
          <stop offset="0.42" stopColor="#3EDB8E" />
          <stop offset="0.78" stopColor="#36BFB0" />
          <stop offset="1" stopColor="#2A9BF0" />
        </radialGradient>
        <linearGradient id={`dl-${id}`} x1="0" y1="1" x2="0.6" y2="0.3">
          <stop offset="0" stopColor="#2A8DF5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2A8DF5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={DOME_PATH} fill={`url(#dg-${id})`} />
      <path d={DOME_PATH} fill={`url(#dl-${id})`} />
      <path d={DOME_PATH} fill="none" stroke="rgba(0,40,40,0.35)" strokeWidth="1.5" />
      {DOME_EYES.map((e, i) => (
        <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="#fff" transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} />
      ))}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Logo size={24} />
      <span className="display text-[1.05rem] leading-none" style={{ fontVariationSettings: '"wdth" 112, "wght" 760', letterSpacing: "0.04em" }}>
        MIDEARTH
      </span>
    </span>
  );
}
