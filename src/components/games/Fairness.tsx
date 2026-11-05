"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GAMES } from "@/content/copy/games";
import { FACTS } from "@/content/facts";
import { CallChip, Reveal, SectionIndex } from "@/components/ui/primitives";
import { mulberry32 } from "@/sim/rng";
import { useUI } from "@/store/ui";
import { GAMES_UI } from "./labels";

/** Base architecture silhouette: 5 obs channels → hidden → hidden → 3 continuous actions. */
const SHAPE = [5, 8, 8, 3];
const BAD = [5, 6, 10, 2];

function Net({ shape, seed, w = 300, h = 200, tone = "var(--agent)", className = "" }: { shape: number[]; seed: number; w?: number; h?: number; tone?: string; className?: string }) {
  const { nodes, edges } = useMemo(() => {
    const rnd = mulberry32(seed);
    const cols = shape.map((n, ci) => {
      const x = 14 + (ci * (w - 28)) / (shape.length - 1);
      return Array.from({ length: n }, (_, k) => ({ x, y: h / 2 + (k - (n - 1) / 2) * Math.min(22, (h - 24) / Math.max(...shape)) }));
    });
    const e: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
    for (let c = 0; c < cols.length - 1; c++)
      for (const a of cols[c]) for (const b of cols[c + 1]) e.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, o: Math.pow(rnd(), 2.2) });
    return { nodes: cols.flat(), edges: e };
  }, [shape, seed, w, h]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      {edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={tone} strokeWidth={0.4 + e.o * 1.1} strokeOpacity={0.06 + e.o * 0.8} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={2.6} fill="var(--void)" stroke={tone} strokeWidth={1} />
      ))}
    </svg>
  );
}

/** Column-slot outline of a shape (the "gate" every upload must fit). */
function Slots({ shape, tone, w = 120, h = 90 }: { shape: number[]; tone: string; w?: number; h?: number }) {
  const max = Math.max(...SHAPE, ...shape);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
      {shape.map((n, ci) => {
        const x = 10 + (ci * (w - 20)) / (shape.length - 1);
        const hh = (n / max) * (h - 12);
        return <rect key={ci} x={x - 5} y={(h - hh) / 2} width={10} height={hh} fill="none" stroke={tone} strokeWidth={1} />;
      })}
    </svg>
  );
}

type Phase = 0 | 1 | 2 | 3 | 4;

function Lane({ bad, phase, motion }: { bad: boolean; phase: Phase; motion: boolean }) {
  const F = GAMES.fairness;
  // packet position (% of track) per phase
  const at = motion
    ? bad
      ? phase === 1
        ? 58
        : 0
      : phase >= 3
        ? phase === 4
          ? 100
          : 58
        : 0
    : bad
      ? 0
      : 100;
  const shown = motion ? (bad ? phase >= 2 : phase === 4) : true;
  const tone = bad ? "var(--hot)" : "var(--signal)";
  const packetTone = shown ? tone : "var(--agent)";
  return (
    <div className="grid gap-3">
      <p className="eyebrow">{bad ? GAMES_UI.laneBad : GAMES_UI.laneGood}</p>
      <div className="relative h-[92px] border-y border-[var(--rule)]">
        {/* gate */}
        <div className="absolute left-[64%] top-1/2 h-[78px] w-[104px] -translate-y-1/2 border-x border-dashed border-[var(--rule-strong)] px-1">
          <Slots shape={SHAPE} tone={shown ? tone : "var(--paper-dim)"} />
        </div>
        {/* packet */}
        <div
          className="absolute top-1/2 h-[70px] w-[96px] -translate-y-1/2"
          style={{
            left: `calc(${at}% * 0.82)`,
            transition: motion ? (bad && phase === 2 ? "left 0.9s cubic-bezier(.2,1.6,.4,1)" : "left 1.1s var(--ease-expo)") : undefined,
            animation: motion && bad && phase === 2 ? "fair-shake 0.32s steps(4) 1" : undefined,
          }}
        >
          <Slots shape={bad ? BAD : SHAPE} tone={packetTone} w={120} h={90} />
        </div>
      </div>
      <p className="mono text-[0.78rem] tracking-[0.04em]" style={{ color: tone, opacity: shown ? 1 : 0.18, transition: "opacity .4s" }}>
        {bad ? F.bad : F.ok}
      </p>
    </div>
  );
}

export default function Fairness({ index }: { index: string }) {
  const F = GAMES.fairness;
  const motion = useUI((s) => s.motion);
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(0);
  const [inView, setInView] = useState(false);
  const [method, path] = F.path.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!motion || !inView) return;
    const seq: [Phase, number][] = [
      [1, 200],
      [2, 1400],
      [3, 3000],
      [4, 4300],
      [0, 8200],
    ];
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers = seq.map(([p, t]) => setTimeout(() => setPhase(p), t));
      timers.push(setTimeout(run, 8600));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [motion, inView]);

  return (
    <section className="shell relative py-28 md:py-40" aria-labelledby="fairness-title">
      <style>{`@keyframes fair-shake{0%{transform:translate(0,-50%)}25%{transform:translate(-4px,-50%)}50%{transform:translate(3px,-50%)}75%{transform:translate(-2px,-50%)}100%{transform:translate(0,-50%)}}`}</style>
      <div className="flex items-center justify-between gap-4 border-t border-[var(--rule)] pt-6">
        <SectionIndex>{index}</SectionIndex>
      </div>
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal as="h2" width className="display display-l max-w-[14ch]">
            <span id="fairness-title">{F.title}</span>
          </Reveal>
          <Reveal as="p" delay={120} className="mt-8 max-w-[52ch] text-[var(--paper-dim)]">
            {F.body}
          </Reveal>
          <Reveal delay={200} className="mt-8">
            <CallChip method={method} path={path} />
          </Reveal>
        </div>
        <div ref={ref} className="grid gap-12 lg:col-span-7">
          <figure className="grid gap-4">
            <div className="grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)]">
              {[GAMES_UI.netA, GAMES_UI.netB].map((lab, i) => (
                <div key={lab} className="bg-[var(--deck)] p-4 md:p-6">
                  <Net shape={SHAPE} seed={i === 0 ? 17 : 91} className="h-auto w-full" />
                  <p className="mono mt-3 text-[0.68rem] tracking-[0.1em] text-[var(--paper-dim)]">{lab}</p>
                </div>
              ))}
            </div>
            <figcaption className="mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{GAMES_UI.sameShape}</figcaption>
          </figure>
          <div className="grid gap-8">
            <p className="mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{GAMES_UI.gate} · {FACTS.games[0].input} → {FACTS.games[0].output}</p>
            <Lane bad phase={phase} motion={motion} />
            <Lane bad={false} phase={phase} motion={motion} />
          </div>
        </div>
      </div>
    </section>
  );
}
