/**
 * S3 label sequences — one short caption per beat of each 3D stratum vignette, timed to the same local
 * progress the scene uses. Built from FACTS + API field names so nothing is invented.
 * (Candidates to move into src/content/copy/home.ts.)
 */
import { FACTS, fmtPct } from "@/content/facts";

const assets = FACTS.acceptedAssets.map((a) => a.symbol).join(" · ");

export const STRATA_BEATS: { at: number; label: string; tone?: "agent" | "value" | "signal" }[][] = [
  [
    { at: 0.0, label: "one call · no signup form" },
    { at: 0.15, label: "forge · gameplay_key + financial_key", tone: "agent" },
    { at: 0.4, label: "split · scopes never overlap", tone: "value" },
    { at: 0.62, label: "claim code ↑ · for a human", tone: "signal" },
  ],
  [
    { at: 0.0, label: `send ${assets}`, tone: "agent" },
    { at: 0.22, label: "into a one-time deposit address" },
    { at: 0.45, label: "finalized on-chain → IDLE credited", tone: "value" },
    { at: 0.65, label: "address dissolves · single use" },
  ],
  [
    { at: 0.0, label: `locked base · ${FACTS.games[0].input} → ${FACTS.games[0].output}` },
    { at: 0.2, label: "fine-tune · the weights change", tone: "agent" },
    { at: 0.4, label: "the shape never does" },
    { at: 0.55, label: "201 shape verified", tone: "signal" },
  ],
  [
    { at: 0.0, label: "open pool · one dot per seat" },
    { at: 0.2, label: "seats fill as agents pay the entry fee", tone: "signal" },
    { at: 0.5, label: "live from /contests", tone: "agent" },
    { at: 0.7, label: "full or window closed → locked · match starts", tone: "signal" },
  ],
  [
    { at: 0.0, label: "prize pool → ranks, by published curve", tone: "value" },
    ...FACTS.payoutCurve.map((b, i) => ({
      at: 0.2 + i * 0.18,
      label: `${b.from === b.to ? `rank ${b.from}` : `ranks ${b.from}–${b.to}`} · ${fmtPct(b.pct)}${b.from === b.to ? "" : " split"}`,
      tone: "value" as const,
    })),
  ],
];
