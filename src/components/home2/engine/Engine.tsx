"use client";
/**
 * The MidEarth Core: the home hero visual. A wordless, living orrery of the agent economy
 * (see scene.ts for what every element means and which real signal drives it).
 *
 * Safety: Canvas 2D only. The loop runs only while the stage is on screen, the tab is visible,
 * motion is on and the stage has a real size (>= 8px); dt is clamped, DPR capped at 1.5,
 * the backing store capped at 2400px, every scene collection is capped, and everything is
 * released on unmount. Reduced motion draws one composed still frame.
 */
import { useEffect, useRef } from "react";
import { arenaEvents, useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { CoreScene, type Palette, type RGB } from "./scene";

const REPLAY_EVERY = 6.5;
const LIVE_CHAT_QUIET = 20;
/** the canvas bleeds past the figure so glow is never clipped by the box */
const BLEED = 0.14;

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const probe = document.createElement("canvas").getContext("2d");
  const parse = (name: string, fb: RGB): RGB => {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw || !probe) return fb;
    probe.fillStyle = "#000";
    probe.fillStyle = raw;
    const v = String(probe.fillStyle);
    if (v.startsWith("#") && v.length === 7) {
      const n = parseInt(v.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = v.match(/[\d.]+/g);
    return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fb;
  };
  const ground = parse("--void", [4, 7, 11]);
  const lum = (0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2]) / 255;
  return {
    ink: parse("--paper", [228, 236, 239]),
    dim: parse("--paper-dim", [141, 158, 168]),
    signal: parse("--signal", [46, 230, 161]),
    agent: parse("--agent", [56, 198, 228]),
    value: parse("--value", [226, 181, 82]),
    frost: parse("--frost", [184, 220, 242]),
    light: lum > 0.5,
  };
}

export default function Engine({ className = "" }: { className?: string }) {
  const figRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CoreScene | null>(null);
  if (!sceneRef.current) sceneRef.current = new CoreScene();
  const kickRef = useRef<() => void>(() => {});
  const lastLiveChat = useRef(-1e9);

  const motion = useUI((s) => s.motion);
  const motionRef = useRef(motion);

  const leaders = useArenaStore((s) => s.leaders);
  const contests = useArenaStore((s) => s.contests);
  const chat = useArenaStore((s) => s.chat);
  const d = useArenaDerived();
  const chatRef = useRef(chat);

  /* ── data → scene ── */
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);
  useEffect(() => {
    sceneRef.current!.setAgents(leaders);
    if (!motionRef.current) sceneRef.current!.settle();
    kickRef.current();
  }, [leaders]);

  const open = contests.filter((c) => c.status === "open");
  const seats = open.reduce((a, c) => a + c.filled_slots, 0);
  const cap = open.reduce((a, c) => a + c.max_slots, 0);
  const fill = cap > 0 ? seats / cap : 0;
  const lockBucket = Math.round(d.nextLockSec / 15);
  useEffect(() => {
    sceneRef.current!.setArena({
      fill,
      open: d.openPools,
      lockSec: lockBucket * 15,
      running: d.anyRunning,
      paid: d.idlePaidOut,
    });
    if (!motionRef.current) {
      sceneRef.current!.settle();
      kickRef.current();
    }
  }, [fill, d.openPools, lockBucket, d.anyRunning, d.idlePaidOut]);

  useEffect(() => {
    const sc = sceneRef.current!;
    if (process.env.NODE_ENV === "development") (window as unknown as { __core?: CoreScene }).__core = sc;
    const off = arenaEvents.on((e) => {
      if (!motionRef.current) return;
      if (e.type === "slot") sc.slot(e.delta);
      else {
        lastLiveChat.current = sc.time;
        sc.chat(e.msg, chatRef.current);
      }
    });
    return off;
  }, []);

  /* ── canvas lifecycle ── */
  useEffect(() => {
    motionRef.current = motion;
    const sc = sceneRef.current!;
    if (motion) sc.resume();
    else sc.settle();
    kickRef.current();
  }, [motion]);

  useEffect(() => {
    const fig = figRef.current;
    const cv = canvasRef.current;
    if (!fig || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const sc = sceneRef.current!;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let sized = false;
    let alive = true;
    let W = 0;
    let H = 0;
    let unit = 0;
    let pal = readPalette(fig);
    let replayT = 2;
    let replayIdx = 0;

    const paint = () => {
      if (!sized) return;
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      sc.draw(ctx, W, H, pal, unit);
    };

    const frame = (ts: number) => {
      raf = 0;
      if (!alive || !sized || !onScreen || document.hidden || !motionRef.current) return;
      const dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
      last = ts;
      sc.step(dt);
      // honest ambience: when the live feed is quiet, replay recent public chat as light
      replayT += dt;
      if (replayT > REPLAY_EVERY) {
        replayT = 0;
        const list = chatRef.current;
        if (list.length && sc.time - lastLiveChat.current > LIVE_CHAT_QUIET) {
          const m = list[replayIdx % list.length];
          replayIdx = (replayIdx + 1) % 10000;
          if (m) sc.chat(m, list);
        }
      }
      paint();
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!alive) return;
      if (motionRef.current) {
        if (!raf && sized && onScreen && !document.hidden) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      } else {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        paint();
      }
    };
    kickRef.current = kick;

    const resize = () => {
      const r = fig.getBoundingClientRect();
      const fw = Math.floor(r.width);
      const fh = Math.floor(r.height);
      if (!(fw >= 8) || !(fh >= 8)) {
        sized = false;
        return;
      }
      W = Math.floor(fw * (1 + 2 * BLEED));
      H = Math.floor(fh * (1 + 2 * BLEED));
      unit = Math.min(fw, fh * 1.3);
      let dpr = Math.min(1.5, window.devicePixelRatio || 1);
      dpr = Math.max(0.5, Math.min(dpr, 2400 / W, 2400 / H));
      const bw = Math.max(1, Math.round(W * dpr));
      const bh = Math.max(1, Math.round(H * dpr));
      if (cv.width !== bw || cv.height !== bh) {
        cv.width = bw;
        cv.height = bh;
      }
      sized = true;
      if (!raf) paint();
      kick();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(fig);
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        kick();
      },
      { rootMargin: "60px" },
    );
    io.observe(fig);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);
    const mo = new MutationObserver(() => {
      pal = readPalette(fig);
      if (!raf) paint();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode"],
    });

    // gentle pointer parallax (fine pointers only)
    const fine = window.matchMedia?.("(pointer: fine)").matches ?? false;
    const onMove = (e: PointerEvent) => {
      if (!motionRef.current) return;
      const r = fig.getBoundingClientRect();
      if (!(r.width > 0) || !(r.height > 0)) return;
      sc.pointer(((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2, ((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 2);
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    resize();

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (fine) window.removeEventListener("pointermove", onMove);
      kickRef.current = () => {};
      cv.width = 0;
      cv.height = 0;
    };
  }, []);

  return (
    <figure
      ref={figRef}
      role="img"
      aria-label="The MidEarth core: live agents orbit a planet of agent infrastructure, the eight products ring it, lit by their status, and value from the arena settles on five gold rings, one for each revenue pillar."
      className={`relative m-0 aspect-[4/3] w-full sm:aspect-square ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${-BLEED * 100}%`,
          top: `${-BLEED * 100}%`,
          width: `${100 + BLEED * 200}%`,
          height: `${100 + BLEED * 200}%`,
        }}
      />
    </figure>
  );
}
