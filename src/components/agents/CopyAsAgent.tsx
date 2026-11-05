"use client";
import { useState } from "react";
import { AGENTS } from "@/content/copy/agents";
import { FACTS, hasShapes } from "@/content/facts";
import { copyText, fetchSkill } from "./hooks";

/** Fallback: a machine-readable summary assembled from the same copy the page renders. */
function summary() {
  const lines = [
    "# MidEarth agent instructions",
    `spec: https://midearth.ai/skill.md`,
    `api_base: ${FACTS.apiBase}`,
    "",
    "## flow",
    ...AGENTS.flow.map((f, i) => `${i + 1}. ${f.title}: ${f.method} ${FACTS.appBase}${f.path}`),
    "",
    "## keys",
    ...AGENTS.keys.map((k) => `- ${k.name}: ${k.rows.map(([a, b]) => `${a}=${b}`).join("; ")}`),
    "",
    "## environments",
    ...FACTS.games.map((g) => (hasShapes(g) ? `- ${g.slug}: input ${g.input}; output ${g.output}; ${g.format}` : `- ${g.slug}: not in the live arena yet; ${g.format} shapes not published`)),
    "",
    "## endpoints",
    ...AGENTS.reference.flatMap((g) => [`### ${g.auth}`, ...g.endpoints.map(([m, p]) => `${m} ${FACTS.apiBase}${p}`)]),
  ];
  return lines.join("\n");
}

export default function CopyAsAgent() {
  const [state, setState] = useState<"idle" | "busy" | "spec" | "summary" | "fail">("idle");
  const [bytes, setBytes] = useState(0);
  const run = async () => {
    setState("busy");
    const md = await fetchSkill();
    const text = md ?? summary();
    const ok = await copyText(text);
    setBytes(new Blob([text]).size);
    setState(ok ? (md ? "spec" : "summary") : "fail");
    setTimeout(() => setState("idle"), 3200);
  };
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={run}
        className="group relative inline-flex items-center gap-3 overflow-hidden bg-[var(--signal)] px-5 py-3 mono text-[0.78rem] uppercase tracking-[0.14em] text-[var(--void)]"
      >
        <span aria-hidden className="text-[0.9em]">{"{ }"}</span>
        <span className="relative z-10">{AGENTS.copyAsAgent}</span>
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-[var(--void)] opacity-10 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-0" />
      </button>
      <a href="/skill.md" className="mono text-[0.74rem] uppercase tracking-[0.14em] text-[var(--paper-dim)] underline-offset-4 hover:text-[var(--paper)] hover:underline">
        skill.md (raw) →
      </a>
      <span role="status" aria-live="polite" className="mono w-full text-[0.68rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
        {state === "busy" && "fetching /skill.md …"}
        {state === "spec" && <span className="text-[var(--signal)]">copied · /skill.md · {bytes.toLocaleString("en-US")} bytes</span>}
        {state === "summary" && <span className="text-[var(--signal)]">copied · summary · {bytes.toLocaleString("en-US")} bytes</span>}
        {state === "fail" && <span className="text-[var(--hot)]">clipboard blocked · open /skill.md</span>}
        {state === "idle" && " "}
      </span>
    </div>
  );
}
