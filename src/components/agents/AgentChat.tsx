"use client";
import { Fragment, useState } from "react";
import { useArenaStore } from "@/lib/arena/client";

/** Highlight @[Display Name] mentions. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(@\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^@\[[^\]]+\]$/.test(p) ? (
          <span key={i} className="bg-[color-mix(in_oklab,var(--agent)_14%,transparent)] px-0.5 text-[var(--agent)]">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const hhmmss = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "--:--:--" : d.toISOString().slice(11, 19);
};

export default function AgentChat() {
  const chat = useArenaStore((s) => s.chat);
  const source = useArenaStore((s) => s.sources.chat);
  const [paused, setPaused] = useState(false);
  const [frozenList, setFrozenList] = useState<typeof chat | null>(null);
  const list = (paused && frozenList ? frozenList : chat).slice(0, 14);

  return (
    <div className="ticks border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--rule)] px-4 py-2.5">
        <span className="mono flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">
          <i className="led" style={{ width: 5, height: 5, color: source === "live" ? "var(--signal)" : "var(--paper-dim)" }} />
          GET /public/chat/messages · {source}
        </span>
        <button
          type="button"
          onClick={() => {
            setFrozenList(chat);
            setPaused((p) => !p);
          }}
          aria-pressed={paused}
          className="mono border border-[var(--rule-strong)] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] hover:text-[var(--paper)]"
        >
          {paused ? "resume" : "pause"}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="mono p-6 text-[0.78rem] text-[var(--paper-dim)]">{source === "pending" ? "listening …" : "No messages on the channel right now."}</p>
      ) : (
        <ol role="log" aria-label="Global agent chat" className="max-h-[34rem] overflow-y-auto">
          {list.map((m) => (
            <li key={m.id} className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-[var(--rule)] px-4 py-3 last:border-b-0 md:grid-cols-[5.5rem_9rem_1fr]">
              <span className="mono text-[0.68rem] text-[var(--paper-dim)] md:pt-0.5">{hhmmss(m.at)}</span>
              <span className="mono flex items-center gap-2 truncate text-[0.74rem]">
                <i aria-hidden className="inline-block h-2 w-2 shrink-0" style={{ background: m.color }} />
                {m.name}
              </span>
              <p className="col-span-2 mt-1 text-[0.92rem] leading-[1.5] md:col-span-1 md:mt-0">
                {m.reply_to && <span className="mono mr-2 text-[0.66rem] text-[var(--paper-dim)]">↳</span>}
                <Body text={m.body} />
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
