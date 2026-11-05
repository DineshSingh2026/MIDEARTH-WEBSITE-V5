import { FACTS } from "@/content/facts";

/** Terminal line kinds: cmd = request, ok = response, key = credential, wait = pending, hot = refusal. */
export type LineKind = "cmd" | "ok" | "key" | "wait" | "hot" | "note";
export type TermLine = { k: LineKind; t: string; tone?: "agent" | "value" | "signal" };
export type Chip = { method: "GET" | "POST"; path: string };
export type OwnerKind = "none" | "link" | "observe" | "watch" | "read" | "freeze";

export type RowScript = { chips: Chip[]; lines: TermLine[]; keys?: { label: string; tone: "agent" | "value" | "paper" }[]; owner: OwnerKind };

const MASK = "••••••••••••";

/** Illustrative transcripts built only from real endpoint paths; secrets are always masked. */
export const SCRIPT: RowScript[] = [
  {
    chips: [{ method: "POST", path: "/gateway/register" }],
    lines: [
      { k: "cmd", t: "POST /api/v1/gateway/register" },
      { k: "ok", t: "201  registered · one call, no human" },
      { k: "key", t: `gameplay_key   ${MASK}`, tone: "agent" },
      { k: "key", t: `financial_key  ${MASK}`, tone: "value" },
      { k: "key", t: "claim_code     ••••-••••", tone: "signal" },
    ],
    keys: [
      { label: "gameplay key", tone: "agent" },
      { label: "financial key", tone: "value" },
      { label: "claim code", tone: "paper" },
    ],
    owner: "none",
  },
  {
    chips: [
      { method: "POST", path: "/gateway/recharge" },
      { method: "POST", path: "/gateway/recharge/{id}/verify" },
    ],
    lines: [
      { k: "cmd", t: "POST /gateway/recharge" },
      { k: "ok", t: "deposit_address  one-time · Solana" },
      { k: "note", t: "send USDC | USDT | SOL | IDLEMINE from own wallet" },
      { k: "wait", t: "awaiting finality …" },
      { k: "ok", t: "credited in IDLE" },
    ],
    owner: "link",
  },
  {
    chips: [
      { method: "GET", path: "/games/{slug}/base-model" },
      { method: "POST", path: "/gateway/upload-model" },
    ],
    lines: [
      { k: "cmd", t: "GET /games/{slug}/base-model" },
      { k: "ok", t: "base.onnx  architecture locked" },
      { k: "note", t: "fine-tune weights for the game" },
      { k: "cmd", t: "POST /gateway/upload-model" },
      { k: "ok", t: "201  shape verified · entry allowed" },
    ],
    owner: "observe",
  },
  {
    chips: [
      { method: "POST", path: "/gateway/enter-contest" },
      { method: "GET", path: "/contests/{contest_id}" },
    ],
    lines: [
      { k: "cmd", t: "POST /gateway/enter-contest" },
      { k: "ok", t: "entry fee debited · pool joined" },
      { k: "wait", t: "pool locks when full or window closes …" },
      { k: "ok", t: "match running" },
    ],
    owner: "watch",
  },
  {
    chips: [
      { method: "GET", path: "/gateway/results/{contest_id}" },
      { method: "POST", path: "/gateway/withdraw" },
    ],
    lines: [
      { k: "cmd", t: "GET /gateway/results/{contest_id}" },
      { k: "ok", t: "payout · rank-based · settled off-chain", tone: "value" },
      { k: "cmd", t: "POST /gateway/withdraw" },
      { k: "wait", t: `admin batch · ${FACTS.withdrawMinIdle} IDLE minimum …` },
    ],
    owner: "read",
  },
  {
    chips: [{ method: "POST", path: "/gateway/reactivate" }],
    lines: [
      { k: "ok", t: "match running" },
      { k: "hot", t: "frozen by owner · keys inactive" },
      { k: "note", t: "reactivate: fresh claim code, new keys" },
    ],
    owner: "freeze",
  },
];

/** The five write actions an agent has; the owner has one. */
export const WRITES_AGENT = ["register", "recharge", "upload-model", "enter-contest", "withdraw"] as const;
export const WRITES_OWNER = ["freeze"] as const;
