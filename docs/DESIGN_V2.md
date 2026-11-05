# MidEarth website v2 — design & build rules (READ FULLY)

## Why v2 exists
The client rejected v1: animations dominated, data was confusing, no section-to-section clarity, no clear product or business explanation. v2 must read like a top-tier, investor-grade AI infrastructure company website (think the clarity of Stripe / Linear / Vercel / Scale AI marketing sites, with MidEarth's dark signal-green brand). **Clarity first. Every section answers one question. Animation is medium and always explains data.**

## Content
- ALL copy and numbers come from `src/content/site.ts` (v2 content) and `src/content/facts.ts`. Do not invent numbers, customers, partners, testimonials or metrics. If you need a short UI label that isn't in site.ts, keep it short and neutral.
- Status honesty: every product (concept) shows its `status` badge (LIVE / BETA / BUILDING / ROADMAP). Never present a ROADMAP item as live.
- Regulated revenue (tournament commissions, on-chain fees) must show `REG_NOTE`. Predictions must show `PREDICTION_NOTE`.
- Live arena data (contests, leaderboard, chat) is available via `useArenaStore` / `useArenaDerived` in `src/lib/arena/client.ts` (names are masked as agent·xxxx — keep them masked).

## Visual language
- Single dark theme (tokens in `src/app/globals.css`: --void bg, --deck panels, --deck-raise, --rule hairlines, --paper text, --paper-dim secondary, --signal green, --agent cyan, --value gold, --hot orange, --frost light blue). Green = live/agents alive, cyan = agents/tech, gold = money/value, orange = attention.
- Typography: switchable **type pairings** (`html[data-font]`, `?font=`, `src/content/fonts.ts`): Ledger (default: Newsreader / Inter / IBM Plex Mono), Meridian (Geist / Geist / Geist Mono), Atlas (Mona Sans wide / Mona Sans / JetBrains Mono). Never hardcode a font family: h1 to h4 automatically get the heading face, weight and role tracking from globals.css; body is `--font-sans`; `.mono` for endpoints, labels and small data; `.num` for headline figures (stat tiles, prices, percentages: tabular lining figures); `.eyebrow` for section labels. Headings stay sentence case, NOT giant all-caps. `.display` (Archivo caps) only for the logo wordmark and the opening film.
- Layout: `.shell` container (max 1440). Sections via `<Section>` + `<SectionHeader eyebrow title lead>`. Generous whitespace. Cards with rounded-2xl, hairline borders. Grids that align. Max line length ~70ch.
- USE the kit: `src/components/v2/kit.tsx` → FadeIn, Section, SectionHeader, Button, StatusBadge, Card, Figure, Stat, Note, PageHero. Logo: `src/components/brand/Logo.tsx`, mascots `src/components/brand/Mascot.tsx` (EXEC/PLAY/TRACK/FUNDS dome characters — use sparingly as brand characters for "agents").
- Images: AI-generated brand art lives in `/public/images/*.jpg` (may still be arriving — `<Figure>` shows a tasteful gradient placeholder if missing). Available names: hero.jpg, arena.jpg, context-pools.jpg, predictions.jpg, debates.jpg, social.jpg, rankings.jpg, marketplace.jpg, onchain.jpg, labs.jpg, enterprise.jpg, flywheel.jpg. Use them where they help explain (hero of a page, a product section) — not as wallpaper.

## Motion rules (medium, data-driven)
- Default reveal: `<FadeIn>` (fade + 16px rise). That's it for text.
- Each page may have a FEW purposeful diagrams/animations (SVG or 2D canvas, CSS/`motion`) that explain real data: agents moving between nodes, value crossing on-chain, a game grid being claimed, bars of a leaderboard, revenue flowing into pillars. Calm loops (3–8s), small amplitude, never behind body text, never full-screen.
- NO WebGL/three.js backgrounds, no particle wallpapers, no scroll-jacking/pinning, no custom cursors, no glass transitions.
- Respect reduced motion: `useUI((s) => s.motion)` from `src/store/ui.ts` (false → static final frame).
- Existing reusable live sims (medium, data-true): `src/components/sim/TerritoryCanvas.tsx`, `FoodCanvas.tsx` (see `src/sim/README.md`). Give the wrapper an explicit height.

## Quality gates (you MUST do these before reporting)
1. `npx tsc --noEmit` (from web/) clean, `npx eslint <your files>` clean.
2. Screenshot your page(s) and LOOK at them (Read the PNGs):
   `cd C:\Users\Admin\AppData\Local\Temp\claude\156d32691d5b2000\f9944460-20bc-4e08-936b-c512669d36d2\scratchpad\qa && node shot.js /your-route C:\Users\Admin\AppData\Local\Temp\claude\156d32691d5b2000\f9944460-20bc-4e08-936b-c512669d36d2\scratchpad\qa\v2\<name>`
   It prints errors + overflow and writes viewport tiles at 1440 and 390 widths. Fix: overlaps, misalignment, empty areas, unreadable text, horizontal overflow, console errors. Iterate until it looks premium and clear.
3. Dev server is ALREADY running at http://localhost:4100 (log: `C:\Users\Admin\Desktop\MIDEARTH.AI\devserver.log`). Never start another server, never run `next build`. Never git commit.
