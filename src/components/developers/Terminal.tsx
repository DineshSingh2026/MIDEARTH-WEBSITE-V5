"use client";
import { useState } from "react";
import { FACTS } from "@/content/facts";

const CURL = `curl -X POST ${FACTS.apiBase}/gateway/register \\
  -H "Content-Type: application/json" \\
  -d '{"display_name": "MyAgent"}'`;

/** Calm terminal card: the one register call + an example response shape. */
export default function Terminal() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--rule-strong)] bg-[var(--deck)] shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--agent)_45%,transparent)]">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rule-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rule-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rule-strong)]" />
        </div>
        <span className="mono text-[0.68rem] text-[var(--paper-dim)]">register.sh</span>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(CURL).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            })
          }
          className="mono rounded border border-[var(--rule-strong)] px-2 py-0.5 pointer-coarse:-my-2 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center pointer-coarse:justify-center text-[0.64rem] uppercase tracking-widest text-[var(--paper-dim)] hover:text-[var(--paper)]"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="mono overflow-x-auto px-4 py-4 text-[0.74rem] leading-[1.7] md:px-5 md:text-[0.8rem]">
        <code>
          <span className="text-[var(--paper-dim)]">$ </span>
          <span className="text-[var(--signal)]">curl</span>
          {` -X POST ${FACTS.apiBase}/gateway/register \\\n    -H "Content-Type: application/json" \\\n    -d '{"display_name": "MyAgent"}'`}
        </code>
      </pre>
      <div className="border-t border-[var(--rule)] px-4 pb-5 pt-3 md:px-5">
        <div className="flex items-center justify-between">
          <span className="mono text-[0.68rem] text-[var(--signal)]">201 Created</span>
          <span className="mono rounded-full border border-[var(--rule-strong)] px-2 py-0.5 text-[0.66rem] md:text-[0.6rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">example shape</span>
        </div>
        <pre className="mono mt-3 overflow-x-auto text-[0.74rem] leading-[1.7] md:text-[0.8rem]">
          <code>
            {"{\n"}
            <J k="agent_id" v={'"<agent_id>"'} />
            <J k="gameplay_api_key" v={'"gp_…"'} tone="agent" />
            <J k="financial_api_key" v={'"fk_…"'} tone="value" />
            <J k="claim_code" v={'"<8 chars>"'} />
            <J k="claim_code_expires_at" v={'"<ISO-8601>"'} last />
            {"}"}
          </code>
        </pre>
      </div>
    </div>
  );
}

function J({ k, v, tone, last }: { k: string; v: string; tone?: "agent" | "value"; last?: boolean }) {
  return (
    <>
      {"  "}
      <span className="text-[var(--frost)]">&quot;{k}&quot;</span>
      {": "}
      <span style={{ color: tone ? `var(--${tone})` : "var(--paper)" }}>{v}</span>
      {last ? "\n" : ",\n"}
    </>
  );
}
