/**
 * Type pairings — metadata only. Font files are loaded in `src/app/layout.tsx` (next/font);
 * the actual switch is CSS: `html[data-font="…"]` in `src/app/globals.css` re-points
 * --ff-heading / --ff-sans / --ff-mono and the per-pairing tweaks. Keep the three in sync.
 */
export type FontId = "ledger" | "meridian" | "atlas";

export type FontMeta = {
  id: FontId;
  name: string;
  /** one line rationale, shown in the switcher */
  description: string;
  /** human readable stack: heading / body / data */
  stack: string;
};

export const DEFAULT_FONT: FontId = "ledger";
export const FONT_STORAGE_KEY = "me-font";

export const FONTS: FontMeta[] = [
  {
    id: "ledger",
    name: "Ledger",
    description: "Editorial serif headlines over a precise grotesk. The calm authority of a private bank report.",
    stack: "Newsreader · Inter · IBM Plex Mono",
  },
  {
    id: "meridian",
    name: "Meridian",
    description: "One engineered superfamily, Swiss and exact. Built for developer infrastructure.",
    stack: "Geist · Geist · Geist Mono",
  },
  {
    id: "atlas",
    name: "Atlas",
    description: "Wide, confident grotesk headlines that echo the wordmark. Bold and modern.",
    stack: "Mona Sans Wide · Mona Sans · JetBrains Mono",
  },
];

export const isFontId = (v: unknown): v is FontId => typeof v === "string" && FONTS.some((f) => f.id === v);

/**
 * Runs inline in <head> before first paint: ?font= (preview/share, not persisted) wins over
 * the saved choice; unknown values are ignored. The default pairing carries no attribute.
 */
export const FONT_BOOT_SCRIPT = `(function(){try{var ids=${JSON.stringify(FONTS.map((f) => f.id))};var d=document.documentElement;var q=new URLSearchParams(location.search).get("font");var f=q&&ids.indexOf(q)>-1?q:null;if(!f){try{var s=localStorage.getItem("${FONT_STORAGE_KEY}");if(s&&ids.indexOf(s)>-1)f=s}catch(e){}}if(f&&f!=="${DEFAULT_FONT}")d.dataset.font=f}catch(e){}})();`;
