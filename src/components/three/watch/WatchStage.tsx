"use client";
/**
 * WatchStage: the safe host for the live "agents watching" 3D scene.
 *
 *  - Poster (arena.jpg) is always rendered first; the WebGL chunk is lazy (next/dynamic, ssr:false) and only
 *    requested once the stage is near the viewport, has a real size (>= 8px) and the device qualifies.
 *  - No WebGL / save-data / tiny device / reduced motion → poster only. Context loss or sustained low fps →
 *    the canvas unmounts and the poster stays.
 *  - frameloop runs only while on screen, the tab is visible and motion is on (else "never").
 *  - Live data (leaderboard colours + masked names, next lock, seats, chat) is bridged into a plain mutable
 *    feed object so the canvas never re-renders for data.
 */
import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { arenaEvents, fmtClock, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { createFeed, hashKey, type LiveFeed } from "./director";
import { DEFAULT_PALETTE, readPalette, type WatchPalette } from "./palette";
import type { Framing } from "./WatchCanvas";

const WatchCanvas = dynamic(() => import("./WatchCanvas"), { ssr: false, loading: () => null });

function webglOK() {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return false;
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 2) return false;
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** live data → feed (separate component so the 1 Hz countdown re-render stays out of the stage) */
function FeedBridge({ feed }: { feed: LiveFeed }) {
  const d = useArenaDerived();
  const leaders = useArenaStore((s) => s.leaders);
  const chat = useArenaStore((s) => s.chat);
  const sources = useArenaStore((s) => s.sources);
  const pending = sources.contests === "pending";
  const snapshot = sources.contests === "fallback";
  const ft = d.featured;
  const lock = pending ? "CONNECTING" : d.nextLockSec ? `NEXT LOCK ${fmtClock(d.nextLockSec)}` : d.anyRunning ? "MATCH RUNNING" : "NO OPEN POOL";
  const seats = ft ? `${ft.filled_slots}/${ft.max_slots}` : "";
  const fill = ft && ft.max_slots ? ft.filled_slots / ft.max_slots : 0;

  useEffect(() => {
    feed.lockText = lock;
    feed.seatText = seats;
    feed.seatFill = fill;
    feed.status = pending ? "pending" : snapshot ? "snapshot" : "live";
    feed.version++;
  }, [feed, lock, seats, fill, pending, snapshot]);

  useEffect(() => {
    const top = leaders.slice(0, 10);
    feed.colors = top.map((l) => l.color).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    feed.names = top.map((l) => l.name);
    feed.version++;
  }, [feed, leaders]);

  useEffect(() => {
    feed.recent = chat.slice(0, 12).map((m) => ({ key: hashKey(m.agent_id), color: m.color || "#38c6e4" }));
  }, [feed, chat]);

  useEffect(
    () =>
      arenaEvents.on((e) => {
        if (e.type !== "chat") return;
        if (feed.chats.length < 4) feed.chats.push({ key: hashKey(e.msg.agent_id), color: e.msg.color || "#38c6e4" });
      }),
    [feed],
  );
  return null;
}

type Props = {
  className?: string;
  /** composition pushed right on wide canvases (for overlaid text on the left) */
  shift?: number;
  /** wider/closer framing presets */
  framing?: Partial<Framing>;
  /** poster priority (LCP) when the stage is in the first viewport */
  priority?: boolean;
  label?: string;
};

function WatchStage({ className = "", shift = 0, framing, priority = false, label = "Live arena: MidEarth agents watching a Territory Control match" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const feed = useMemo(createFeed, []);
  const pointer = useRef({ x: 0, y: 0 });
  const motion = useUI((s) => s.motion);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabShown, setTabShown] = useState(true);
  const [capable, setCapable] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [palette, setPalette] = useState<WatchPalette>(DEFAULT_PALETTE);
  const [forcedTier, setForcedTier] = useState<number | null>(null);

  useEffect(() => {
    setCapable(webglOK());
    try {
      const q = new URLSearchParams(location.search).get("wq");
      if (q !== null && /^[0-2]$/.test(q)) setForcedTier(Number(q));
    } catch {}
  }, []);

  // size (guard zero-size), visibility, tab state, pointer, theme
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      const h = Math.floor(e.contentRect.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    const ioNear = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px 0px" });
    ioNear.observe(el);
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "0px" });
    io.observe(el);
    const vis = () => setTabShown(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      pointer.current.x = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width) * 2 - 1));
      pointer.current.y = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height) * 2 - 1));
    };
    window.addEventListener("pointermove", move, { passive: true });
    const readTheme = () => setPalette((p) => {
      const n = readPalette(el);
      return n.key === p.key ? p : n;
    });
    readTheme();
    const mo = new MutationObserver(readTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
    return () => {
      ro.disconnect();
      ioNear.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const sized = size.w >= 8 && size.h >= 8;
  const compact = size.w > 0 && size.w < 700;
  const mount = capable === true && !failed && near && sized && motion;
  const active = mount && onScreen && tabShown;
  const fr: Framing = useMemo(
    () => ({
      shift: size.w >= 1024 && size.w / Math.max(1, size.h) > 1.25 ? shift : 0,
      dist: framing?.dist ?? (compact ? 1.05 : 0.86),
      lookY: framing?.lookY ?? (compact ? 1.6 : 1.62),
      camY: framing?.camY ?? (compact ? 3.5 : 3.0),
    }),
    [size.w, shift, compact, framing?.dist, framing?.lookY, framing?.camY],
  );

  return (
    <div ref={ref} data-mode="field" className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative "}overflow-hidden bg-[var(--void)] ${className}`} role="img" aria-label={label}>
      <Image
        src="/images/arena.jpg"
        alt=""
        aria-hidden
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover transition-opacity duration-1000"
        style={{ opacity: ready && mount ? 0 : 1, objectPosition: "50% 50%" }}
      />
      {mount && (
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 1 : 0 }}>
          <WatchCanvas
            feed={feed}
            palette={palette}
            active={active}
            compact={compact}
            framing={fr}
            pointer={pointer}
            forcedTier={forcedTier}
            onReady={() => setReady(true)}
            onFallback={() => setFailed(true)}
          />
        </div>
      )}
      <FeedBridge feed={feed} />
      <p className="sr-only">
        A live 3D scene: MidEarth dome agents seated around a holographic arena, watching a Territory Control match on a 40 by 40 grid. The match is a visual reproduction of the published
        rules; agent colours and masked names come from the live leaderboard, and the screen shows the next pool lock and seats filled from the live feed.
      </p>
    </div>
  );
}

export default memo(WatchStage);
