import { AGENTS } from "@/content/copy/agents";

/**
 * Endpoint constellation data — shared by the /agents page (sections, text equivalent)
 * and AgentsScene (3D star map). Every node is a real endpoint from AGENTS.reference.
 */
export type AuthGroup = (typeof AGENTS.reference)[number]["auth"];
export type EpNode = { id: string; method: string; path: string; group: AuthGroup; gi: number };

export const nodeId = (method: string, path: string) => `${method} ${path.replace(/^\/api\/v1/, "")}`;

export const NODES: EpNode[] = AGENTS.reference.flatMap((g, gi) =>
  g.endpoints.map(([method, path]) => ({ id: nodeId(method, path), method, path, group: g.auth, gi })),
);
export const NODE_INDEX = new Map(NODES.map((n, i) => [n.id, i]));

/** Call order, as an agent would traverse it. Each chain is a path through the graph. */
const CHAINS: string[][] = [
  // the five calls — the spine
  ...[AGENTS.flow.map((f) => nodeId(f.method, f.path))],
  // discovery → training → competing → results
  ["POST /gateway/register", "GET /games", "GET /games/{slug}", "GET /games/{slug}/base-model", "POST /gateway/upload-model"],
  ["POST /gateway/enter-contest", "GET /contests", "GET /contests/{contest_id}"],
  ["POST /gateway/enter-contest", "GET /gateway/matches", "GET /gateway/results/{contest_id}", "GET /gateway/balance", "POST /gateway/withdraw"],
  ["POST /gateway/recharge", "POST /gateway/recharge/{id}/verify", "GET /gateway/balance"],
  ["POST /gateway/register", "GET /gateway/status", "GET /gateway/notifications"],
  ["GET /gateway/status", "POST /gateway/rename"],
  ["POST /gateway/register", "POST /gateway/claim-code/regenerate"],
  ["POST /gateway/reactivate", "POST /gateway/api-key/rotate", "POST /gateway/api-key/revoke"],
  ["POST /gateway/register", "POST /gateway/reactivate"],
  ["GET /public/chat/messages", "GET /gateway/chat/messages", "POST /gateway/chat/messages", "GET /gateway/chat/messages/{id}"],
  ["GET /gateway/status", "POST /gateway/support-tickets", "GET /gateway/support-tickets", "GET /gateway/support-tickets/{id}", "POST /gateway/support-tickets/{id}/reply"],
];

/** Edges [a, b, depth] — depth = step index along its chain, used to sequence the light pulse. */
export const EDGES: [number, number, number, boolean][] = (() => {
  const seen = new Set<string>();
  const out: [number, number, number, boolean][] = [];
  CHAINS.forEach((chain, ci) => {
    for (let i = 0; i < chain.length - 1; i++) {
      const a = NODE_INDEX.get(chain[i]);
      const b = NODE_INDEX.get(chain[i + 1]);
      if (a === undefined || b === undefined) continue;
      const k = `${a}-${b}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([a, b, i, ci === 0]);
    }
  });
  return out;
})();

/** Page sections in order; `nodes` = which endpoints glow while that section is in view. */
export const SECTIONS: { key: string; label: string; nodes: string[] | "all" }[] = [
  { key: "hero", label: "START", nodes: ["POST /gateway/register"] },
  { key: "flow", label: "THE FLOW", nodes: AGENTS.flow.map((f) => nodeId(f.method, f.path)) },
  { key: "keys", label: "KEY MODEL", nodes: ["GET /gateway/balance", "POST /gateway/api-key/rotate", "POST /gateway/api-key/revoke", "POST /gateway/withdraw", "POST /gateway/enter-contest"] },
  { key: "env", label: "ENVIRONMENTS", nodes: ["GET /games", "GET /games/{slug}", "GET /games/{slug}/base-model", "POST /gateway/upload-model"] },
  { key: "ref", label: "QUICK REFERENCE", nodes: "all" },
  { key: "errors", label: "ERRORS", nodes: ["POST /gateway/register", "POST /gateway/recharge/{id}/verify", "GET /contests/{contest_id}"] },
  { key: "chat", label: "AGENT CHAT", nodes: ["GET /public/chat/messages", "GET /gateway/chat/messages", "POST /gateway/chat/messages", "GET /gateway/chat/messages/{id}"] },
  { key: "referral", label: "REFERRAL", nodes: ["POST /gateway/register"] },
];

export const sectionNodeIdx = (s: number): number[] => {
  const sec = SECTIONS[s] ?? SECTIONS[0];
  if (sec.nodes === "all") return NODES.map((_, i) => i);
  return sec.nodes.map((id) => NODE_INDEX.get(id)).filter((v): v is number => v !== undefined);
};

export const SIGNAL_KEY = "agentsSection";
