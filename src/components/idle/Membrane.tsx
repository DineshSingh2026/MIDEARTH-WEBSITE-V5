"use client";
/**
 * The membrane. On-chain Solana above, off-chain IDLE below.
 * One deposit crosses down, hundreds of match loops run below, one withdrawal crosses up.
 * The luminous fluid boundary itself is drawn by IdleScene (WebGL) aligned to this element's
 * midline via frameState.signals; this canvas draws the value moving across it.
 */
import { useEffect, useRef, useState } from "react";
import { frameState } from "@/three/registry";
import { HOME } from "@/content/copy/home";
import { IDLE } from "@/content/copy/idle";
import { Odometer } from "@/components/ui/primitives";
import { rgba, seeded, useCanvas2D, useInView, useMotionOK, useTokens } from "@/components/idle/kit";

const CYCLE = 17; // s
const T_DEP = [0.4, 2.6] as const; // deposit travel
const T_LOOP = [2.8, 12.2] as const; // match loops
const T_WD = [12.4, 14.6] as const; // withdrawal
const POOLS = 7;

type Loop = { pool: number; t0: number; dur: number; bend: number; done: boolean };

/** Deterministic schedule of loop start times inside a cycle (rate ramps up, then down). */
function schedule() {
  const r = seeded(4242);
  const out: Loop[] = [];
  let t = T_LOOP[0];
  while (t < T_LOOP[1] - 0.7) {
    const p = (t - T_LOOP[0]) / (T_LOOP[1] - T_LOOP[0]);
    const rate = 6 + 58 * Math.sin(Math.PI * p) ** 1.4; // loops / s
    out.push({ pool: Math.floor(r() * POOLS), t0: t, dur: 0.55 + r() * 0.35, bend: 0.6 + r() * 0.8, done: false });
    t += 1 / rate;
  }
  return out;
}
const LOOPS = schedule();
export const LOOPS_PER_CYCLE = LOOPS.length;

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export default function Membrane() {
  const motion = useMotionOK();
  const [wrap, inView] = useInView<HTMLDivElement>("120px");
  const tok = useTokens(["value", "agent", "signal", "hot", "paper", "paper-dim", "rule-strong"] as const);
  const [touches, setTouches] = useState(motion ? 0 : 2);
  const [settled, setSettled] = useState(motion ? 0 : LOOPS_PER_CYCLE);
  const live = useRef({ touches: 0, settled: 0 });
  const start = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  // publish membrane position (NDC y) for the WebGL fluid boundary
  useEffect(() => {
    let raf = 0;
    const sig = frameState.signals;
    const tick = () => {
      const el = box.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height * 0.5;
        sig.idleMembraneY = 1 - (mid / window.innerHeight) * 2;
        sig.idleMembraneOn = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      sig.idleMembraneOn = 0;
    };
  }, []);

  // 20 Hz quantised counter tick
  useEffect(() => {
    if (!motion) {
      setTouches(2);
      setSettled(LOOPS_PER_CYCLE);
      return;
    }
    const id = setInterval(() => {
      setTouches(live.current.touches);
      setSettled(live.current.settled);
    }, 50);
    return () => clearInterval(id);
  }, [motion]);

  const canvas = useCanvas2D(
    (ctx, w, h, now) => {
      if (!start.current) start.current = now;
      const t = motion ? (now - start.current) % CYCLE : CYCLE - 2;
      const m = h * 0.5;
      const mobile = w < 640;
      const depX = w * (mobile ? 0.2 : 0.22);
      const wdX = w * (mobile ? 0.8 : 0.78);
      const wallet = { x: depX - w * 0.06, y: h * 0.1 };
      const out = { x: wdX + w * 0.06, y: h * 0.1 };
      const bal = { x: w * 0.5, y: m + h * 0.2 };
      const pools = Array.from({ length: POOLS }, (_, i) => {
        const a = Math.PI * (0.08 + (0.84 * i) / (POOLS - 1));
        const rx = Math.min(w * 0.36, 460);
        return { x: bal.x - Math.cos(a) * rx, y: bal.y + Math.sin(a) * h * 0.22 - h * 0.02 };
      });

      ctx.font = `500 ${mobile ? 9 : 10}px ui-monospace, monospace`;
      ctx.textBaseline = "middle";

      // crisp technical hairline (the GL layer adds the luminous fluid)
      ctx.strokeStyle = rgba(tok["paper-dim"], 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, m + 0.5);
      ctx.lineTo(w, m + 0.5);
      ctx.stroke();
      for (let x = 0; x <= w; x += Math.max(1, w / 40)) {
        ctx.beginPath();
        ctx.moveTo(x, m - 3);
        ctx.lineTo(x, m + 3);
        ctx.stroke();
      }

      // nodes
      const node = (p: { x: number; y: number }, c: string, r: number, label?: string, below = false) => {
        ctx.strokeStyle = rgba(c, 0.9);
        ctx.fillStyle = rgba(c, 0.12);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (label) {
          ctx.fillStyle = rgba(tok["paper-dim"], 1);
          ctx.textAlign = "center";
          ctx.fillText(label, p.x, p.y + (below ? r + 12 : -r - 10));
        }
      };
      const steps = IDLE.lifecycle.steps;
      node(wallet, tok.value, 6, steps[0].name.toUpperCase());
      node(out, tok.value, 6, steps[2].name.toUpperCase());
      pools.forEach((p) => node(p, tok.agent, 3.2));
      node(bal, tok.value, 9, "IDLE", true);

      // static guide paths
      const path = (a: { x: number; y: number }, b: { x: number; y: number }, cx: number) => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, m, b.x, b.y);
      };
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = rgba(tok.value, 0.35);
      path(wallet, bal, depX);
      ctx.stroke();
      path(bal, out, wdX);
      ctx.stroke();
      ctx.setLineDash([]);

      const qp = (a: { x: number; y: number }, b: { x: number; y: number }, cx: number, cy: number, u: number) => ({
        x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * cx + u * u * b.x,
        y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * cy + u * u * b.y,
      });

      // a travelling bead with a trail
      const bead = (a: { x: number; y: number }, b: { x: number; y: number }, cx: number, u: number, c: string) => {
        for (let k = 14; k >= 0; k--) {
          const uu = Math.max(0, u - k * 0.012);
          const p = qp(a, b, cx, m, uu);
          ctx.fillStyle = rgba(c, (1 - k / 15) * 0.9);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.2 * (1 - k / 18), 0, Math.PI * 2);
          ctx.fill();
        }
      };

      let touches = 0;
      // deposit
      if (t >= T_DEP[0]) {
        const u = easeIO((t - T_DEP[0]) / (T_DEP[1] - T_DEP[0]));
        if (u < 1) bead(wallet, bal, depX, u, tok.value);
        if (u >= 0.5) {
          touches = 1;
          if (motion && frameState.signals.idleDepAt !== Math.floor(now / CYCLE)) {
            // ripple once per cycle at the crossing point
            frameState.signals.idleRippleX = (depX / w) * 2 - 1;
            frameState.signals.idleRippleT = now;
            frameState.signals.idleDepAt = Math.floor(now / CYCLE);
          }
        }
      }
      // match loops
      let settled = 0;
      for (const L of LOOPS) {
        const u = (t - L.t0) / L.dur;
        if (u >= 1) {
          settled++;
          if (!motion) {
            const p = pools[L.pool];
            ctx.strokeStyle = rgba(tok.agent, 0.05);
            ctx.beginPath();
            ctx.moveTo(bal.x, bal.y);
            ctx.quadraticCurveTo((bal.x + p.x) / 2, bal.y + (p.y - bal.y) * L.bend - 30, p.x, p.y);
            ctx.stroke();
          }
          continue;
        }
        if (u < 0) continue;
        const p = pools[L.pool];
        const cx = (bal.x + p.x) / 2;
        const cy = bal.y + (p.y - bal.y) * L.bend - 30 * L.bend;
        // out: entry fee (hot), back: payout (value)
        const go = u < 0.5;
        const v = go ? ease(u * 2) : 1 - ease((u - 0.5) * 2);
        const c = go ? tok.hot : tok.value;
        ctx.strokeStyle = rgba(c, 0.32);
        ctx.lineWidth = 1;
        ctx.beginPath();
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const uu = go ? (v * i) / steps : v + ((1 - v) * i) / steps;
          const q = qp(bal, p, cx, cy, uu);
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
        const q = qp(bal, p, cx, cy, v);
        ctx.fillStyle = rgba(c, 1);
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
      }
      // withdrawal
      if (t >= T_WD[0]) {
        const u = easeIO((t - T_WD[0]) / (T_WD[1] - T_WD[0]));
        if (u < 1) bead(bal, out, wdX, u, tok.value);
        if (u >= 0.5) {
          touches = 2;
          if (motion && frameState.signals.idleWdAt !== Math.floor(now / CYCLE)) {
            frameState.signals.idleRippleX = (wdX / w) * 2 - 1;
            frameState.signals.idleRippleT = now;
            frameState.signals.idleWdAt = Math.floor(now / CYCLE);
          }
        }
      }
      if (!motion) {
        touches = 2;
        settled = LOOPS_PER_CYCLE;
        ctx.strokeStyle = rgba(tok.value, 0.9);
        ctx.lineWidth = 1.5;
        path(wallet, bal, depX);
        ctx.stroke();
        path(bal, out, wdX);
        ctx.stroke();
      }
      // crossing markers
      const mark = (x: number, on: boolean) => {
        ctx.strokeStyle = rgba(on ? tok.value : tok["paper-dim"], on ? 1 : 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 7, m - 7);
        ctx.lineTo(x + 7, m + 7);
        ctx.moveTo(x + 7, m - 7);
        ctx.lineTo(x - 7, m + 7);
        ctx.stroke();
      };
      mark(depX, touches >= 1);
      mark(wdX, touches >= 2);
      live.current = { touches, settled };
    },
    { running: motion && inView },
  );

  return (
    <div ref={wrap} className="relative">
      <div ref={box} className="relative h-[62vh] min-h-[420px] w-full md:h-[72vh]">
        <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
        <p className="eyebrow absolute left-0 top-3 !text-[var(--value)]">{HOME.economy.onchain}</p>
        <p className="eyebrow absolute bottom-3 left-0 !text-[var(--agent)]">{HOME.economy.offchain}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 border-t border-[var(--rule)] pt-5">
        <div>
          <p className="eyebrow">{HOME.economy.counters.touches}</p>
          <p className="mt-2 text-[clamp(2.4rem,6vw,4.8rem)] leading-none text-[var(--value)]">
            <Odometer value={touches} />
          </p>
        </div>
        <div className="border-l border-[var(--rule)] pl-5">
          <p className="eyebrow">{HOME.economy.counters.settled}</p>
          <p className="mt-2 text-[clamp(2.4rem,6vw,4.8rem)] leading-none text-[var(--agent)]">
            <Odometer value={settled} pad={3} />
          </p>
        </div>
      </div>
      <p className="mono mt-4 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        Diagram · one agent, one funding cycle · counts are illustrative, not arena totals
      </p>
      <p className="sr-only">
        {IDLE.lifecycle.title} {IDLE.lifecycle.steps.map((s) => `${s.name}: ${s.where}. ${s.body}`).join(" ")}
      </p>
    </div>
  );
}
