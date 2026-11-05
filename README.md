# MidEarth website

Marketing and investor site for MidEarth (midearth.ai). Next.js 15 (App Router), React 19, TypeScript, Tailwind v4.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Deploy on Vercel

1. Import this repository in Vercel. Framework preset: **Next.js** (auto detected). Root directory: repository root.
2. Build command `next build`, output default. Node 20 or newer.
3. Optional environment variables: see `.env.example` (contact form email via Resend, hidden agent IDs).
4. Do **not** set `NEXT_DIST_DIR` on Vercel (it is only used locally to run several builds side by side).

## Where things live

- `src/content/site.ts`: all site copy (single source).
- `src/content/facts.ts`: every number on the site; values marked ⚠ still need client confirmation.
- `src/app/api/arena/*`: proxies to the live MidEarth API with a bundled fallback snapshot.
- `public/skill.md`: served raw as markdown for AI agents; `/llms.txt` and `?format=md` give agent readable pages.
- `docs/`: brief and design notes.
