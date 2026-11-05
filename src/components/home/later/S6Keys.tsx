"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HOME } from "@/content/copy/home";
import { frameState } from "@/three/registry";
import { RegMark, Section, SectionHead, rgba, useCanvas, useInView, useMotionOK, useTokens, type Tokens } from "./shared";

const K = HOME.keys;
/** Duration of each leak step (ms). -1 = idle, 5 = finished (new pair live). */
const STEP_MS = [1500, 1300, 1500, 1700, 2400];
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

type Seg = { x1: number; y1: number; x2: number; y2: number; t0: number; t1: number; d: number };
type Shard = { a: number; r: number; v: number; rot: number; vr: number; s: number; gold: boolean };

const now = () => performance.now() / 1000;
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Crystalline dendrites growing in from the section edges (60° ice branching). */
function buildFrost(w: number, h: number): Seg[] {
  const segs: Seg[] = [];
  const speed = 560;
  const stepLen = 12;
  const grow = (x: number, y: number, a: number, len: number, depth: number, t0: number) => {
    const n = Math.ceil(len / stepLen);
    let px = x,
      py = y,
      tt = t0;
    for (let i = 0; i < n; i++) {
      a += (Math.random() - 0.5) * 0.1;
      const nx = px + Math.cos(a) * stepLen;
      const ny = py + Math.sin(a) * stepLen;
      segs.push({ x1: px, y1: py, x2: nx, y2: ny, t0: tt, t1: tt + stepLen / speed, d: depth });
      tt += stepLen / speed;
      if (depth > 0 && i % 3 === 2) {
        for (const side of [-1, 1]) if (Math.random() < 0.6) grow(nx, ny, a + (side * Math.PI) / 3, len * 0.36 * (1 - (i / n) * 0.6), depth - 1, tt);
      }
      px = nx;
      py = ny;
    }
  };
  const L = Math.max(w, h) * 0.34;
  const seeds = w < 640 ? 7 : 11;
  for (let i = 0; i < seeds; i++) {
    const edge = i % 4;
    const u = (i + 0.5) / seeds + (Math.random() - 0.5) * 0.08;
    const [x, y, a] =
      edge === 0 ? [u * w, 0, Math.PI / 2] : edge === 1 ? [w, u * h, Math.PI] : edge === 2 ? [(1 - u) * w, h, -Math.PI / 2] : [0, (1 - u) * h, 0];
    grow(x, y, a + (Math.random() - 0.5) * 0.7, L * (0.7 + Math.random() * 0.5), 2, Math.random() * 0.35);
  }
  return segs;
}

export default function S6Keys() {
  const motion = useMotionOK();
  const { ref: tok, mode } = useTokens();
  const secRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLCanvasElement>(null);
  const frostRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(secRef, "100px");
  const [step, setStep] = useState(-1);
  const [code, setCode] = useState("");
  const stepRef = useRef(-1);
  const stepAt = useRef(0);
  const waveT = useRef(0);
  const frost = useRef<{ segs: Seg[]; w: number; h: number } | null>(null);
  const shards = useRef<Shard[] | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    stepRef.current = step;
    stepAt.current = now();
    // drive the 3D world's leak sequence (0 idle, 1–5 = leak → freeze → frozen → reclaim → new keys)
    frameState.signals.leak = step < 0 || step >= 5 ? 0 : step + 1;
    if (step === 2) frost.current = null; // rebuilt lazily at current size
    if (step === 4) shards.current = null;
  }, [step]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCode(
      "MD-" +
        Array.from({ length: 8 }, (_, i) => (i === 4 ? "-" : "") + CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(""),
    );
    let acc = 0;
    setStep(0);
    STEP_MS.forEach((ms, i) => {
      acc += ms;
      timers.current.push(window.setTimeout(() => setStep(i + 1), acc));
    });
  }, []);

  const running = step >= 0 && step < 5;

  /* ── key-scope rings ── */
  useCanvas(
    simRef,
    (ctx, w, h, t) => {
      const T: Tokens = tok.current;
      const s = stepRef.current;
      const st = motion ? now() - stepAt.current : 99;
      const frozen = s === 2 || s === 3;
      if (!frozen) waveT.current = motion ? t : 0.37;
      const tw = waveT.current;
      const cx = w / 2,
        cy = h / 2;
      const R = (Math.min(w, h) / 2) * 0.94;
      const G: [number, number] = [0.13 * R, 0.44 * R];
      const F: [number, number] = [0.57 * R, 0.94 * R];
      const wall = 0.505 * R;
      const leaked = s >= 0 && s <= 3;
      const gCol = frozen ? T.frost : leaked ? T.hot : T.agent;
      const fCol = frozen ? T.frost : T.value;
      const forging = s === 4;
      const forgeK = forging ? ease((st - 0.5) / 1.3) : 1;

      // scope wall (the gap neither ring may cross)
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = rgba(T.paperDim, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, wall, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const l = i % 6 === 0 ? 7 : 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (wall - l), cy + Math.sin(a) * (wall - l));
        ctx.lineTo(cx + Math.cos(a) * wall, cy + Math.sin(a) * wall);
        ctx.strokeStyle = rgba(T.paperDim, 0.35);
        ctx.stroke();
      }

      // band boundaries (forged with an arc sweep in step 4)
      const sweep = forging ? Math.PI * 2 * forgeK : Math.PI * 2;
      const bound = (r: number, c: string, a: number) => {
        if (forging && st < 0.5) return;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + sweep);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      bound(G[0], gCol, 0.3);
      bound(G[1], gCol, 0.45);
      bound(F[0], fCol, 0.3);
      bound(F[1], fCol, 0.45);

      // shockwaves, each confined to its own band
      const waves = (band: [number, number], col: string, phase: number, jitter: boolean) => {
        const n = motion ? 3 : 4;
        for (let k = 0; k < n; k++) {
          const p = motion ? (tw / 2.1 + k / n + phase) % 1 : (k + 0.5) / n;
          const r = band[0] + (band[1] - band[0]) * ease(p);
          const a = Math.sin(p * Math.PI) * (frozen ? 0.5 : 0.85) * forgeK;
          if (a <= 0.01) continue;
          ctx.beginPath();
          const N = 96;
          for (let i = 0; i <= N; i++) {
            const ang = (i / N) * Math.PI * 2;
            const rr = jitter && !frozen ? r + Math.sin(ang * 9 + tw * 23) * 2.4 + Math.sin(ang * 4 - tw * 11) * 1.6 : r;
            const x = cx + Math.cos(ang) * rr,
              y = cy + Math.sin(ang) * rr;
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.strokeStyle = rgba(col, a);
          ctx.lineWidth = 1 + (1 - p) * 2.2;
          ctx.stroke();
        }
      };
      if (!(forging && st < 0.5)) {
        waves(G, gCol, 0, leaked);
        waves(F, fCol, 0.5, false);
      }

      // leak: a gameplay key escapes outward and is stopped by the scope wall
      if (s >= 0 && s <= 3) {
        const a = -0.72;
        const d = s === 0 ? Math.min(wall - 3, (wall - 3) * ease(st / 1.0)) : wall - 3;
        const x = cx + Math.cos(a) * d,
          y = cy + Math.sin(a) * d;
        const col = frozen ? T.frost : T.hot;
        ctx.strokeStyle = rgba(col, 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * G[0], cy + Math.sin(a) * G[0]);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
        const hit = s === 0 ? st - 1.0 : 1.5;
        if (hit > 0) {
          const k = Math.min(1, hit / 0.6);
          ctx.strokeStyle = rgba(col, (1 - k) * 0.9 + 0.25);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, wall, a - 0.08 - k * 0.22, a + 0.08 + k * 0.22);
          ctx.stroke();
        }
      }

      // old keys shatter into fragments
      if (forging && motion) {
        if (!shards.current) {
          shards.current = Array.from({ length: w < 640 ? 70 : 130 }, () => {
            const gold = Math.random() < 0.55;
            const band = gold ? F : G;
            return { a: Math.random() * Math.PI * 2, r: band[0] + Math.random() * (band[1] - band[0]), v: 50 + Math.random() * 220, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9, s: 2 + Math.random() * 6, gold };
          });
        }
        const k = Math.min(1, st / 1.4);
        if (k < 1)
          for (const sh of shards.current) {
            const r = sh.r + sh.v * st;
            ctx.save();
            ctx.translate(cx + Math.cos(sh.a) * r, cy + Math.sin(sh.a) * r);
            ctx.rotate(sh.rot + sh.vr * st);
            ctx.fillStyle = rgba(sh.gold ? T.value : T.hot, (1 - k) * 0.9);
            ctx.beginPath();
            ctx.moveTo(0, -sh.s);
            ctx.lineTo(sh.s * 0.7, sh.s * 0.6);
            ctx.lineTo(-sh.s * 0.5, sh.s * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        // forge flash
        const fl = Math.max(0, 1 - Math.abs(st - 0.55) / 0.35);
        if (fl > 0) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
          g.addColorStop(0, rgba(T.paper, 0.35 * fl));
          g.addColorStop(1, rgba(T.paper, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // the agent
      ctx.fillStyle = frozen ? T.frost : T.paper;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(frozen ? T.frost : T.paper, 0.4);
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.stroke();
    },
    motion && inView,
    `${step}-${mode}-${motion}`,
  );

  /* ── frost overlay over the whole section ── */
  useCanvas(
    frostRef,
    (ctx, w, h) => {
      const s = stepRef.current;
      if (s < 2 || s > 4) return;
      const T = tok.current;
      const st = motion ? now() - stepAt.current : 99;
      if (!frost.current || frost.current.w !== w || frost.current.h !== h) frost.current = { segs: buildFrost(w, h), w, h };
      // frost keeps growing through steps 2 and 3, melts in 4
      const age = s === 2 ? st : s === 3 ? STEP_MS[2] / 1000 + st : 99;
      const melt = s === 4 ? 1 - ease(st / 0.9) : 1;
      if (melt <= 0) return;
      const grow = motion ? ease(age / 1.6) : 1;
      // crystalline wash from the edges inward
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, rgba(T.frost, 0));
      g.addColorStop(1, rgba(T.frost, (mode === "stands" ? 0.16 : 0.22) * grow * melt));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const tNow = motion ? age : 99;
      for (let d = 2; d >= 0; d--) {
        ctx.beginPath();
        for (const sg of frost.current.segs) {
          if (sg.d !== d || sg.t0 > tNow) continue;
          const f = Math.min(1, (tNow - sg.t0) / (sg.t1 - sg.t0));
          ctx.moveTo(sg.x1, sg.y1);
          ctx.lineTo(sg.x1 + (sg.x2 - sg.x1) * f, sg.y1 + (sg.y2 - sg.y1) * f);
        }
        ctx.strokeStyle = rgba(T.frost, (d === 2 ? 0.7 : d === 1 ? 0.5 : 0.32) * melt);
        ctx.lineWidth = d === 2 ? 1.4 : d === 1 ? 0.9 : 0.6;
        ctx.stroke();
      }
    },
    motion && inView && step >= 2 && step <= 4,
    `${step}-${mode}-${motion}`,
  );

  const label = step >= 0 && step < 5 ? K.leakSteps[step] : null;
  const stepColor = (i: number) => (i === 0 ? "color-mix(in oklab, var(--hot) 72%, var(--paper))" : i === 4 ? "var(--signal)" : "var(--frost)");

  return (
    <Section n={6} labelledBy="s6-title" className="overflow-hidden py-28 md:py-40">
      <div ref={secRef} className="shell relative grid gap-14 lg:grid-cols-12 lg:gap-10">
        <RegMark className="-top-10 right-4 hidden md:block" />
        <div className="lg:col-span-5">
          <SectionHead id="s6-title" index={K.index} title={K.title} body={K.body} />
          <dl className="mt-10 space-y-5">
            {[
              { k: K.gameplay, c: "var(--agent)" },
              { k: K.financial, c: "var(--value)" },
            ].map(({ k, c }) => (
              <div key={k.name} className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-[var(--rule-strong)] pt-4">
                <span aria-hidden className="mt-1.5 inline-block h-3 w-3 rounded-full border-2" style={{ borderColor: c }} />
                <div>
                  <dt className="mono text-[0.86rem] tracking-wide" style={{ color: c }}>
                    {k.name}
                  </dt>
                  <dd className="mt-1 text-[0.95rem] text-[var(--paper-dim)]">{k.line}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="mono group relative inline-flex items-center gap-3 overflow-hidden border border-[var(--hot)] px-5 py-3 text-[0.78rem] uppercase tracking-[0.14em] text-[var(--paper)] transition-opacity duration-300 disabled:cursor-progress disabled:opacity-50"
            >
              <span aria-hidden className="inline-block h-2 w-2 rotate-45 bg-[var(--hot)]" />
              {K.leakButton}
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-[var(--hot)] opacity-15 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-0" />
            </button>
          </div>
          <ol className="mono mt-8 space-y-2 text-[0.74rem] uppercase tracking-[0.14em]">
            {K.leakSteps.map((t, i) => {
              const done = step > i;
              const on = step === i;
              return (
                <li key={t} className="flex items-center gap-3 transition-colors duration-500" style={{ color: on ? stepColor(i) : done ? "var(--paper)" : "var(--paper-dim)" }}>
                  <span aria-hidden className="inline-block w-6 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden className="inline-block h-px w-5" style={{ background: on || done ? "currentColor" : "var(--rule-strong)" }} />
                  <span>{t}</span>
                  {done && <span className="sr-only">(done)</span>}
                </li>
              );
            })}
          </ol>
          <p className="mt-8 max-w-[52ch] text-[0.92rem] text-[var(--paper-dim)]">{K.leakCaption}</p>
        </div>

        <div className="relative lg:col-span-7">
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            <canvas ref={simRef} aria-hidden className="absolute inset-0 h-full w-full" />
            <span className="mono pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--agent)] md:text-[0.68rem]">
              {K.gameplay.name}
            </span>
            <span className="mono pointer-events-none absolute left-1/2 top-[4.5%] -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--value)] md:text-[0.68rem]">
              {K.financial.name}
            </span>
            {/* status readout */}
            <p aria-live="polite" className="mono absolute bottom-0 left-0 text-[0.68rem] uppercase tracking-[0.18em]" style={{ color: step >= 0 && step < 5 ? stepColor(step) : "var(--paper-dim)" }}>
              {label ? `● ${label}` : step === 5 ? `● ${K.leakSteps[4]}` : ""}
            </p>
            {/* owner's one lever */}
            <span
              aria-hidden
              className="mono absolute bottom-0 right-0 border px-3 py-1.5 text-[0.66rem] font-bold uppercase tracking-[0.2em] transition-all duration-300"
              style={{
                opacity: step >= 0 && step <= 3 ? 1 : 0,
                borderColor: "var(--frost)",
                color: step >= 1 ? "var(--void)" : "var(--frost)",
                background: step >= 1 ? "var(--frost)" : "transparent",
                transform: step === 1 ? "scale(0.94)" : "none",
              }}
            >
              Freeze
            </span>
            {/* fresh claim code */}
            <span
              aria-hidden
              className="mono absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-6 whitespace-nowrap border border-[var(--frost)] bg-[var(--deck)] px-3 py-1 text-[0.8rem] tracking-[0.18em] text-[var(--paper)] transition-all duration-700"
              style={{ opacity: step === 3 ? 1 : 0, clipPath: step === 3 ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
            >
              {code}
            </span>
          </div>
        </div>
      </div>
      <canvas ref={frostRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />
    </Section>
  );
}
