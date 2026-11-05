/**
 * Opening film: timeline + boot logic.
 * One source for chapter order, durations (ms) and the short labels shown in the
 * chapter indicator and process rail. Visible text must never contain dashes.
 */

export const INTRO_KEY = "me-intro";

export type ChapterId = "logo" | "shift" | "platform" | "cycle" | "business" | "arena" | "vision" | "enter";

/**
 * The story, in order: what MidEarth is → why now → the platform → how it works →
 * how it earns → proof → the vision → the site. Each chapter: one idea, one visual.
 * Every chapter's entrance completes in roughly the first 40% so the rest is reading time.
 */
export const CHAPTERS: { id: ChapterId; label: string; ms: number }[] = [
  { id: "logo", label: "MidEarth", ms: 2600 },
  { id: "shift", label: "The shift", ms: 3300 },
  { id: "platform", label: "The platform", ms: 3900 },
  { id: "cycle", label: "How it works", ms: 4200 },
  { id: "business", label: "Agent economy", ms: 5000 },
  { id: "arena", label: "Live today", ms: 3000 },
  { id: "vision", label: "The vision", ms: 2600 },
  { id: "enter", label: "Enter", ms: 2200 },
];

export const TOTAL_MS = CHAPTERS.reduce((s, c) => s + c.ms, 0);
/** start offset of every chapter */
export const STARTS = CHAPTERS.reduce<number[]>((a, c, i) => (a.push(i === 0 ? 0 : a[i - 1] + CHAPTERS[i - 1].ms), a), []);
export const EXIT_MS = 800;
/** reduced-motion static card */
export const STATIC_MS = 3600;

export const chapterAt = (t: number) => {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) if (t >= STARTS[i]) return i;
  return 0;
};

/**
 * Runs inline in <head> before first paint. Sets html[data-intro="play"] when the film
 * should run, so the overlay covers the page from the first frame (no flash of site).
 * Rules: ?intro=1 forces (any page), ?intro=0 skips, ?format=md never, automated
 * browsers (navigator.webdriver) skip unless forced, otherwise on every full load / refresh of "/" (client-side navigation back to "/" does not replay).
 */
export const INTRO_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,q=new URLSearchParams(location.search),f=q.get("intro");if(q.get("format")==="md")return;if(f==="0"){try{sessionStorage.setItem("${INTRO_KEY}","1")}catch(e){}return}var p=f==="1";if(!p&&location.pathname==="/"&&!navigator.webdriver)p=true;if(p)d.dataset.intro="play"}catch(e){}})();`;
