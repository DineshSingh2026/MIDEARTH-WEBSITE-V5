"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/store/ui";
import { Logo } from "@/components/brand/Logo";
import { GLOBAL } from "@/content/copy/global";
import { lenis } from "@/components/shell/Providers";
import { FILM_END, NODES, T, expoOut, ignitionTime, sstep } from "@/components/intro/timeline";
import { easeInOut, halfPlane, poly } from "@/three/glass/geometry";
import type { Film } from "@/components/intro/film";
import type { GlassSweep } from "@/three/glass/GlassSweep";
import * as sfx from "@/components/intro/sound";

/**
 * MidEarth opening film. Real-time title sequence over the (already rendered) page:
 * WebGL film → crisp SVG logo + Archivo width-sweep wordmark → glass pane exit.
 * Once per session (sessionStorage `me-intro`), skippable (button / Esc), replayable
 * (store.replayIntro), reduced-motion = 0.8s static card, no WebGL = SVG fallback.
 */
type Kind = "film" | "fallback" | "reduced";
type Phase = "boot" | "play" | "off";

const KEY = "me-intro";
const WORD = GLOBAL.wordmark.split("");
const pad = (n: number) => String(n).padStart(2, "0");

const seen = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
};
const prefersMotion = () => {
  try {
    const p = localStorage.getItem("me-motion");
    if (p === "on") return true;
    if (p === "off") return false;
  } catch {}
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
const prefersSound = () => {
  try {
    return localStorage.getItem("me-sound") === "1";
  } catch {
    return false;
  }
};
/** QA hook: ?intro-t=4.6 freezes the film at that time (never auto-finishes). */
const frozenAt = () => {
  try {
    const v = new URLSearchParams(window.location.search).get("intro-t");
    return v === null ? null : Math.max(0, Number(v) || 0);
  } catch {
    return null;
  }
};
const hasWebGL2 = () => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
};

// Runs during HTML parse — hides the veil before first paint when the film was already seen.
const BOOT_SCRIPT = `try{if(sessionStorage.getItem("${KEY}")==="1")document.documentElement.setAttribute("data-intro","seen")}catch(e){}`;
const BOOT_CSS = `html[data-intro="seen"] .me-intro{display:none}
.me-intro{animation:me-intro-fs .6s ease 14s forwards}
@keyframes me-intro-fs{to{opacity:0;visibility:hidden;pointer-events:none}}
.me-intro-pin{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:9px;background:#d8fff0;box-shadow:0 0 12px 3px rgba(0,255,163,.55),0 0 42px 10px rgba(0,255,163,.18);animation:me-pin 1.2s ease-in-out infinite}
@keyframes me-pin{50%{opacity:.45;transform:scale(.7)}}`;

export default function Intro() {
  const replay = useUI((s) => s.introReplay);
  const setIntroDone = useUI((s) => s.setIntroDone);
  const [phase, setPhase] = useState<Phase>("boot");
  const [kind, setKind] = useState<Kind>("film");

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterNumRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const glassHostRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const fbRef = useRef<SVGSVGElement>(null);

  const skipRequest = useRef<() => void>(() => {});
  const runId = useRef(0);

  /* ───────── decide whether to play ───────── */
  useEffect(() => {
    const isReplay = replay > 0;
    if (!isReplay && seen() && frozenAt() === null) {
      setPhase("off");
      setIntroDone(true);
      return;
    }
    document.documentElement.removeAttribute("data-intro");
    const motionOn = isReplay ? useUI.getState().motion : prefersMotion();
    setKind(!motionOn ? "reduced" : hasWebGL2() ? "film" : "fallback");
    setPhase("play");
    setIntroDone(false);
  }, [replay, setIntroDone]);

  const finish = useCallback(() => {
    markSeen();
    document.documentElement.setAttribute("data-intro", "seen");
    setPhase("off");
    setIntroDone(true);
  }, [setIntroDone]);

  /* ───────── the film ───────── */
  useEffect(() => {
    if (phase !== "play") return;
    const id = ++runId.current;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    lenis?.stop();
    skipRef.current?.focus({ preventScroll: true });

    const sound = useUI.getState().sound || prefersSound();
    const freeze = frozenAt();
    let raf = 0;
    let dead = false;
    let film: Film | null = null;
    let glass: GlassSweep | null = null;
    let stopHum: () => void = () => {};
    let lastCount = 0;
    let lastQ = -1;
    let announced = false;
    let t0 = 0;
    let exitAt: number = kind === "reduced" ? 0.8 : T.exit;
    const exitDur = kind === "reduced" ? 0.3 : T.exitDur;
    let chimed = false;
    let whooshed = false;

    const done = () => {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      if (id === runId.current) finish();
    };

    const setOp = (el: HTMLElement | SVGElement | null, v: number) => {
      if (el) el.style.opacity = v.toFixed(3);
    };

    const dom = (t: number) => {
      if (kind === "reduced") {
        setOp(logoRef.current, sstep(0, 0.3, t));
        lettersRef.current.forEach((l) => {
          if (!l) return;
          l.style.opacity = String(sstep(0, 0.3, t));
          l.style.fontVariationSettings = `"wdth" 100, "wght" 760`;
        });
        setOp(taglineRef.current, sstep(0.05, 0.35, t));
        setOp(statusRef.current, sstep(0.05, 0.35, t));
        setOp(stageRef.current, 1 - sstep(exitAt, exitAt + exitDur, t));
        return;
      }
      // 20Hz quantised HUD
      const q = Math.floor(t * 20);
      if (q !== lastQ) {
        lastQ = q;
        const tq = q / 20;
        let c = 0;
        for (let i = 0; i < NODES.length; i++) if (ignitionTime(i) <= tq) c++;
        if (counterNumRef.current) counterNumRef.current.textContent = `${pad(c)}/12`;
        if (barRef.current) barRef.current.style.transform = `scaleX(${(c / 12).toFixed(3)})`;
        if (tcRef.current) tcRef.current.textContent = `TC 00:0${Math.floor(tq)}:${pad(Math.floor((tq % 1) * 24))}`;
        if (c > lastCount) {
          if (sound && lastCount > 0) sfx.tick(1 + c * 0.04);
          lastCount = c;
        }
      }
      setOp(counterRef.current, sstep(0.15, 0.6, t) * (1 - sstep(4.3, 4.8, t)));
      setOp(pinRef.current, 0);
      // logo: particle → vector handoff
      const L = logoRef.current;
      if (L) {
        const k = sstep(T.solid, T.solid + 0.6, t);
        L.style.opacity = k.toFixed(3);
        L.style.filter = k < 1 ? `blur(${((1 - k) * 6).toFixed(2)}px) brightness(${(1 + (1 - k) * 0.6).toFixed(2)})` : "none";
        L.style.transform = `scale(${(1.015 - 0.015 * expoOut((t - T.solid) / 1.4)).toFixed(4)})`;
      }
      lettersRef.current.forEach((l, i) => {
        if (!l) return;
        const lt = t - T.word - i * 0.06;
        const k = expoOut(lt / 1.15);
        l.style.opacity = sstep(0, 0.35, lt).toFixed(3);
        l.style.fontVariationSettings = `"wdth" ${(62 + 63 * k).toFixed(1)}, "wght" ${(560 + 200 * k).toFixed(0)}`;
        l.style.transform = `translateY(${((1 - k) * 0.42).toFixed(3)}em)`;
        l.style.filter = k < 0.98 ? `blur(${((1 - k) * 5).toFixed(2)}px)` : "none";
      });
      const tg = taglineRef.current;
      if (tg) {
        tg.style.opacity = sstep(T.tagline, T.tagline + 0.5, t).toFixed(3);
        tg.style.transform = `translateY(${((1 - expoOut((t - T.tagline) / 0.9)) * 8).toFixed(2)}px)`;
      }
      setOp(statusRef.current, sstep(T.status, T.status + 0.35, t));
      setOp(skipRef.current, 1 - sstep(exitAt, exitAt + 0.25, t));
    };

    const fallback = (t: number) => {
      const svg = fbRef.current;
      if (!svg) return;
      const k = 1 - sstep(3.0, 4.6, t);
      setOp(svg.querySelector<SVGGElement>("[data-planet]"), sstep(0.35, 1.6, t) * (0.35 + 0.65 * k));
      svg.querySelectorAll<SVGGElement>("[data-node]").forEach((n, i) => {
        const it = t - ignitionTime(i);
        const on = it >= 0 ? 1 + 1.4 * Math.exp(-it * 7) : 0;
        n.style.opacity = String(Math.min(1, on) * (1 - 0.6 * sstep(2.4, 4, t)));
        n.style.transform = `scale(${on > 0 ? on : 0})`;
      });
      svg.querySelectorAll<SVGPathElement>("[data-arc]").forEach((a, i) => {
        a.style.strokeDashoffset = String(1 - sstep(ignitionTime(i + 1), ignitionTime(i + 1) + 0.4, t));
        a.style.opacity = String(1 - sstep(2.6, 4, t));
      });
    };

    const exit = (t: number) => {
      const p = Math.min(1, (t - exitAt) / exitDur);
      if (p < 0 || kind === "reduced") return;
      if (sound && !whooshed) {
        whooshed = true;
        sfx.whoosh(exitDur);
      }
      if (glass) {
        const s = glass.frame(easeInOut(p), t, useUI.getState().mode === "stands" ? 1 : 0, 0);
        if (stageRef.current) stageRef.current.style.clipPath = poly(halfPlane(glass.sweep, s, false));
      } else setOp(stageRef.current, 1 - p);
    };

    const loop = (now: number) => {
      if (dead) return;
      const t = freeze ?? (now - t0) / 1000;
      if (film) film.render(Math.min(t, FILM_END));
      else if (kind === "fallback") fallback(t);
      dom(t);
      exit(t);
      if (sound && !chimed && kind !== "reduced" && t >= T.flash) {
        chimed = true;
        sfx.chime(660, 0.07);
      }
      if (!announced && t >= (kind === "reduced" ? 0.1 : T.status)) {
        announced = true;
        if (liveRef.current) liveRef.current.textContent = `MidEarth. ${GLOBAL.intro.tagline} Arena open.`;
      }
      if (freeze === null && t >= exitAt + exitDur) {
        stopHum();
        done();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (dead) return;
      t0 = performance.now();
      if (sound && kind !== "reduced") stopHum = sfx.hum(FILM_END + 0.6);
      raf = requestAnimationFrame(loop);
    };

    skipRequest.current = () => {
      if (dead) return;
      if (!t0) return done();
      const t = (performance.now() - t0) / 1000;
      if (t < exitAt) exitAt = t;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipRequest.current();
      else if (e.key === "Tab") {
        e.preventDefault();
        skipRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    const onResize = () => {
      film?.resize();
      glass?.resize();
    };
    window.addEventListener("resize", onResize);

    const glassReady =
      kind === "reduced" || !glassHostRef.current
        ? Promise.resolve()
        : import("@/three/glass/GlassSweep")
            .then(({ GlassSweep: G }) => {
              if (!dead && glassHostRef.current) glass = new G(glassHostRef.current, { angle: 18 });
            })
            .catch(() => {});

    if (kind === "film") {
      let started = false;
      // never hold the page hostage: if the film chunk is slow, play the SVG cut instead
      const timeout = window.setTimeout(() => {
        if (started || dead) return;
        started = true;
        setKind("fallback");
      }, 4500);
      void Promise.all([import("@/components/intro/film"), glassReady])
        .then(([{ createFilm }]) => {
          if (dead || started || !canvasRef.current || !slotRef.current) return;
          try {
            film = createFilm({ canvas: canvasRef.current, logoSlot: slotRef.current, mobile: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches });
            film.render(0);
            started = true;
            window.clearTimeout(timeout);
            start();
          } catch {
            started = true;
            window.clearTimeout(timeout);
            setKind("fallback");
          }
        })
        .catch(() => {
          if (!started) {
            started = true;
            window.clearTimeout(timeout);
            setKind("fallback");
          }
        });
      return () => {
        window.clearTimeout(timeout);
        cleanup();
      };
    }
    void glassReady.then(start);
    return cleanup;

    function cleanup() {
      dead = true;
      cancelAnimationFrame(raf);
      stopHum();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      film?.dispose();
      film = null;
      glass?.dispose();
      glass = null;
      html.style.overflow = prevOverflow;
      lenis?.start();
    }
  }, [phase, kind, finish]);

  const skip = () => skipRequest.current();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      {phase !== "off" && (
        <div ref={rootRef} className="me-intro fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label="MidEarth intro" data-mode="field">
          <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-[#000205] text-[#dfe9ec]" style={{ willChange: "clip-path" }}>
            <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
            {kind !== "reduced" && <div ref={pinRef} aria-hidden className="me-intro-pin" />}
            {kind === "fallback" && <FallbackStage svgRef={fbRef} />}

            {/* logo slot — the WebGL particles assemble exactly into this rect */}
            <div
              ref={slotRef}
              aria-hidden
              className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
              style={{ height: "clamp(110px, 24vh, 270px)", aspectRatio: "240 / 200" }}
            >
              <div ref={logoRef} className="h-full w-full" style={{ opacity: 0, willChange: "opacity, filter, transform" }}>
                <Logo className="h-full w-full" />
              </div>
            </div>

            <div className="absolute inset-x-0 flex flex-col items-center px-4 text-center" style={{ top: "calc(42% + clamp(110px, 24vh, 270px) / 2 + clamp(18px, 3.2vh, 40px))" }}>
              <h2 className="display flex justify-center whitespace-nowrap leading-none" style={{ fontSize: "clamp(2.3rem, 7.2vw, 6.6rem)", letterSpacing: "0.035em" }} aria-label={GLOBAL.wordmark}>
                {WORD.map((ch, i) => (
                  <span
                    key={i}
                    aria-hidden
                    ref={(el) => {
                      lettersRef.current[i] = el;
                    }}
                    className="inline-block"
                    style={{ opacity: 0, fontVariationSettings: '"wdth" 62, "wght" 560', willChange: "transform, opacity" }}
                  >
                    {ch}
                  </span>
                ))}
              </h2>
              <p ref={taglineRef} className="mono mt-5 text-[0.8rem] tracking-[0.22em] text-[#8da0a9] uppercase md:text-[0.86rem]" style={{ opacity: 0 }}>
                {GLOBAL.intro.tagline}
              </p>
              <p ref={statusRef} className="mono mt-4 inline-flex items-center gap-2.5 text-[0.78rem] tracking-[0.16em] text-[#00ffa3] uppercase" style={{ opacity: 0 }}>
                <span className="led" aria-hidden />→ {GLOBAL.intro.done}
              </p>
            </div>

            {kind !== "reduced" && (
              <>
                <div ref={counterRef} aria-hidden className="mono absolute bottom-6 left-4 text-[0.72rem] tracking-[0.16em] text-[#8da0a9] uppercase md:bottom-9 md:left-10" style={{ opacity: 0 }}>
                  <div className="flex items-baseline gap-3">
                    <span>{GLOBAL.intro.connecting}</span>
                    <span ref={counterNumRef} className="text-[#dfe9ec]">
                      01/12
                    </span>
                  </div>
                  <div className="mt-2.5 h-px w-44 bg-[#12191d]">
                    <div ref={barRef} className="h-px w-full origin-left bg-[#00ffa3]" style={{ transform: "scaleX(0.083)" }} />
                  </div>
                </div>
                <span ref={tcRef} aria-hidden className="mono absolute right-4 bottom-6 text-[0.66rem] tracking-[0.16em] text-[#4e5a5e] md:right-10 md:bottom-9">
                  TC 00:00:00
                </span>
              </>
            )}
          </div>

          <div ref={glassHostRef} aria-hidden className="pointer-events-none absolute inset-0" />

          <button
            ref={skipRef}
            type="button"
            onClick={skip}
            className="mono absolute top-4 right-4 z-10 border border-[#1d282e] bg-[#000205]/40 px-3 py-2 text-[0.72rem] tracking-[0.16em] text-[#8da0a9] uppercase backdrop-blur-sm transition-colors hover:border-[#00ffa3] hover:text-[#dfe9ec] md:top-7 md:right-10"
          >
            {GLOBAL.intro.skip} <span className="text-[#4e5a5e]">esc</span>
          </button>
          <p ref={liveRef} className="sr-only" aria-live="polite" role="status" />
        </div>
      )}
    </>
  );
}

/** No-WebGL cut: same beats in SVG (planet hairlines, 12 nodes, arcs). */
function FallbackStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const R = 300;
  const pts = NODES.map(([la, lo]) => {
    const a = (la * Math.PI) / 180;
    const b = ((lo - 20) * Math.PI) / 180;
    return { x: 500 + Math.cos(a) * Math.sin(b) * R, y: 500 - Math.sin(a) * R };
  });
  return (
    <svg ref={svgRef} aria-hidden viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="me-fb-corona" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.58" stopColor="#5fd0ff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#bfe9ff" stopOpacity="0.5" />
          <stop offset="0.7" stopColor="#2a9bf0" stopOpacity="0.08" />
          <stop offset="1" stopColor="#2a9bf0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g data-planet style={{ opacity: 0 }}>
        <circle cx="500" cy="500" r={R * 1.67} fill="url(#me-fb-corona)" />
        <circle cx="500" cy="500" r={R} fill="#02070b" stroke="#22c8e8" strokeOpacity="0.25" />
        {[-60, -40, -20, 0, 20, 40, 60].map((la) => (
          <ellipse key={la} cx="500" cy={500 - Math.sin((la * Math.PI) / 180) * R} rx={Math.cos((la * Math.PI) / 180) * R} ry={Math.cos((la * Math.PI) / 180) * R * 0.08} fill="none" stroke="#3ed6b0" strokeOpacity="0.1" />
        ))}
        {[-60, -30, 0, 30, 60].map((lo) => (
          <ellipse key={lo} cx="500" cy="500" rx={Math.abs(Math.sin((lo * Math.PI) / 180)) * R + 0.5} ry={R} fill="none" stroke="#3ed6b0" strokeOpacity="0.1" />
        ))}
      </g>
      {pts.slice(1).map((p, i) => (
        <path key={i} data-arc d={`M${pts[i].x},${pts[i].y} Q500,${Math.min(pts[i].y, p.y) - 80} ${p.x},${p.y}`} pathLength={1} strokeDasharray="1" strokeDashoffset="1" fill="none" stroke="#3effb8" strokeOpacity="0.5" strokeWidth="1" />
      ))}
      {pts.map((p, i) => (
        <g key={i} data-node style={{ opacity: 0, transformOrigin: `${p.x}px ${p.y}px`, transformBox: "view-box" }}>
          <circle cx={p.x} cy={p.y} r="14" fill="#00ffa3" opacity="0.18" />
          <circle cx={p.x} cy={p.y} r="3" fill="#e6fff6" />
        </g>
      ))}
    </svg>
  );
}
