"use client";
import "./intro2.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { BRAND } from "@/content/site";
import { useUI } from "@/store/ui";
import { lenis } from "@/components/shell/Providers";
import { CHAPTERS, EXIT_MS, INTRO_KEY, STARTS, STATIC_MS, TOTAL_MS, chapterAt, type ChapterId } from "./timeline";
import { BrandLines, ChArena, ChBusiness, ChCycle, ChEnter, ChLogo, ChPlatform, ChShift, ChVision, Dome, ShiftBg } from "./Chapters";
import { Logo } from "@/components/brand/Logo";

/**
 * MidEarth opening film (~25.6s): an eight-chapter story told in order (what MidEarth is,
 * why now, the platform, how it works, how it earns, proof, the vision, enter), then a
 * crossfade onto the site. DOM + CSS only.
 * Plays on every full load / refresh of "/", ?intro=1 forces (any page), ?intro=0 skips,
 * reduced motion → 3.6s static card. Skip button + Esc. CSS failsafe at 32s.
 */

/** view, optional full-bleed backdrop, and layout group ("slide" chapters share one scale so titles match) */
const VIEWS: Record<ChapterId, { View: ComponentType; Bg?: ComponentType; group: "slide" | "center" }> = {
  logo: { View: ChLogo, group: "center" },
  shift: { View: ChShift, Bg: ShiftBg, group: "slide" },
  platform: { View: ChPlatform, group: "slide" },
  cycle: { View: ChCycle, group: "slide" },
  business: { View: ChBusiness, group: "slide" },
  arena: { View: ChArena, group: "slide" },
  vision: { View: ChVision, group: "center" },
  enter: { View: ChEnter, group: "center" },
};

/*
 * Fit to viewport. Every chapter is laid out in a "virtual" box and scaled with one transform so it
 * always fits the safe area (between the top bar and the rail): never clipped, never under chrome.
 * Large screens scale up (design reference 1600x900, capped), dense content scales down.
 * All story slides share the smallest scale, so headline size and position match across chapters.
 */
const REF_W = 1600;
const REF_H = 900;
const MAX_UP = 2.2;

const naturalScale = (box: HTMLElement, inner: HTMLElement, up: number) => {
  const bw = box.clientWidth;
  const bh = box.clientHeight;
  if (!bw || !bh) return 1;
  let s = up;
  for (let k = 0; k < 6; k++) {
    inner.style.width = `${bw / s}px`;
    inner.style.minHeight = "0px";
    const h = inner.offsetHeight;
    const w = inner.scrollWidth;
    // content wider than its virtual box also forces a smaller scale
    const next = Math.min(up, (bh - 1) / h, w > bw / s + 0.5 ? bw / w : up);
    if (next >= s - 0.002) break;
    s = next;
  }
  return Math.floor(s * 1000) / 1000;
};

const applyScale = (box: HTMLElement, inner: HTMLElement, s: number) => {
  inner.style.width = `${box.clientWidth / s}px`;
  inner.style.minHeight = `${box.clientHeight / s}px`;
  inner.style.transform = `scale(${s})`;
  box.style.setProperty("--i2-s", String(s));
};

/** measure every chapter and scale it; aim the logo lockup at the top bar mark it hands over to */
const fitStage = (stage: HTMLElement) => {
  const up = Math.max(1, Math.min(MAX_UP, window.innerWidth / REF_W, window.innerHeight / REF_H));
  const boxes = Array.from(stage.querySelectorAll<HTMLElement>(".i2-fit"));
  const own = boxes.map((b) => naturalScale(b, b.firstElementChild as HTMLElement, up));
  const slides = own.filter((_, i) => boxes[i].dataset.group === "slide");
  const slide = slides.length ? Math.min(...slides) : 1;
  // a slide adopts the shared scale unless that would shrink it by more than 15% (tiny phones)
  boxes.forEach((b, i) => applyScale(b, b.firstElementChild as HTMLElement, b.dataset.group === "slide" ? Math.min(own[i], Math.max(slide, own[i] * 0.85)) : own[i]));

  const lock = stage.querySelector<HTMLElement>(".i2-lockup");
  const dome = lock?.querySelector<HTMLElement>(".i2-lockup-dome");
  const mark = stage.parentElement?.querySelector<HTMLElement>(".i2-brand svg");
  if (!lock || !dome || !mark || getComputedStyle(lock).transform !== "none") return;
  const s = Number(lock.closest<HTMLElement>(".i2-fit")?.style.getPropertyValue("--i2-s")) || 1;
  const L = lock.getBoundingClientRect();
  const D = dome.getBoundingClientRect();
  const M = mark.getBoundingClientRect();
  if (!D.width || !M.width) return;
  const dx = D.left + D.width / 2;
  const dy = D.top + D.height / 2;
  lock.style.setProperty("--lo", `${(dx - L.left) / s}px ${(dy - L.top) / s}px`);
  lock.style.setProperty("--lx", `${(M.left + M.width / 2 - dx) / s}px`);
  lock.style.setProperty("--ly", `${(M.top + M.height / 2 - dy) / s}px`);
  lock.style.setProperty("--lk", String(M.width / D.width));
};

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Phase = "boot" | "play" | "static" | "exit" | "off";

const prefersMotion = () => {
  let pref = "auto";
  try {
    pref = localStorage.getItem("me-motion") || "auto";
  } catch {}
  if (pref === "on") return true;
  if (pref === "off") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const lockScroll = (on: boolean) => {
  const de = document.documentElement;
  de.style.overflow = on ? "hidden" : "";
  if (on) lenis?.stop();
  else lenis?.start();
};

export default function IntroFilm() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<"film" | "static">("film");
  const motion = useUI((s) => s.motion);
  const replay = useUI((s) => s.introReplay);
  const skipRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fills = useRef<(HTMLDivElement | null)[]>([]);
  /** film clock (ms); `hold` freezes it (development QA hook only) */
  const clock = useRef({ t: 0, hold: false });
  const phaseRef = useRef<Phase>("boot");
  phaseRef.current = phase;

  const start = useCallback(() => {
    document.documentElement.dataset.intro = "play";
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
    lockScroll(true);
    window.scrollTo(0, 0);
    useUI.getState().setIntroDone(false);
    setActive(0);
    setRun((r) => r + 1);
    const m = prefersMotion();
    setMode(m ? "film" : "static");
    setPhase(m ? "play" : "static");
  }, []);

  const finish = useCallback(() => {
    const p = phaseRef.current;
    if (p === "exit" || p === "off" || p === "boot") return;
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });
    setPhase("exit");
  }, []);

  // mount: does the boot script want the film?
  useEffect(() => {
    const de = document.documentElement;
    // hydration arrived very late (the CSS failsafe has already revealed the site): stand down
    const forced = new URLSearchParams(location.search).get("intro") === "1";
    if (de.dataset.intro === "play" && !forced && performance.now() > 15000) {
      delete de.dataset.intro;
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {}
      setPhase("off");
    } else if (de.dataset.intro === "play") start();
    else setPhase("off");
  }, [start]);

  // footer "Replay intro"
  const firstReplay = useRef(replay);
  useEffect(() => {
    if (replay === firstReplay.current) return;
    firstReplay.current = replay;
    start();
  }, [replay, start]);

  // exit → unmount, unlock, hand focus back to the page
  useEffect(() => {
    if (phase !== "exit") return;
    const t = window.setTimeout(() => {
      delete document.documentElement.dataset.intro;
      lockScroll(false);
      window.scrollTo(0, 0);
      useUI.getState().setIntroDone(true);
      (document.activeElement as HTMLElement | null)?.blur?.();
      setPhase("off");
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // site motion flag switched off mid-film → finish quietly
  useEffect(() => {
    if (!motion && phaseRef.current === "play") finish();
  }, [motion, finish]);

  // timeline driver (rAF, pauses while the tab is hidden)
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    let cur = 0;
    const c = clock.current;
    c.t = 0;
    const tick = (now: number) => {
      if (!c.hold) c.t += Math.min(now - last, 250);
      const t = c.t;
      last = now;
      CHAPTERS.forEach((ch, i) => {
        const el = fills.current[i];
        if (el) el.style.transform = `scaleX(${Math.max(0, Math.min(1, (t - STARTS[i]) / ch.ms))})`;
      });
      const idx = chapterAt(t);
      if (idx !== cur) {
        cur = idx;
        setActive(idx);
      }
      if (t >= TOTAL_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, run, finish]);

  // fit every chapter into the safe area: before paint, and again on resize / rotation / font load
  const live = phase === "play" || phase === "static" || phase === "exit";
  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    if (!live || !stage) return;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fitStage(stage));
    };
    fitStage(stage);
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [live, run, mode]);

  // development only: QA hook to seek / hold the film clock for frame exact captures
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __i2film?: unknown };
    const c = clock.current;
    w.__i2film = { seek: (ms: number) => void (c.t = ms), hold: (on: boolean) => void (c.hold = on), starts: STARTS };
    return () => void delete w.__i2film;
  }, []);

  // static card auto-dismiss
  useEffect(() => {
    if (phase !== "static") return;
    const t = window.setTimeout(finish, STATIC_MS);
    return () => window.clearTimeout(t);
  }, [phase, finish]);

  // focus Skip, Esc skips, Tab stays inside the dialog
  useEffect(() => {
    if (phase !== "play" && phase !== "static") return;
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  if (phase === "off") return null;

  const isStatic = mode === "static";
  const chapter = CHAPTERS[active];

  return (
    <div
      className="i2-root"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label="MidEarth introduction film"
      // JS has taken over: retire the CSS failsafe so a slow tab never hides a running film
      style={live ? { animation: "none" } : undefined}
    >
      <div className="i2-bg" />
      {live && (
        <>
          <div className="i2-stage" ref={stageRef}>
            {isStatic ? (
              <div className="i2-fit" data-group="center">
                <div className="i2-fit-in">
                  <StaticCard />
                </div>
              </div>
            ) : (
              CHAPTERS.map((c, i) => {
                const { View, Bg, group } = VIEWS[c.id];
                const state = i === active ? "in" : i === active - 1 ? "out" : "idle";
                return (
                  <section key={`${run}-${c.id}`} className="i2-ch" data-id={c.id} data-state={state} aria-hidden={state !== "in"}>
                    {Bg && (
                      <div className="i2-chbg">
                        <Bg />
                      </div>
                    )}
                    <div className="i2-fit" data-group={group}>
                      <div className="i2-fit-in">
                        <View />
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </div>

          <div className="i2-top" data-brand={!isStatic && chapter.id !== "logo" && chapter.id !== "enter" ? "on" : "off"}>
            <div className="i2-brand" aria-hidden="true">
              <Logo size={24} />
              <span className="i2-wordmark">MIDEARTH</span>
            </div>
            <p className="i2-chap sr-only" aria-live="polite" aria-atomic="true">
              {isStatic ? BRAND.name : `Chapter ${active + 1} of ${CHAPTERS.length}: ${chapter.label}`}
            </p>
            <button ref={skipRef} type="button" className="i2-skip" onClick={finish} aria-label="Skip intro and enter the site">
              {isStatic ? "Enter site" : "Skip intro"}
              <kbd className="i2-kbd">Esc</kbd>
            </button>
          </div>

          {!isStatic && (
            <div className="i2-rail" aria-hidden="true">
              <p className="i2-railnow">
                <span>
                  {String(active + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
                </span>
                <b>{chapter.label}</b>
              </p>
              <div className="i2-segs">
                {CHAPTERS.map((c, i) => (
                  <div key={c.id} className="i2-seg" style={{ flexGrow: c.ms }} data-on={i === active} data-past={i < active}>
                    <div className="i2-track">
                      <div className="i2-fill" ref={(el) => void (fills.current[i] = el)} />
                    </div>
                    <p className="i2-seglabel">
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** reduced motion: one calm card, no movement */
function StaticCard() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div className="i2-static i2-center" data-on={on}>
      <div className="flex max-w-[1000px] flex-col items-center text-center">
        <StaticDome />
        <p className="i2-wordmark mt-6" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)" }}>
          MIDEARTH
        </p>
        <p className="mono mt-4 text-[0.78rem] uppercase tracking-[0.28em] text-[var(--paper)]">{BRAND.descriptor}</p>
        <BrandLines className="mt-8" />
        <p className="mono mt-6 text-[0.85rem] uppercase tracking-[0.18em] text-[var(--signal)]">{BRAND.verbs.join(" ")}</p>
      </div>
    </div>
  );
}

function StaticDome() {
  // the static frame of the animated dome (no animation classes apply outside chapters)
  return (
    <span className="block">
      <Dome size={96} />
    </span>
  );
}
