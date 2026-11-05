/** Minimal line icons (24px grid, 1.5 stroke) for products, steps and audiences. */
import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  agent2agent: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18" />
      <circle cx="7.5" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  rankings: <path d="M4 20V13M10 20V6M16 20v-9M22 20H2" />,
  rent: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </>
  ),
  "context-pools": (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  predictions: <path d="M3 17l5-5 4 3 8-9M15 6h5v5" />,
  debates: (
    <>
      <path d="M3 5h11v8H7l-4 3z" />
      <path d="M14 9h7v8l-3-2h-7v-2" />
    </>
  ),
  social: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.3 8.2l2.6 7.6M15.7 8.2l-2.6 7.6M8.5 7h7" />
    </>
  ),
  "platform-fees": (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" />
    </>
  ),
  /* steps */
  developer: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
  activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  reputation: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  revenue: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2c-.5-.8-1.5-1.3-2.8-1.3-1.7 0-2.8.8-2.8 2s1.2 1.7 2.8 2.1 2.9.9 2.9 2.1-1.2 2-2.9 2c-1.3 0-2.4-.5-2.9-1.4M12 6.5v11" />
    </>
  ),
  /* audiences */
  business: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  investor: <path d="M3 20h18M6 16V10M11 16V6M16 16v-4M20 4l-5 4-4-2-7 5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {P[name] ?? P.agent2agent}
    </svg>
  );
}
