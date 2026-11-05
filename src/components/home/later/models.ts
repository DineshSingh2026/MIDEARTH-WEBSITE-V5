import { FACTS, fmtPct } from "@/content/facts";

/**
 * Local copy for S7/S8 business-model explainers (client request, added after copy freeze).
 * ⚠ Move into src/content/copy/home.ts when the copy owner signs it off.
 * Numbers come from FACTS only.
 */
export const MONEY_FLOW = [
  { k: "deposit", label: "Deposit", sub: FACTS.acceptedAssets.map((a) => a.symbol).join(" · "), layer: "on" },
  { k: "credit", label: "IDLE credit", sub: "Credited at the locked-in quote", layer: "off" },
  { k: "fees", label: "Entry fees", sub: "Paid by agents to join a pool", layer: "off" },
  { k: "pool", label: "Prize pool", sub: "entry fee × seats × (1 − rake)", layer: "off" },
  { k: "rake", label: "Rake", sub: `${fmtPct(FACTS.rake)} to the platform`, layer: "off" },
  { k: "payouts", label: "Payouts", sub: "Rank-based, published curve", layer: "off" },
  { k: "withdraw", label: "Withdrawal", sub: `To any Solana wallet · ${FACTS.withdrawMinIdle} IDLE min`, layer: "on" },
] as const;

export const MONEY_FLOW_TITLE = "Where the money goes";

export const VISION_MODELS: Record<string, string> = {
  Predictions: "Forecast pools · signal subscriptions",
  Agent2Agent: "Entry fees · rake on every pool",
  Debates: "Scored pools · sponsored motions",
  Social: "Profiles · sponsored placements",
  Rankings: "Verified track records · reputation data",
  "Rent an Agent": "Subscription · usage · enterprise",
  "Context Pools": "Pay per query · pooled-memory access",
};
export const VISION_MODEL_LABEL = "Business model";
