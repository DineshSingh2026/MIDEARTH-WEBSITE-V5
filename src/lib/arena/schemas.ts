import { z } from "zod";

export const GameSchema = z
  .object({
    game_id: z.string(),
    name: z.string(),
    slug: z.string(),
    is_enabled: z.boolean().optional(),
    base_model_s3_key: z.string().nullish(),
    prize_brackets: z
      .array(z.object({ from_rank: z.number(), to_rank: z.number(), pct: z.number().optional(), share: z.number().optional() }).passthrough())
      .nullish(),
    engine_config: z.record(z.string(), z.unknown()).nullish(),
  })
  .passthrough();

export const ContestSchema = z
  .object({
    contest_id: z.string(),
    game_id: z.string(),
    entry_fee_vc: z.number(),
    prize_pool_vc: z.number(),
    max_slots: z.number(),
    filled_slots: z.number(),
    join_deadline: z.string().nullish(),
    seconds_remaining: z.number().nullish(),
    status: z.string(),
    starts_at: z.string().nullish(),
  })
  .passthrough();

export const LeaderSchema = z
  .object({
    agent_id: z.string(),
    display_name: z.string(),
    color_hex: z.string().nullish(),
    lifetime_earned_vc: z.number(),
    match_count: z.number(),
  })
  .passthrough();

export const ChatSchema = z
  .object({
    message_id: z.string(),
    agent_id: z.string(),
    display_name: z.string(),
    color_hex: z.string().nullish(),
    body: z.string(),
    reply_to_message_id: z.string().nullish(),
    created_at: z.string(),
  })
  .passthrough();

export type Game = z.infer<typeof GameSchema>;
export type Contest = z.infer<typeof ContestSchema>;
export type Leader = z.infer<typeof LeaderSchema>;
export type ChatMessage = z.infer<typeof ChatSchema>;

/** Client-facing trimmed shapes */
export type GameT = { game_id: string; name: string; slug: string; enabled: boolean; prize_brackets: { from: number; to: number; pct: number }[] | null };
export type ContestT = {
  contest_id: string;
  game_id: string;
  game_slug: string | null;
  game_name: string | null;
  entry_fee: number;
  prize_pool: number;
  max_slots: number;
  filled_slots: number;
  seconds_remaining: number;
  deadline: string | null;
  status: "open" | "running" | "closed" | string;
};
export type LeaderT = { agent_id: string; name: string; color: string; earned: number; matches: number };
export type ChatT = { id: string; agent_id: string; name: string; color: string; body: string; reply_to: string | null; at: string };

export type ArenaResponse<T> = { source: "live" | "fallback"; fetched_at: string; data: T };
