/**
 * Colour themes — metadata only. The actual token values live in
 * `src/app/globals.css` under `html[data-theme="…"]`; swatches here mirror them
 * for the theme switcher preview. Keep both in sync.
 */
export type ThemeId = "obsidian" | "porcelain" | "travertine" | "aurum" | "sapphire" | "emerald";

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  description: string;
  scheme: "dark" | "light";
  /** browser chrome colour (= --void) */
  themeColor: string;
  /** preview swatches: ground, type, lead accent, value */
  swatches: [string, string, string, string];
};

export const DEFAULT_THEME: ThemeId = "obsidian";
export const THEME_STORAGE_KEY = "me-theme";

export const THEMES: ThemeMeta[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Deep ink with signal green, cyan circuitry and gold for value. The house look.",
    scheme: "dark",
    themeColor: "#04070b",
    swatches: ["#04070b", "#e4ecef", "#2ee6a1", "#e2b552"],
  },
  {
    id: "porcelain",
    name: "Porcelain",
    description: "Cool porcelain white, graphite ink and deepened jade. Daylight, built for reading reports.",
    scheme: "light",
    themeColor: "#f5f6f4",
    swatches: ["#f5f6f4", "#0d1418", "#05795a", "#8a6212"],
  },
  {
    id: "travertine",
    name: "Travertine",
    description: "Warm limestone, indigo ink, malachite and burnished brass. A mineral daylight with live panels in deep lacquer.",
    scheme: "light",
    themeColor: "#ece6db",
    swatches: ["#ece6db", "#161a22", "#0f3d30", "#7a5915"],
  },
  {
    id: "aurum",
    name: "Aurum",
    description: "Espresso black, champagne gold and ivory type. Quiet luxury.",
    scheme: "dark",
    themeColor: "#0a0806",
    swatches: ["#0a0806", "#f0e8d8", "#d5b878", "#7cc79b"],
  },
  {
    id: "sapphire",
    name: "Sapphire",
    description: "Midnight navy, platinum and ice blue. Institutional, calm, exact.",
    scheme: "dark",
    themeColor: "#050912",
    swatches: ["#050912", "#e7ebf2", "#8fbcef", "#e4c07a"],
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Forest black, bone type, emerald and brass. The warmth of a private bank.",
    scheme: "dark",
    themeColor: "#060d0a",
    swatches: ["#060d0a", "#ebe5d6", "#43cf8f", "#cfa95c"],
  },
];

export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && THEMES.some((t) => t.id === v);

/**
 * Runs inline in <head> before first paint: ?theme= (preview/share, not persisted)
 * wins over the saved choice; unknown values are ignored. Also syncs <meta name=theme-color>.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var ids=${JSON.stringify(Object.fromEntries(THEMES.map((t) => [t.id, t.themeColor])))};var d=document.documentElement;var q=new URLSearchParams(location.search).get("theme");var t=q&&ids[q]?q:null;if(!t){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s&&ids[s])t=s}catch(e){}}if(t&&t!=="${DEFAULT_THEME}")d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m&&t)m.setAttribute("content",ids[t])}catch(e){}})();`;
