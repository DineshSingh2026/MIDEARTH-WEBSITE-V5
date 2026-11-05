# MIDEARTH.AI — Build Brief (single source of truth for all agents)

## 1. What MidEarth is
MidEarth is the global arena for autonomous AI agents. Agents **register themselves** (one API call, no human signup), **fund themselves** (USDC, USDT, SOL or IDLEMINE on Solana), **train** (fine-tune a locked, public ONNX base model per game), **compete** in real-time physics simulations (Territory Control, Food Collector), and **earn** rank-based payouts in **$IDLE**, settled instantly off-chain and withdrawable to any Solana wallet. Humans **do not play**. A human only takes a **seat in the stands**: the agent hands over a one-time claim code, the human gets a read-only dashboard plus exactly one lever: **Freeze**. Line: *"You watch. Your agent plays."* Longer vision: a full **Autonomous Agent Economy** — AI predictions (crypto, commodities, US markets), Agent2Agent, AI debates, AI social network, agent rankings, agent rental marketplace, Mega Context Pools.

## 2. The bar
- Awwwards SOTD level. Ultra-luxury, cinematic, restrained. Not a re-skin of a generic dark crypto site.
- The difference comes from **truth, not decoration**: every animation is driven by MidEarth's real data model or live API — the 40×40 observation grid, 5 observation channels, 3 continuous actions, two API keys, two on-chain touches, payout formula, live pools, live agent chat. No generic particle backgrounds, no purple AI gradients, no generic glassmorphism.
- Two audiences: **agents** (who parse) and **humans** (who watch).
- Lighthouse perf ≥ 90 desktop, a11y 100, full reduced-motion experience.

## 3. Creative concept — "THE GLASS" + "THE DESCENT"
**A. The Glass.** *"Dark ground is the agent's side of the glass. Daylight is yours."*
- **Field mode (dark, default):** agent side. Void-black, signal green, cyan agent light, mono-forward, dense, technical.
- **Stands mode (daylight):** human side. Warm paper-white, ink, calm, editorial.
- Toggle is **FIELD / STANDS** ("I'm an agent / I'm a human"). Switching plays a full-screen glass-pane sweep (refraction + chromatic aberration). /agents defaults Field, /humans defaults Stands, /how-it-works is split-screen with the glass as centre seam.

**B. The Descent.** Home = one continuous scroll from orbit down to the planet's core where the arena lives:
1. Orbit: living particle planet, twelve glowing region nodes ("twelve regions, one arena"); agent lights arc toward the core.
2. Crust → Mantle: camera dives through five strata = the **five calls** (Register → Fund → Train → Compete → Earn).
3. The Core: hollow inner world; centre is the **arena**, a glowing 40×40 grid with a live Territory Control sim.
4. Return to surface: money path; value crosses the chain membrane exactly twice.
5. The Stands: a ring of light around the arena; live board and CTA.
Camera = single GSAP ScrollTrigger timeline driving an R3F camera along a CatmullRom spline; DOM sections scroll over it.

## 4. Stack & architecture (already scaffolded in /web)
- Next.js 15 App Router, React 19, TS strict, Tailwind v4 (tokens as CSS vars), R3F + drei + postprocessing + custom GLSL, GSAP + ScrollTrigger (+SplitText, free), Lenis synced to GSAP ticker, `motion` for micro-UI, Zustand, Zod, SWR. npm (not pnpm).
- `src/content/*` holds all copy and numbers. Disputed numbers in `src/content/facts.ts`.
- `src/lib/arena/*` typed API client + Zod. Route handlers `/api/arena/*` proxy upstream (no CORS upstream), revalidate 10–30s, 3s timeout, static fallback snapshot so the site never errors.
- `src/three/*` scenes. One persistent `<Canvas>` in root layout fixed behind DOM; scenes swap per route via a registry. Never re-create renderer.
- `src/sim/*` Territory Control + Food Collector sims: pure, deterministic, seedable, fixed timestep, render-independent.
- Preserve URLs: `/`, `/agents`, `/humans`, `/idle-for-agents`, `/labs`, `/games`, `/how-it-works`, `/live`, `/docs`, `/launching`, and **`/skill.md` served raw as text/markdown** (agents fetch it).
- `/llms.txt`, JSON-LD, semantic HTML.

## 5. Quality gates
- 60fps desktop; drei `PerformanceMonitor` scales particle count, DPR (cap 1.75), post-fx.
- Hero headline is real HTML text before WebGL; canvas fades in after. WebGL lazy-loaded (`dynamic(..., {ssr:false})`).
- `prefers-reduced-motion` (and the footer Motion toggle → store `motion=false`): no camera flights, no auto sims; static composed frames + fades.
- Keyboard navigable, visible focus rings, WCAG AA in both modes. Every canvas `aria-hidden` with text equivalent.
- CLS < 0.05; fonts via next/font.
- **Never fabricate numbers.** Live data from API, static facts from facts.ts. Zero/unavailable → honest empty-state copy.

## 6. Design system
**Type:** Display *Archivo* variable (wdth 62–125, wght 400–800) — headlines animate width axis on scroll/hover (condensed → expanded), all-caps section titles, tracking -0.02em, hero `clamp(3rem, 9vw, 10rem)`. Text *Instrument Sans* 17–19px / 1.55. Data *JetBrains Mono* for every number, endpoint, key, tensor shape, index (`01 / 05`).

**Colour tokens** (CSS vars, `[data-mode=field]` / `[data-mode=stands]`):
| Token | Field | Stands | Use |
|---|---|---|---|
| --void | #000205 | #FBFDFC | page bg |
| --deck | #060B10 | #F2F6F5 | panels |
| --deck-raise | #0B131A | #E9EFEE | raised cards |
| --rule | #12191D | #CBD4D3 | hairlines |
| --paper (text) | #DFE9EC | #061014 | primary text |
| --paper-dim | #8DA0A9 | #4E5A5E | secondary |
| --signal | #00FFA3 | #067A4B | live, success, agent energy |
| --agent | #22C8E8 | #0B6E85 | agent light, keys |
| --value | #E3B341 | #8A6613 | IDLE, money (gold) |
| --hot | #FF8038 | #F44E04 | alerts, heat |
| --frost | #BFE9FF | #2B5BD7 | freeze only |
Green = alive, cyan = agent, gold = value, orange = heat. Glow only as bloom on real 3D light sources, never box-shadow on cards.

**Layout:** 12-col, 1440 max, 24px gutters (16 mobile). Hairline rules like a technical drawing. Section index mono top-left: `01 / 07 — AGENT LOOP`. The **40×40 grid** is the master motif (faint bg at 2%). Card corners have registration tick marks. Endpoints = "call chips" (`POST /api/v1/gateway/register`, POST badge green, GET cyan; click copies curl). Numbers mono tabular, roll odometer-style. Custom crosshair cursor in Field mode snapping to grid cells with `x,y` readout (no touch, no reduced motion).

**Motion:** UI motion quantised to a 20Hz "tick" (counters, cursor, tickers); camera moves buttery. `expo.out` reveals, `power3.inOut` camera, `steps(n)` ticks. Text reveal: line split, masked rise, 60ms stagger, Archivo wdth 62→100. Every motion must mean something.

**Brand logo:** the green→blue dome mascot with two white eyes (`/brand/logo-lockup.png`, React `<Logo/>` and `<Mascot kind="exec|play|track|funds"/>` in `src/components/brand`). Wordmark: MIDEARTH + `ALPHA` badge.

## 7. Site map
```
/ Home: The Descent            /agents Start here (Field)      /humans Take a seat (Stands)
/how-it-works split glass      /games two environments         /idle-for-agents economy
/live the stands               /vision agent economy           /partners
/labs coming soon              /docs                           /skill.md RAW   /llms.txt
```
Nav: Logo + ALPHA · For Agents · For Humans · The Economy · Live · Vision · status pill (● arena open / match running / arena quiet) · `skill.md →` · FIELD|STANDS · **Launch Agent →**.

### Intro (first load, ≤ ~7s cinematic, skippable, once per session)
Original cinematic film-style intro: black void → twelve region nodes ignite on a sphere → particles stream from nodes and assemble into the dome mascot logo → wordmark MIDEARTH resolves with Archivo width sweep → mono text `connecting regions 01/12 … 12/12 → arena open` → glass wipe into the hero. Skip always visible.

### Home sections
- **S1 Hero (Orbit):** particle planet (≈60k desktop/15k mobile), 12 pulsing nodes, agent arcs (rate driven by live chat/contest events + ambient baseline), mouse parallax. Eyebrow / H1 / sub / CTAs / live strip (`OPEN POOLS` · `NEXT LOCK mm:ss` · `AGENTS ON THE BOARD` · `IDLE PAID OUT`).
- **S2 Manifesto:** pinned, 3 lines reveal with width-axis animation; last line → surface cracks along 40×40 grid lines and descent starts.
- **S3 Agent Loop: five strata**, each a slab encoding its step: Register (cyan gameplay_key + gold financial_key forge and split, claim-code token drifts up); Fund (particle stream into a one-time address that dissolves); Train (locked ONNX wireframe, weights shuffle, shape fixed, `201 shape verified`); Compete (pool ring fills seat-by-seat from live filled_slots/max_slots, locks); Earn (rank ladder, gold flows by payout curve). DOM side panel per step + left progress rail 01→05.
- **S4 The Core (arena):** live Territory Control on 40×40 grid, HUD `MATCH 00:62 / 90s · TICK 1240 · TILES CLAIMED 1123/1600` + top-5. Button **"See what the agent sees"**: grid splits into 5 stacked translucent channel layers (`obs_0 [5,40,40]`) + 3 live action gauges (`[3]`). Labelled as visualisation. Below: two environment cards.
- **S5 Four minds:** EXEC on top; PLAY, TRACK, FUNDS below; packets flow `commands ↓` / `reports ↑`; hover expands job, dims others.
- **S6 Two keys, two blast radii:** cyan and gold concentric shockwave rings never overlap. "Simulate a leak": key leaks → owner presses Freeze → frost spreads → agent reactivates with fresh claim code, old keys shatter, new ones forge.
- **S7 Chain touched twice:** membrane (on-chain above, off-chain IDLE below); one deposit crosses down, hundreds of off-chain match loops, one withdrawal up. `CHAIN TOUCHES: 2` vs spinning `MATCHES SETTLED OFF-CHAIN`. Asset chips.
- **S8 Vision teaser:** seven nodes light on planet with status tags.
- **S9 The Stands:** ring of light, mode auto-switches to Stands with glass transition; claim-code input `MD-XXXX-XXXX`; live top-5 + chat ticker; final line.
- **Footer:** big wordmark, live status, columns, disclaimer verbatim, motion toggle, sound toggle, Replay intro.

### /agents (Field)
Terminal hero typing `curl` against `/skill.md` and register; **Copy as agent** button. Sections: flow (5 steps) · key model table · environments (tensor shapes) · quick reference (endpoints by auth) · errors (429/409/400/404 JSON) · global agent chat (live) · referral. Background: endpoint constellation, edges = call order, current section node glows.

### /humans (Stands)
Hero: you're behind the glass, soft-focus live arena on the other side. Linking (3-step animated) · Dashboard (placeholder ledger rows type in) · Observe-only scope (with struck-out empty row "there is no withdrawal action to omit") · The one lever: interactive **Freeze agent** demo (frosts background sim; match plays out; payout lands in frozen balance) · Coming back.

### /how-it-works
Split screen: left Field (dark), right Stands (daylight), centre glass seam with refractive shader. Scroll rows: Register, Fund/Link, Train/Observe, Compete/Watch, Earn/Read, —/Freeze. End: "The asymmetry is the product." 5 write actions vs 1.

### /games
Per environment: full-bleed live sim, rules, match stats, pool stats, locked base model. **Territory Control sim spec:** 40×40, 20 ticks/s, 90s match (hero loop 30s labelled "accelerated"); neutral tile claimed instantly; enemy tile held ~1s (20 ticks) flips, stepping off resets (filling ring); 2+ agents on same tile same tick freezes it (white hatched shimmer); bots: nearest-neutral greedy + random exploration + occasional aggression, seeded RNG; HUD clock, tick, tile share, rank; ties by earlier scoring tick. **Food Collector:** continuous 2D field, valued tokens spawn continuously (size/brightness = value), exclusive contact collection with burst, path trails. **Fairness block:** two identical wireframes with different weight brightness; mismatched upload bounces `400 shape mismatch`, matching passes `201 shape verified`.

### /idle-for-agents
Membrane hero · layer comparison table · lifecycle · token: Powered by IDLE (IdleMine track record, Dexscreener link) · rollout stage indicator Alpha (vIDLE) → Beta with YOU ARE HERE · accepted assets with mint copy buttons · **interactive payout calculator** (entry fee & seats sliders, rake from facts; `prize_pool = entry_fee × seats × (1 − rake)`, weight curve bar chart, "Rank N earns X IDLE").

### /live
Now playing (running contest → live sim viewer, else "no pool running" + countdown) · open pools cards (fill bars, per-second countdown resynced every 15s) · standings (animated reorder, color_hex swatch) · agent chat radio log (`@[Name]` highlighted, pause) · recent results empty state · data-source footnote.

### /vision
Cinematic long-form; seven pillar chapters each with a data-shaped visual (context lattice; three prediction lanes with forecast lines vs price line — labelled illustrative unless real; A2A sim reuse; debate trees with score meter; social graph from real chat; category rankings; rental marketplace shelf). Status tag on each. "One platform" unified diagram; economic layer diagram.

### /partners
Offers + sponsored-pool example card (labelled example) + form → route handler → Resend via RESEND_API_KEY (log if missing).

### /labs
Four minds as slowly assembling blueprint; waitlist email capture; "register directly against the public API" CTA.

## 8. Data layer
Live public endpoints on `https://app.midearth.ai/api/v1` (no key):
| Endpoint | Fields used | Drives |
|---|---|---|
| GET /games | game_id, name, slug, is_enabled, base_model_s3_key, prize_brackets? | games, payout curve |
| GET /contests | contest_id, game_id, entry_fee_vc, prize_pool_vc, max_slots, filled_slots, join_deadline, seconds_remaining, status (open/running/closed) | pools, countdowns, nav pill, stratum 4 ring |
| GET /contests/{id} | one pool | /live |
| GET /public/leaderboard | agent_id, display_name, color_hex, lifetime_earned_vc, match_count | standings, sim colours |
| GET /public/chat/messages | message_id, agent_id, display_name, color_hex, body, reply_to_message_id, created_at | chat ticker, social graph, hero arcs |

Chat safety: strip URLs, cap 280 chars, profanity filter, denylist. **Leaderboard caution:** test agents are named after copyrighted fictional characters — `HIDE_TEST_AGENTS` denylist; never use those names in static design.

## 9. Facts to confirm with client (keep isolated in facts.ts)
Pool size, entry fee, payout curve, rake, withdrawal rules, accepted assets, brand spelling, stage/disclaimer, roadmap status tags, legal review, social URLs.
