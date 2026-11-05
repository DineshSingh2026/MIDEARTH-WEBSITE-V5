import { useId } from "react";

export type MascotKind = "exec" | "play" | "track" | "funds";

/** The four minds — vector mascots taken from midearth.ai (EXEC, PLAY, TRACK, FUNDS). */
export function Mascot({ kind, size = 48, className }: { kind: MascotKind; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = `mg-${kind}-${id}`;
  const stops =
    kind === "exec"
      ? ["var(--agent)", "var(--signal)", "var(--brand-lime)"]
      : ["var(--brand-blue)", "var(--agent)", "var(--signal)"];
  const offs = kind === "exec" ? ["0%", "55%", "100%"] : ["0%", "60%", "100%"];
  const stroke = { stroke: "rgba(0,0,0,0.45)", strokeWidth: 2 };
  return (
    <svg viewBox="0 0 120 100" width={size * 1.2} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="4" y1="88" x2="112" y2="10" gradientUnits="userSpaceOnUse">
          {stops.map((c, i) => (
            <stop key={i} offset={offs[i]} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      {kind === "exec" && (
        <>
          <path d="M8,64 C8,30 30,6 60,6 C90,6 112,30 112,64 C112,76 104,84 92,84 C84,84 78,80 68,82 C60,84 54,90 44,88 C34,86 30,80 22,82 C12,84 8,76 8,64 Z" fill={`url(#${g})`} {...stroke} />
          <ellipse cx="70" cy="48" rx="7" ry="10" fill="#fff" />
          <ellipse cx="87.5" cy="39" rx="8" ry="11" fill="#fff" />
        </>
      )}
      {kind === "play" && (
        <>
          <rect x="16" y="8" width="88" height="84" rx="22" fill={`url(#${g})`} {...stroke} />
          <ellipse cx="71" cy="42" rx="7" ry="9.5" fill="#fff" />
          <ellipse cx="88" cy="36" rx="7.5" ry="10" fill="#fff" />
        </>
      )}
      {kind === "track" && (
        <>
          <path d="M22,74 C10,74 4,64 10,55 C6,45 14,36 25,37 C26,24 40,14 54,17 C62,7 80,6 90,15 C102,14 114,23 112,35 C122,37 126,50 116,58 C120,68 112,78 100,78 Z" fill={`url(#${g})`} {...stroke} strokeLinejoin="round" />
          <ellipse cx="68" cy="47" rx="6.5" ry="9" fill="#fff" />
          <ellipse cx="84" cy="40" rx="7" ry="9.5" fill="#fff" />
        </>
      )}
      {kind === "funds" && (
        <>
          <ellipse cx="60" cy="50" rx="51" ry="43" fill={`url(#${g})`} {...stroke} />
          <ellipse cx="71" cy="41" rx="7" ry="10" fill="#fff" />
          <ellipse cx="88" cy="35" rx="7.5" ry="10" fill="#fff" />
        </>
      )}
    </svg>
  );
}
