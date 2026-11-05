/**
 * UI chrome labels for /games that are not in content/copy/games.ts.
 * TODO(lead): fold into GAMES copy (content/copy/games.ts) — kept here only because that file is not owned by the games specialist.
 */
export const GAMES_UI = {
  sectionFairness: "FAIRNESS",
  rules: "Rules",
  match: "Match",
  pool: "Pools",
  model: "Locked base model",
  input: "input",
  output: "output",
  format: "format",
  speed1: "×1 real time",
  speed3: "×3 accelerated",
  pause: "Pause",
  play: "Play",
  liveOpen: "open pools now",
  liveFees: "entry fee",
  liveSeats: "seats",
  liveFilled: "filled",
  liveNone: "No open pool for this environment right now. Pools open on a recurring schedule.",
  liveSource: "live from GET /contests",
  staticSource: "published pool terms",
  simNote: "Simulated bots, seeded and deterministic. A visualisation of the rules, not a live match.",
  netA: "agent A · weights θa",
  netB: "agent B · weights θb",
  sameShape: "same shape · different weights",
  gate: "base architecture",
  laneBad: "mismatched upload",
  laneGood: "fine-tuned upload",
} as const;
