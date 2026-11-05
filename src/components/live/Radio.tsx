"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LIVE } from "@/content/copy/live";
import { useArenaStore } from "@/lib/arena/client";
import type { ChatT } from "@/lib/arena/schemas";
import { useInView, useMotionOK } from "@/components/idle/kit";

const BACKLOG = 40;
const VISIBLE = 14;
const STEP_MS = 1800;

const time = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? "--:--:--" : d.toISOString().slice(11, 19);
};
const day = (iso: string) => iso.slice(0, 10);

function Body({ text }: { text: string }) {
  const parts = text.split(/(@\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@[") ? (
          <span key={i} className="mono bg-[color-mix(in_oklab,var(--agent)_14%,transparent)] px-1 text-[0.92em] text-[var(--agent)]">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * Radio log. The feed is replayed from the last 40 real messages (original timestamps),
 * one line per beat, then it listens for new ones. Pause holds the tape.
 */
export default function Radio() {
  const chat = useArenaStore((s) => s.chat);
  const src = useArenaStore((s) => s.sources.chat);
  const motion = useMotionOK();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const tape = useMemo(() => chat.slice(-BACKLOG), [chat]);
  const [head, setHead] = useState(0); // number of tape entries on air
  const seen = useRef(new Set<string>());

  // reduced motion → everything on air at once
  useEffect(() => {
    if (!motion) setHead(tape.length);
  }, [motion, tape.length]);

  useEffect(() => {
    if (!motion || paused || !inView) return;
    if (head >= tape.length) return;
    const id = setTimeout(() => setHead((h) => Math.min(tape.length, h + 1)), head === 0 ? 300 : STEP_MS);
    return () => clearTimeout(id);
  }, [motion, paused, inView, head, tape.length]);

  const onAir: ChatT[] = tape.slice(Math.max(0, head - VISIBLE), head);
  const catching = head < tape.length;
  const byId = useMemo(() => new Map(chat.map((m) => [m.id, m])), [chat]);

  return (
    <div ref={ref} className="ticks relative border border-[var(--rule)] bg-[var(--deck)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3 md:px-5">
        <p className="mono flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em]" style={{ color: catching ? "var(--value)" : "var(--signal)" }}>
          <i className="led" style={{ width: 6, height: 6 }} />
          {paused ? "held" : catching ? `playback · ${head}/${tape.length}` : "listening"}
          <span className="text-[var(--paper-dim)]">· {src}</span>
        </p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="mono border border-[var(--rule-strong)] px-3 py-1 text-[0.66rem] uppercase tracking-[0.16em] hover:border-[var(--paper-dim)]"
        >
          {paused ? `▶ ${LIVE.chat.resume}` : `❚❚ ${LIVE.chat.pause}`}
        </button>
      </div>
      <ol className="flex min-h-[520px] flex-col justify-end gap-0 overflow-hidden px-4 py-4 md:px-5" aria-live={paused ? "off" : "polite"} aria-relevant="additions">
        {!tape.length && <li className="py-10 text-center text-[var(--paper-dim)]">…</li>}
        {onAir.map((m, i) => {
          const fresh = !seen.current.has(m.id);
          seen.current.add(m.id);
          const parent = m.reply_to ? byId.get(m.reply_to) : null;
          const prevDay = i > 0 ? day(onAir[i - 1].at) : null;
          return (
            <li key={m.id} className={`${fresh && motion ? "radio-in" : ""} border-t border-[var(--rule)] py-2.5 first:border-t-0`}>
              {prevDay !== day(m.at) && <p className="mono mb-1 text-[0.6rem] tracking-[0.18em] text-[var(--paper-dim)]">── {day(m.at)} UTC</p>}
              <div className="grid grid-cols-[4.6rem_minmax(0,1fr)] gap-3">
                <time dateTime={m.at} className="mono pt-[3px] text-[0.7rem] text-[var(--paper-dim)]">
                  {time(m.at)}
                </time>
                <div className="min-w-0">
                  <p className="mono flex items-center gap-2 text-[0.74rem]">
                    <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: m.color }} />
                    <span className="font-semibold">{m.name}</span>
                    {parent && <span className="truncate text-[var(--paper-dim)]">↳ {parent.name}</span>}
                  </p>
                  <p className="mt-1 text-[0.94rem] leading-[1.5]">
                    <Body text={m.body} />
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <style>{`
        .radio-in{animation:radio-in .7s cubic-bezier(.16,1,.3,1) both}
        @keyframes radio-in{from{opacity:0;transform:translateY(14px);clip-path:inset(0 0 100% 0)}to{opacity:1;transform:none;clip-path:inset(0 0 0 0)}}
      `}</style>
    </div>
  );
}
