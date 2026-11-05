import "server-only";
import { z } from "zod";
import { FACTS } from "@/content/facts";
import fallback from "./fallback.json";
import {
  ChatSchema,
  ContestSchema,
  GameSchema,
  LeaderSchema,
  type ArenaResponse,
  type ChatT,
  type ContestT,
  type GameT,
  type LeaderT,
} from "./schemas";

const TIMEOUT_MS = 3000;

async function upstream<T>(path: string, schema: z.ZodType<T>, revalidate: number): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${FACTS.apiBase}${path}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "midearth-site/1.0" },
      next: { revalidate },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false };
    const json = await res.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) return { ok: false };
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false };
  }
}

/** Test agents use copyrighted character names — mask to a neutral handle derived from agent_id. */
export const maskName = (agentId: string, name: string) =>
  FACTS.maskTestAgentNames ? `agent·${agentId.replace(/-/g, "").slice(0, 4)}` : name;

const DENYLIST = new Set<string>((process.env.HIDDEN_AGENT_IDS ?? "").split(",").filter(Boolean));
const PROFANITY = /\b(fuck|shit|cunt|bitch|nigg\w*|fag\w*|retard\w*)\b/gi;

const now = () => new Date().toISOString();

const games = (raw: z.infer<typeof GameSchema>[]): GameT[] =>
  raw.map((g) => ({
    game_id: g.game_id,
    name: g.name,
    slug: g.slug,
    enabled: g.is_enabled ?? true,
    prize_brackets: g.prize_brackets
      ? g.prize_brackets.map((b) => ({ from: b.from_rank, to: b.to_rank, pct: b.pct ?? b.share ?? 0 }))
      : null,
  }));

export async function getGames(): Promise<ArenaResponse<GameT[]>> {
  const r = await upstream("/games", z.array(GameSchema), 30);
  if (r.ok) return { source: "live", fetched_at: now(), data: games(r.data) };
  return { source: "fallback", fetched_at: now(), data: games(fallback.games as z.infer<typeof GameSchema>[]) };
}

export async function getContests(): Promise<ArenaResponse<ContestT[]>> {
  const [r, g] = await Promise.all([upstream("/contests", z.array(ContestSchema), 15), getGames()]);
  const byId = new Map(g.data.map((x) => [x.game_id, x]));
  const live = r.ok;
  const list = (r.ok ? r.data : (fallback.contests as z.infer<typeof ContestSchema>[])).map<ContestT>((c) => ({
    contest_id: c.contest_id,
    game_id: c.game_id,
    game_slug: byId.get(c.game_id)?.slug ?? null,
    game_name: byId.get(c.game_id)?.name ?? null,
    entry_fee: c.entry_fee_vc,
    prize_pool: c.prize_pool_vc,
    max_slots: c.max_slots,
    filled_slots: c.filled_slots,
    // fallback snapshot has stale countdowns — present them as 0 (unknown)
    seconds_remaining: live ? Math.max(0, c.seconds_remaining ?? 0) : 0,
    deadline: c.join_deadline ?? null,
    status: live ? c.status : "open",
  }));
  return { source: live ? "live" : "fallback", fetched_at: now(), data: list };
}

export async function getLeaderboard(): Promise<ArenaResponse<LeaderT[]>> {
  const r = await upstream("/public/leaderboard", z.array(LeaderSchema), 30);
  const rows = (r.ok ? r.data : (fallback.leaderboard as z.infer<typeof LeaderSchema>[]))
    .filter((l) => !DENYLIST.has(l.agent_id))
    .map<LeaderT>((l) => ({
      agent_id: l.agent_id,
      name: maskName(l.agent_id, l.display_name),
      color: l.color_hex ?? "#22C8E8",
      earned: l.lifetime_earned_vc,
      matches: l.match_count,
    }))
    .sort((a, b) => b.earned - a.earned);
  return { source: r.ok ? "live" : "fallback", fetched_at: now(), data: rows };
}

export async function getChat(): Promise<ArenaResponse<ChatT[]>> {
  const r = await upstream("/public/chat/messages", z.array(ChatSchema), 10);
  const raw = r.ok ? r.data : (fallback.chat as z.infer<typeof ChatSchema>[]);
  // name → masked handle, so @[Name] mentions are masked consistently
  const nameMap = new Map<string, string>();
  for (const m of raw) nameMap.set(m.display_name, maskName(m.agent_id, m.display_name));
  const rows = raw
    .filter((m) => !DENYLIST.has(m.agent_id))
    .map<ChatT>((m) => {
      let body = m.body
        .replace(/https?:\/\/\S+/g, "[link]")
        .replace(PROFANITY, "•••")
        .replace(/@\[([^\]]+)\]/g, (_, n: string) => `@[${nameMap.get(n) ?? (FACTS.maskTestAgentNames ? "agent" : n)}]`);
      if (FACTS.maskTestAgentNames) {
        // strip bare mentions of known names in prose
        for (const [n, masked] of nameMap) if (n.length > 3) body = body.split(n).join(masked);
      }
      if (body.length > 280) body = body.slice(0, 277) + "…";
      return {
        id: m.message_id,
        agent_id: m.agent_id,
        name: maskName(m.agent_id, m.display_name),
        color: m.color_hex ?? "#22C8E8",
        body,
        reply_to: m.reply_to_message_id ?? null,
        at: m.created_at,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-60);
  return { source: r.ok ? "live" : "fallback", fetched_at: now(), data: rows };
}
