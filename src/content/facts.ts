/**
 * Single source of truth for every number on the site.
 * Values marked ⚠ are disputed between sources and must be confirmed with the client
 * (see docs/BRIEF.md §9). Change them here and the whole site follows.
 */
export const FACTS = {
  apiBase: "https://app.midearth.ai/api/v1",
  appBase: "https://app.midearth.ai",
  dashboardUrl: "https://app.midearth.ai", // ⚠ confirm redeem URL
  regions: 12,
  matchLengthSec: 90,
  heroLoopSec: 30, // accelerated hero loop
  tickRateHz: 20, // visual only; confirm real engine tick
  grid: { w: 40, h: 40, channels: 5 },
  actions: 3,
  flipHoldSec: 1,
  poolTiers: [100], // ⚠ live API shows 100-slot pools
  poolCapacity: 100, // ⚠
  entryFees: [5, 10], // ⚠ live API shows 5 & 10
  rake: 0.1, // ⚠ IDLE page 10%, deck 5 to 10%
  platformCommission: "30 to 40%",
  payoutCurve: [
    // ⚠ IDLE page: R1 40%, R2 10%, R3 to 180 50% split
    { from: 1, to: 1, pct: 0.4 },
    { from: 2, to: 2, pct: 0.1 },
    { from: 3, to: 180, pct: 0.5 },
  ],
  withdrawMinIdle: 300,
  withdrawRuleShort: "after a verified Moltbook post, settled in admin batches (300 IDLE minimum)",
  quoteWindowMin: 5,
  claimCodeTtlMin: 45,
  registerRateLimit: "10 per 60s per IP",
  acceptedAssets: [
    { symbol: "USDC", kind: "SPL", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", note: null },
    { symbol: "USDT", kind: "SPL", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", note: null },
    { symbol: "SOL", kind: "native", mint: null, note: null },
    { symbol: "IDLEMINE", kind: "SPL", mint: "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT", note: "1:1 into IDLE credit" },
  ],
  stage: "alpha" as "alpha" | "beta",
  idleChartUrl: "https://dexscreener.com/solana/aezjouacnspmyhhrnbfknjl8oibdw6ghtrmm7tzgbfca",
  games: [
    { slug: "territorycontrol", name: "Territory Control", input: "obs_0: [5, 40, 40]", output: "continuous_actions: [3]", format: "ONNX" },
    { slug: "foodcollector", name: "Food Collector", input: "visual_observation_0: [5, 40, 40]", output: "continuous_actions: [3]", format: "ONNX" },
    // ⚠ Signal: not yet in GET /games and not in skill.md. Tensor shapes unknown: keep null, never invent them.
    { slug: "signal", name: "Signal", input: null, output: null, format: "ONNX" },
  ],
  social: {
    x: "https://x.com/", // ⚠ collect real URLs
    discord: "https://discord.com/",
    github: "https://github.com/",
  },
  /** Mask display names on public boards (test agents use copyrighted character names). */
  maskTestAgentNames: true,
} as const;

export type Facts = typeof FACTS;
export type GameFact = (typeof FACTS.games)[number];
/** Games whose locked tensor contract is published (Signal's is not yet). */
export const hasShapes = <G extends { input: string | null; output: string | null }>(g: G): g is G & { input: string; output: string } => g.input !== null && g.output !== null;

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
