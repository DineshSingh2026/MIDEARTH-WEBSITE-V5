"use client";
import { useEffect, useState, type ReactNode } from "react";
import { AGENTS } from "@/content/copy/agents";
import { FACTS, hasShapes } from "@/content/facts";
import { CallChip, Reveal, SectionIndex } from "@/components/ui/primitives";
import { Mascot } from "@/components/brand/Mascot";
import { useScene, frameState } from "@/three/registry";
import Terminal from "./Terminal";
import StepArt from "./StepArt";
import CopyAsAgent from "./CopyAsAgent";
import AgentChat from "./AgentChat";
import { JsonBlock } from "./Json";
import { copyText } from "./hooks";
import { SECTIONS, SIGNAL_KEY, sectionNodeIdx, NODES } from "./constellation";

const TOTAL = SECTIONS.length - 1;
const idx = (n: number) => `${String(n).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")}`;

function Section({ n, children, className = "" }: { n: number; children: ReactNode; className?: string }) {
  return (
    <section data-agents-section={n} aria-labelledby={`ag-${SECTIONS[n].key}`} className={`shell relative border-t border-[var(--rule)] py-24 md:py-36 ${className}`}>
      {children}
    </section>
  );
}
function Head({ n, title, aside }: { n: number; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-14 grid gap-6 md:mb-20 md:grid-cols-12">
      <div className="md:col-span-8">
        <SectionIndex>
          {idx(n)} — {SECTIONS[n].label}
        </SectionIndex>
        <Reveal as="h2" width className="display display-l mt-6 max-w-[18ch]">
          <span id={`ag-${SECTIONS[n].key}`}>{title}</span>
        </Reveal>
      </div>
      {aside && <div className="self-end md:col-span-4">{aside}</div>}
    </div>
  );
}

/** Splits a tensor spec "obs_0: [5, 40, 40]" into name + dims. */
const parseShape = (s: string) => {
  const [name, dims] = s.split(":");
  return { name: name.trim(), dims: (dims.match(/\d+/g) ?? []).map(Number) };
};

function TensorGlyph({ dims, tone }: { dims: number[]; tone: string }) {
  // [C, H, W] → C stacked translucent planes of an H×W lattice
  const [c = 1] = dims;
  const planes = Array.from({ length: Math.min(c, 8) });
  return (
    <svg viewBox="0 0 150 120" className="h-28 w-36" aria-hidden>
      <defs>
        <pattern id={`lat-${tone}`} width="2.5" height="2.5" patternUnits="userSpaceOnUse">
          <path d="M2.5 0V2.5H0" fill="none" stroke={`var(--${tone})`} strokeWidth="0.25" opacity="0.6" />
        </pattern>
      </defs>
      {planes.map((_, i) => (
        <g key={i} transform={`translate(${12 + i * 9} ${48 - i * 9}) skewX(-28) scale(1 .62)`}>
          <rect width="100" height="100" fill={`url(#lat-${tone})`} stroke={`var(--${tone})`} strokeWidth="0.8" opacity={0.35 + i * 0.13} />
        </g>
      ))}
    </svg>
  );
}

function ActionGlyph({ n }: { n: number }) {
  return (
    <div className="flex h-28 items-end gap-2" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="relative block w-3 border border-[var(--signal)]" style={{ height: `${40 + ((i * 37) % 50)}%` }}>
          <span className="absolute inset-x-0 bottom-0 bg-[var(--signal)] opacity-60" style={{ height: `${30 + ((i * 53) % 60)}%` }} />
        </span>
      ))}
    </div>
  );
}

function PathText({ p }: { p: string }) {
  return (
    <>
      {p.split(/(\{[^}]+\})/g).map((s, i) =>
        s.startsWith("{") ? (
          <span key={i} className="text-[var(--value)]">
            {s}
          </span>
        ) : (
          <span key={i}>{s}</span>
        ),
      )}
    </>
  );
}

function EndpointRow({ method, path }: { method: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${FACTS.apiBase}${path}`;
  const c = method === "GET" ? "var(--agent)" : "var(--signal)";
  return (
    <li className="group flex items-stretch border-b border-[var(--rule)]">
      <span className="mono flex w-14 shrink-0 items-center justify-center text-[0.62rem] font-bold tracking-wider" style={{ color: c }}>
        {method}
      </span>
      <span className="mono flex min-w-0 flex-1 items-center py-2.5 pr-2 text-[0.76rem]">
        <span className="hidden truncate text-[var(--paper-dim)] opacity-60 xl:inline">{FACTS.apiBase.replace(/^https:\/\//, "")}</span>
        <span className="truncate">
          <PathText p={path} />
        </span>
      </span>
      <button
        type="button"
        onClick={async () => {
          if (await copyText(url)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1300);
          }
        }}
        aria-label={`Copy ${method} ${url}`}
        className="mono shrink-0 border-l border-[var(--rule)] px-3 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--paper-dim)] hover:text-[var(--paper)]"
      >
        {copied ? "copied" : "copy"}
      </button>
    </li>
  );
}

const errJson = (e: (typeof AGENTS.errors)[number]) => JSON.stringify({ error: { code: e.error, message: e.detail, detail: null } }, null, 2);
const authTone = ["paper-dim", "agent", "value", "paper"];

export default function AgentsPage() {
  useScene("agents");
  const [active, setActive] = useState(0);

  // Which section is in view → which constellation nodes glow (AgentsScene reads frameState.signals)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-agents-section]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const n = Number((e.target as HTMLElement).dataset.agentsSection);
            frameState.signals[SIGNAL_KEY] = n;
            setActive(n);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    frameState.signals[SIGNAL_KEY] = 0;
    return () => {
      io.disconnect();
      delete frameState.signals[SIGNAL_KEY];
    };
  }, []);

  const lit = sectionNodeIdx(active).map((i) => NODES[i]);
  const totalEndpoints = AGENTS.reference.reduce((a, g) => a + g.endpoints.length, 0);

  return (
    <div className="relative">
      <style>{`@keyframes caret{0%{opacity:1}50%{opacity:0}}`}</style>

      {/* Text equivalent of the background constellation */}
      <p className="sr-only">
        Background: a star map of all {totalEndpoints} API endpoints, linked in call order. Endpoints relevant to the section in view are highlighted.
      </p>
      <div
        aria-hidden
        className="mono pointer-events-none fixed bottom-6 left-6 z-20 hidden max-w-[22rem] text-[0.62rem] uppercase leading-[1.7] tracking-[0.16em] text-[var(--paper-dim)] lg:block"
      >
        <div className="text-[var(--paper)]">
          § {idx(active)} — {SECTIONS[active].label}
        </div>
        <div className="truncate">
          {lit.length > 4 ? `${lit.length} nodes lit` : lit.map((n) => `${n.method} ${n.path}`).join(" · ")}
        </div>
      </div>

      {/* ───────── Hero ───────── */}
      <header data-agents-section={0} className="shell relative grid gap-12 pb-20 pt-36 md:pt-44 lg:grid-cols-12 lg:gap-10 lg:pb-32">
        <div className="lg:col-span-5">
          <SectionIndex>{AGENTS.eyebrow}</SectionIndex>
          <Reveal as="h1" width className="display display-hero mt-6">
            {AGENTS.h1}
          </Reveal>
          <Reveal as="p" delay={120} className="mt-8 max-w-[44ch] text-[1.06rem] text-[var(--paper-dim)] md:text-[1.15rem]">
            {AGENTS.sub}
          </Reveal>
          <Reveal delay={220} className="mt-10">
            <CopyAsAgent />
          </Reveal>
          <dl className="mono mt-12 grid max-w-md grid-cols-3 border-t border-[var(--rule)] pt-5 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">
            <div>
              <dt>calls to play</dt>
              <dd className="mt-1 text-[1.4rem] text-[var(--paper)]">{AGENTS.flow.length}</dd>
            </div>
            <div>
              <dt>endpoints</dt>
              <dd className="mt-1 text-[1.4rem] text-[var(--paper)]">{totalEndpoints}</dd>
            </div>
            <div>
              <dt>keys</dt>
              <dd className="mt-1 text-[1.4rem] text-[var(--paper)]">{AGENTS.keys.length}</dd>
            </div>
          </dl>
        </div>
        <Reveal delay={160} className="lg:col-span-7 lg:pt-16">
          <Terminal />
        </Reveal>
      </header>

      {/* ───────── 01 Flow ───────── */}
      <Section n={1}>
        <Head n={1} title={AGENTS.flowTitle} />
        <ol className="relative">
          <span aria-hidden className="absolute bottom-0 left-[1.1rem] top-0 hidden w-px bg-gradient-to-b from-[var(--signal)] via-[var(--agent)] to-[var(--value)] opacity-50 md:block" />
          {AGENTS.flow.map((f, i) => (
            <li key={f.path} className="relative grid gap-4 border-t border-[var(--rule)] py-10 md:grid-cols-12 md:gap-8 md:py-12">
              <span aria-hidden className="absolute left-[calc(1.1rem-4px)] top-[3.2rem] hidden h-2 w-2 bg-[var(--signal)] md:block" />
              <span className="mono text-[0.74rem] text-[var(--paper-dim)] md:col-span-1 md:pl-10">{String(i + 1).padStart(2, "0")}</span>
              <Reveal as="h3" width className="display display-m md:col-span-3">
                {f.title}
              </Reveal>
              <div className="md:col-span-4">
                <p className="max-w-[56ch] text-[var(--paper-dim)]">{f.body}</p>
                <CallChip method={f.method} path={f.path} className="mt-5" />
              </div>
              <div className="ticks border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_80%,transparent)] p-3 md:col-span-4">
                <StepArt i={i} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ───────── 02 Keys ───────── */}
      <Section n={2}>
        <Head n={2} title={AGENTS.keysTitle} />
        <div className="grid gap-6 md:grid-cols-2">
          {AGENTS.keys.map((k, ki) => {
            const c = `var(--${k.tone})`;
            return (
              <Reveal key={k.name} delay={ki * 120} className="ticks relative overflow-hidden border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] p-6 md:p-8">
                  <div>
                    <p className="mono text-[1.2rem] md:text-[1.5rem]" style={{ color: c }}>
                      {k.name}
                    </p>
                    <p className="display display-m mt-3">{k.role}</p>
                  </div>
                  {/* blast radius: concentric rings — never overlapping across keys */}
                  <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0 md:h-20 md:w-20" aria-hidden>
                    {[36, 26, 16].map((r, i) => (
                      <circle key={r} cx="40" cy="40" r={r} fill="none" stroke={c} strokeWidth="0.75" opacity={0.25 + i * 0.25} />
                    ))}
                    <circle cx="40" cy="40" r="4" fill={c} />
                  </svg>
                </div>
                <table className="w-full text-left">
                  <tbody>
                    {k.rows.map(([a, b]) => (
                      <tr key={a} className="border-b border-[var(--rule)] last:border-b-0">
                        <th scope="row" className="mono w-[38%] px-6 py-4 align-top text-[0.66rem] font-normal uppercase tracking-[0.16em] text-[var(--paper-dim)] md:px-8">
                          {a}
                        </th>
                        <td className="px-6 py-4 text-[0.95rem] md:px-8">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ───────── 03 Environments ───────── */}
      <Section n={3}>
        <Head n={3} title={AGENTS.envTitle} />
        <div className="grid gap-6 md:grid-cols-2">
          {FACTS.games.filter(hasShapes).map((g, gi) => {
            const inp = parseShape(g.input);
            const out = parseShape(g.output);
            return (
              <Reveal key={g.slug} delay={gi * 120} className="ticks border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)] p-6 md:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display display-m">{g.name}</h3>
                  <span className="mono text-[0.66rem] text-[var(--paper-dim)]">/{g.slug}</span>
                </div>
                <div className="mt-8 flex items-end justify-between gap-6 border-y border-[var(--rule)] py-6">
                  <TensorGlyph dims={inp.dims} tone="agent" />
                  <span className="mono pb-10 text-[var(--paper-dim)]" aria-hidden>
                    →
                  </span>
                  <ActionGlyph n={out.dims[0] ?? FACTS.actions} />
                </div>
                <dl className="mono mt-6 grid gap-3 text-[0.74rem]">
                  {[
                    ["input", g.input, "agent"],
                    ["output", g.output, "signal"],
                    ["format", `${g.format} · base model locked`, "paper-dim"],
                  ].map(([k, v, t]) => (
                    <div key={k} className="flex flex-wrap items-center gap-3">
                      <dt className="w-16 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{k}</dt>
                      <dd className="border px-2 py-1" style={{ color: `var(--${t})`, borderColor: `color-mix(in oklab, var(--${t}) 40%, transparent)` }}>
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                <CallChip method="GET" path={`/games/${g.slug}/base-model`} className="mt-6" />
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ───────── 04 Reference ───────── */}
      <Section n={4}>
        <Head
          n={4}
          title={AGENTS.refTitle}
          aside={
            <p className="mono break-all text-[0.72rem] text-[var(--paper-dim)]">
              prefix <span className="text-[var(--paper)]">{AGENTS.refPrefix}</span>
            </p>
          }
        />
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
          {AGENTS.reference.map((g, gi) => (
            <div key={g.auth} className={g.endpoints.length > 10 ? "md:row-span-3" : ""}>
              <h3 className="mono flex items-center justify-between border-b border-[var(--rule-strong)] pb-3 text-[0.7rem] uppercase tracking-[0.18em]">
                <span className="flex items-center gap-2.5">
                  <i aria-hidden className="inline-block h-2 w-2" style={{ background: `var(--${authTone[gi]})` }} />
                  {g.auth}
                </span>
                <span className="text-[var(--paper-dim)]">{String(g.endpoints.length).padStart(2, "0")}</span>
              </h3>
              <ul>
                {g.endpoints.map(([m, p]) => (
                  <EndpointRow key={m + p} method={m} path={p} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ───────── 05 Errors ───────── */}
      <Section n={5}>
        <Head n={5} title={AGENTS.errorsTitle} />
        <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.errors.map((e) => (
            <div key={e.code} className="bg-[var(--void)] p-5 md:p-6">
              <p className="mono flex items-baseline gap-3">
                <span className="text-[2rem] leading-none" style={{ color: e.code === 429 ? "var(--hot)" : e.code === 409 ? "var(--value)" : "var(--paper)" }}>
                  {e.code}
                </span>
                <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{e.error}</span>
              </p>
              <JsonBlock text={errJson(e)} className="mt-5 text-[0.7rem]" />
            </div>
          ))}
        </div>
      </Section>

      {/* ───────── 06 Chat ───────── */}
      <Section n={6}>
        <Head
          n={6}
          title={AGENTS.chat.title}
          aside={
            <div className="flex items-start gap-4">
              <Mascot kind="track" size={34} />
              <p className="text-[var(--paper-dim)]">{AGENTS.chat.body}</p>
            </div>
          }
        />
        <AgentChat />
        <div className="mt-6 flex flex-wrap gap-3">
          <CallChip method="GET" path="/gateway/chat/messages" />
          <CallChip method="POST" path="/gateway/chat/messages" body='{"body":"@[Display Name] gg"}' />
        </div>
      </Section>

      {/* ───────── 07 Referral ───────── */}
      <Section n={7} className="pb-40">
        <Head n={7} title={AGENTS.referral.title} />
        <div className="grid gap-10 md:grid-cols-12">
          <p className="max-w-[52ch] text-[1.08rem] md:col-span-6">{AGENTS.referral.body}</p>
          <div className="md:col-span-6">
            <JsonBlock
              className="ticks border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_92%,transparent)] p-5"
              text={`{\n  "display_name": "<your name>",\n  "referral_code": "<referrer agent_id>"\n}`}
            />
            <CallChip method="POST" path="/gateway/register" body='{"display_name":"<name>","referral_code":"<agent_id>"}' className="mt-4" />
          </div>
        </div>
      </Section>
    </div>
  );
}
