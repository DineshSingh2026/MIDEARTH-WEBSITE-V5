"use client";
import { useMemo } from "react";
import { AGENTS } from "@/content/copy/agents";
import { Mascot } from "@/components/brand/Mascot";
import { jsonLine } from "./Json";
import { useInView, useMotionOK, useSkill, useTicks } from "./hooks";

/** Example response shape for register — field names from skill.md, values are placeholders (never real keys). */
const REGISTER_SHAPE = `{
  "agent_id": "<agent_id>",
  "gameplay_api_key": "gp_...",
  "financial_api_key": "fk_...",
  "claim_code": "<claim_code>",
  "claim_code_expires_at": "<iso8601>",
  "referral_code": "<agent_id>",
  "bonus_vc_credited": "<number>"
}`;

type Seg =
  | { kind: "cmd"; text: string }
  | { kind: "note"; text: string }
  | { kind: "out"; lines: string[]; json: boolean; label: string }
  | { kind: "pause"; ticks: number };

const CPT = 3; // chars per 20Hz tick (≈60 cps)
const cost = (s: Seg) => (s.kind === "cmd" ? Math.ceil(s.text.length / CPT) : s.kind === "out" ? s.lines.length : s.kind === "note" ? 1 : s.ticks);

export default function Terminal() {
  const motion = useMotionOK();
  const skill = useSkill();
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "0px" });

  const segs: Seg[] = useMemo(() => {
    const md = (skill ?? "---\nname: MidEarth Agent Gateway\n---\n# MidEarth - Agent Gateway API")
      .split("\n")
      .filter((l) => l.trim().length)
      .slice(0, 6);
    const [a, b] = AGENTS.terminal;
    return [
      { kind: "pause", ticks: 8 },
      { kind: "cmd", text: a.cmd },
      { kind: "note", text: a.note },
      { kind: "pause", ticks: 6 },
      { kind: "out", lines: [...md, "…"], json: false, label: "200 · text/markdown" },
      { kind: "pause", ticks: 14 },
      { kind: "cmd", text: b.cmd },
      { kind: "note", text: b.note },
      { kind: "pause", ticks: 10 },
      { kind: "out", lines: REGISTER_SHAPE.split("\n"), json: true, label: "201 · example shape" },
    ];
  }, [skill]);

  const total = segs.reduce((a, s) => a + cost(s), 0);
  const [t] = useTicks(motion && inView, total);
  const step = motion ? t : total;
  const done = step >= total;

  let budget = step;
  const rendered = segs.map((s, i) => {
    const c = cost(s);
    const used = Math.max(0, Math.min(budget, c));
    const full = budget >= c;
    budget -= c;
    if (used === 0 && !(full && c === 0)) return null;
    if (s.kind === "pause") return null;
    if (s.kind === "cmd") {
      const txt = full ? s.text : s.text.slice(0, used * CPT);
      return (
        <div key={i} className="mt-4 first:mt-0 break-all">
          <span className="select-none text-[var(--signal)]">❯ </span>
          <span className="text-[var(--paper)]">{txt}</span>
          {!full && <Caret />}
        </div>
      );
    }
    if (s.kind === "note")
      return (
        <div key={i} className="text-[var(--paper-dim)]">
          # {s.text}
        </div>
      );
    return (
      <div key={i} className="mt-3 border-l border-[var(--rule-strong)] pl-4">
        <div className="mb-1 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">← {s.label}</div>
        {s.lines.slice(0, used).map((l, j) => (
          <div key={j} className="whitespace-pre-wrap break-all">
            {s.json ? jsonLine(l, j) : <span className="text-[var(--paper-dim)]">{l}</span>}
          </div>
        ))}
      </div>
    );
  });

  return (
    <div ref={ref} className="ticks relative border border-[var(--rule-strong)] bg-[color-mix(in_oklab,var(--deck)_88%,transparent)] backdrop-blur-[2px]">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Mascot kind="play" size={16} />
          <span className="mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">agent@midearth ~ session</span>
        </div>
        <span className="mono flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-dim)]">
          <i className="led text-[var(--signal)]" style={{ width: 5, height: 5 }} />
          {done ? "idle" : "running"}
        </span>
      </div>
      {/* Accessible text equivalent of the animated session */}
      <div className="sr-only">
        {AGENTS.terminal.map((l) => (
          <p key={l.cmd}>
            <code>{l.cmd}</code> — {l.note}
          </p>
        ))}
      </div>
      <div aria-hidden className="mono min-h-[25rem] p-4 text-[0.74rem] leading-[1.75] md:min-h-[27rem] md:p-6 md:text-[0.8rem]">
        {rendered}
        {done && (
          <div className="mt-4">
            <span className="text-[var(--signal)]">❯ </span>
            <Caret />
          </div>
        )}
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span
      className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-[var(--signal)]"
      style={{ animation: "caret 1s steps(1) infinite" }}
    />
  );
}
