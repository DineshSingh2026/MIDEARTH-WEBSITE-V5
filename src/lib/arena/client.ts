"use client";
import useSWR from "swr";
import { create } from "zustand";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ArenaResponse, ChatT, ContestT, GameT, LeaderT } from "./schemas";

const fetcher = async <T,>(url: string): Promise<ArenaResponse<T>> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/* ───────────── Event bus (WebGL hero subscribes for arc spawns) ───────────── */
type ArenaEvent = { type: "chat"; msg: ChatT } | { type: "slot"; contest: ContestT; delta: number };
type Listener = (e: ArenaEvent) => void;
const listeners = new Set<Listener>();
export const arenaEvents = {
  on(fn: Listener) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  emit(e: ArenaEvent) {
    listeners.forEach((l) => l(e));
  },
};

/* ───────────── Store: derived values everyone reads ───────────── */
type ArenaStore = {
  games: GameT[];
  contests: ContestT[];
  leaders: LeaderT[];
  chat: ChatT[];
  sources: Record<string, "live" | "fallback" | "pending">;
  /** client receipt time of the contests payload, used to interpolate countdowns */
  contestsAt: number;
};
export const useArenaStore = create<ArenaStore>(() => ({
  games: [],
  contests: [],
  leaders: [],
  chat: [],
  sources: { games: "pending", contests: "pending", leaderboard: "pending", chat: "pending" },
  contestsAt: 0,
}));

/** Mount once (in Providers). Polls every endpoint and pushes into the store + event bus. */
export function useArenaFeed() {
  const opts = { refreshInterval: 15000, revalidateOnFocus: false, dedupingInterval: 5000 };
  const g = useSWR<ArenaResponse<GameT[]>>("/api/arena/games", fetcher, { ...opts, refreshInterval: 60000 });
  const c = useSWR<ArenaResponse<ContestT[]>>("/api/arena/contests", fetcher, opts);
  const l = useSWR<ArenaResponse<LeaderT[]>>("/api/arena/leaderboard", fetcher, { ...opts, refreshInterval: 30000 });
  const ch = useSWR<ArenaResponse<ChatT[]>>("/api/arena/chat", fetcher, { ...opts, refreshInterval: 10000 });
  const seenChat = useRef<Set<string> | null>(null);
  const prevSlots = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (g.data) useArenaStore.setState((s) => ({ games: g.data!.data, sources: { ...s.sources, games: g.data!.source } }));
  }, [g.data]);
  useEffect(() => {
    if (!c.data) return;
    for (const ct of c.data.data) {
      const prev = prevSlots.current.get(ct.contest_id);
      if (prev !== undefined && ct.filled_slots > prev) arenaEvents.emit({ type: "slot", contest: ct, delta: ct.filled_slots - prev });
      prevSlots.current.set(ct.contest_id, ct.filled_slots);
    }
    useArenaStore.setState((s) => ({ contests: c.data!.data, contestsAt: Date.now(), sources: { ...s.sources, contests: c.data!.source } }));
  }, [c.data]);
  useEffect(() => {
    if (l.data) useArenaStore.setState((s) => ({ leaders: l.data!.data, sources: { ...s.sources, leaderboard: l.data!.source } }));
  }, [l.data]);
  useEffect(() => {
    if (!ch.data) return;
    if (seenChat.current) {
      for (const m of ch.data.data) if (!seenChat.current.has(m.id)) arenaEvents.emit({ type: "chat", msg: m });
    } else seenChat.current = new Set();
    ch.data.data.forEach((m) => seenChat.current!.add(m.id));
    useArenaStore.setState((s) => ({ chat: ch.data!.data, sources: { ...s.sources, chat: ch.data!.source } }));
  }, [ch.data]);
}

/** 1Hz clock (quantised UI tick for countdowns). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Live countdown seconds for a contest, interpolated locally between polls. */
export function useCountdown(contest: ContestT | null | undefined) {
  const at = useArenaStore((s) => s.contestsAt);
  const now = useNow();
  if (!contest || !contest.seconds_remaining) return 0;
  return Math.max(0, Math.round(contest.seconds_remaining - (now - at) / 1000));
}

export const fmtClock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Derived values used by nav pill, hero strip, etc. */
export function useArenaDerived() {
  const contests = useArenaStore((s) => s.contests);
  const leaders = useArenaStore((s) => s.leaders);
  const sources = useArenaStore((s) => s.sources);
  const at = useArenaStore((s) => s.contestsAt);
  const now = useNow();
  return useMemo(() => {
    const open = contests.filter((c) => c.status === "open");
    const anyRunning = contests.some((c) => c.status === "running");
    const secs = open.map((c) => Math.max(0, Math.round(c.seconds_remaining - (now - at) / 1000))).filter((s) => s > 0);
    const nextLockSec = secs.length ? Math.min(...secs) : 0;
    const idlePaidOut = leaders.reduce((a, l) => a + l.earned, 0);
    const down = sources.contests === "fallback";
    const status: "open" | "running" | "quiet" = down ? "quiet" : anyRunning ? "running" : open.length ? "open" : "quiet";
    const featured = [...open].sort((a, b) => b.filled_slots / b.max_slots - a.filled_slots / a.max_slots)[0] ?? null;
    return {
      openPools: open.length,
      nextLockSec,
      anyRunning,
      boardCount: leaders.length,
      idlePaidOut,
      status,
      featured,
      live: sources.contests === "live",
    };
  }, [contests, leaders, sources, at, now]);
}
