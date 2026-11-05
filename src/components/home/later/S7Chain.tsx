"use client";
import { useEffect, useRef, useState } from "react";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { Btn, Odometer } from "@/components/ui/primitives";
import { RegMark, Rule, Section, SectionHead, rgba, useCanvas, useInView, useMotionOK, useTokens } from "./shared";
import MoneyFlow from "./MoneyFlow";

const E = HOME.economy;
const P = 9; // seconds per deposit → matches → withdrawal cycle
const MEM = 0.34; // membrane height (fraction of canvas)
const DEP = { x: 0.27, t0: 0, t1: 2.2, y0: 0.04, y1: 0.62 };
const WD = { x: 0.73, t0: 6.2, t1: 8.4, y0: 0.62, y1: 0.04 };
const cross = (m: typeof DEP) => m.t0 + ((MEM - m.y0) / (m.y1 - m.y0)) * (m.t1 - m.t0);
const CROSS = [cross(DEP), cross(WD)];

type Loop = { x: number; y: number; r: number; ph: number; sp: number };

export default function S7Chain() {
  const motion = useMotionOK();
  const { ref: tok, mode } = useTokens();
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrap, "80px");
  const loops = useRef<{ w: number; h: number; list: Loop[] } | null>(null);
  const settled = useRef(0);
  const [count, setCount] = useState(0);
  const [touch, setTouch] = useState(2);
  const touchRef = useRef(2);

  const live = motion && inView;
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setCount(settled.current), 450);
    return () => clearInterval(id);
  }, [live]);

  useCanvas(
    cv,
    (ctx, w, h, t, dt) => {
      const T = tok.current;
      const my = MEM * h;
      if (!loops.current || loops.current.w !== w || loops.current.h !== h) {
        const n = w < 640 ? 150 : 340;
        loops.current = {
          w,
          h,
          list: Array.from({ length: n }, () => ({
            x: w * (0.03 + Math.random() * 0.94),
            y: h * (0.5 + Math.pow(Math.random(), 0.8) * 0.45),
            r: 2.5 + Math.random() * 7,
            ph: Math.random() * Math.PI * 2,
            sp: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 9),
          })),
        };
      }
      const ct = motion ? t % P : 7.6;

      // touches lit this cycle (DOM pips)
      const tc = !motion ? 2 : ct >= CROSS[1] ? 2 : ct >= CROSS[0] ? 1 : 0;
      if (tc !== touchRef.current) {
        touchRef.current = tc;
        setTouch(tc);
      }

      // off-chain field: match loops (each completed orbit = one settled match, visualised)
      const L = loops.current.list;
      ctx.beginPath();
      for (const l of L) {
        ctx.moveTo(l.x + l.r, l.y);
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      }
      ctx.strokeStyle = rgba(T.signal, mode === "stands" ? 0.14 : 0.08);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      const tails = new Path2D();
      const dots = new Path2D();
      for (const l of L) {
        if (motion) {
          const before = Math.floor(l.ph / (Math.PI * 2));
          l.ph += l.sp * dt;
          if (Math.floor(l.ph / (Math.PI * 2)) !== before) settled.current++;
        }
        const a = l.ph;
        const dir = Math.sign(l.sp);
        tails.moveTo(l.x + Math.cos(a) * l.r, l.y + Math.sin(a) * l.r);
        tails.arc(l.x, l.y, l.r, a, a - dir * 1.4, dir > 0);
        dots.moveTo(l.x + Math.cos(a) * l.r + 1.2, l.y + Math.sin(a) * l.r);
        dots.arc(l.x + Math.cos(a) * l.r, l.y + Math.sin(a) * l.r, 1.2, 0, Math.PI * 2);
      }
      ctx.strokeStyle = rgba(T.signal, 0.45);
      ctx.lineWidth = 1;
      ctx.stroke(tails);
      ctx.fillStyle = rgba(T.signal, 0.95);
      ctx.fill(dots);

      // scrim between field and membrane so the crossing reads
      const sg = ctx.createLinearGradient(0, my, 0, my + h * 0.16);
      sg.addColorStop(0, rgba(T.void, 0.9));
      sg.addColorStop(1, rgba(T.void, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, my, w, h * 0.16);

      // membrane, rippled where value crosses it
      const ripple = (x: number) => {
        let d = motion ? Math.sin(x / 90 + t * 0.9) * 0.9 : 0;
        const xs = [DEP.x * w, WD.x * w];
        for (let i = 0; i < 2; i++) {
          const age = motion ? ct - CROSS[i] : 0.35;
          if (age < 0 || age > 3) continue;
          const spread = 50 + age * 140;
          d += 11 * Math.exp(-age * 1.5) * Math.exp(-Math.pow((x - xs[i]) / spread, 2)) * Math.sin((x - xs[i]) / 13 - age * 11);
        }
        return d;
      };
      const mem = new Path2D();
      for (let x = 0; x <= w + 6; x += 6) {
        const y = my + ripple(x);
        if (x === 0) mem.moveTo(x, y);
        else mem.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(T.agent, 0.1);
      ctx.lineWidth = 9;
      ctx.stroke(mem);
      ctx.strokeStyle = rgba(T.agent, 0.4);
      ctx.lineWidth = 3;
      ctx.stroke(mem);
      ctx.strokeStyle = rgba(T.paper, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke(mem);

      // the two crossings
      const mover = (m: typeof DEP, idx: number) => {
        const x = m.x * w;
        if (!motion) {
          const ya = m.y0 * h,
            yb = m.y1 * h;
          ctx.setLineDash([3, 5]);
          ctx.strokeStyle = rgba(T.value, 0.8);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, ya);
          ctx.lineTo(x, yb);
          ctx.stroke();
          ctx.setLineDash([]);
          const dir = Math.sign(yb - ya);
          ctx.fillStyle = T.value;
          ctx.beginPath();
          ctx.moveTo(x, yb);
          ctx.lineTo(x - 5, yb - dir * 9);
          ctx.lineTo(x + 5, yb - dir * 9);
          ctx.closePath();
          ctx.fill();
          return;
        }
        const k = (ct - m.t0) / (m.t1 - m.t0);
        if (k < 0 || k > 1.25) return;
        const y = m.y0 * h + (m.y1 - m.y0) * h * Math.min(1, k);
        const fade = k > 1 ? 1 - (k - 1) / 0.25 : 1;
        const tg = ctx.createLinearGradient(x, y, x, y - Math.sign(m.y1 - m.y0) * 80);
        tg.addColorStop(0, rgba(T.value, 0.8 * fade));
        tg.addColorStop(1, rgba(T.value, 0));
        ctx.strokeStyle = tg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - Math.sign(m.y1 - m.y0) * 80);
        ctx.stroke();
        ctx.fillStyle = rgba(T.value, 0.22 * fade);
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(T.value, fade);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        // touch flash
        const age = ct - CROSS[idx];
        if (age > 0 && age < 0.8) {
          ctx.strokeStyle = rgba(T.paper, (1 - age / 0.8) * 0.9);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(x, my, 8 + age * 90, 3 + age * 14, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      };
      mover(DEP, 0);
      mover(WD, 1);
    },
    live,
    `${mode}-${motion}`,
  );

  return (
    <Section n={7} labelledBy="s7-title" className="py-28 md:py-40">
      <div className="shell relative">
        <RegMark className="-left-1 -top-10 hidden md:block" />
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionHead id="s7-title" index={E.index} title={E.title} className="lg:col-span-7" />
          <p className="self-end text-[1.02rem] text-[var(--paper-dim)] md:text-[1.12rem] lg:col-span-5">{E.body}</p>
        </div>

        <div ref={wrap} className="ticks relative mt-14 h-[420px] w-full border border-[var(--rule)] md:mt-20 md:h-[540px]">
          <canvas ref={cv} aria-hidden className="absolute inset-0 h-full w-full" />
          <span className="mono pointer-events-none absolute left-3 text-[0.62rem] uppercase tracking-[0.2em] text-[var(--paper)] md:left-5 md:text-[0.7rem]" style={{ top: `calc(${MEM * 100}% - 2rem)` }}>
            {E.onchain}
          </span>
          <span className="mono pointer-events-none absolute left-3 text-[0.62rem] uppercase tracking-[0.2em] text-[var(--signal)] md:left-5 md:text-[0.7rem]" style={{ top: `calc(${MEM * 100}% + 0.9rem)` }}>
            {E.offchain}
          </span>
          {[DEP, WD].map((m, i) => (
            <span
              key={i}
              aria-hidden
              className="mono pointer-events-none absolute -translate-x-1/2 border px-1.5 py-0.5 text-[0.6rem] tracking-[0.14em] transition-colors duration-300"
              style={{
                left: `calc(${m.x * 100}% + ${i ? "-2.4rem" : "2.4rem"})`,
                top: `calc(${MEM * 100}% - 1.9rem)`,
                color: touch > i ? "var(--value)" : "var(--paper-dim)",
                borderColor: touch > i ? "var(--value)" : "var(--rule-strong)",
              }}
            >
              {String(i + 1).padStart(2, "0")}/02
            </span>
          ))}
        </div>

        <div className="mt-px grid border-x border-b border-[var(--rule)] sm:grid-cols-2">
          <div className="border-b border-[var(--rule)] p-5 sm:border-b-0 sm:border-r md:p-8">
            <p className="eyebrow">{E.counters.touches}</p>
            <p className="mt-3 flex items-end gap-4">
              <span className="display text-[4rem] leading-none text-[var(--value)] md:text-[6rem]">2</span>
              <span aria-hidden className="mb-3 flex gap-1.5">
                {[0, 1].map((i) => (
                  <i key={i} className="block h-2.5 w-2.5 border border-[var(--value)] transition-colors duration-300" style={{ background: touch > i ? "var(--value)" : "transparent" }} />
                ))}
              </span>
            </p>
          </div>
          <div className="p-5 md:p-8">
            <p className="eyebrow">{E.counters.settled}</p>
            <p className="mt-3 text-[2.6rem] leading-none text-[var(--signal)] md:text-[4rem]">{motion ? <Odometer value={count} /> : <span className="mono">—</span>}</p>
            <p className="mono mt-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">Visualisation · not live data</p>
          </div>
        </div>

        <MoneyFlow motion={motion} />

        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Rule left="Accepted on the way in" />
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {FACTS.acceptedAssets.map((a) => (
                <li key={a.symbol} className="ticks mono flex items-center gap-2.5 border border-[var(--rule-strong)] bg-[var(--deck)] px-3 py-2 text-[0.76rem]">
                  <span className="font-bold tracking-[0.1em] text-[var(--paper)]">{a.symbol}</span>
                  <span className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{a.kind}</span>
                  {a.note && <span className="text-[0.66rem] text-[var(--value)]">{a.note}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-end lg:col-span-4 lg:justify-end">
            <Btn href={E.link.href} variant="ghost">
              {E.link.label}
            </Btn>
          </div>
        </div>
      </div>
    </Section>
  );
}
