"use client";
import { ARENA, DEVELOPERS, SIGNAL } from "@/content/site";
import { FACTS, hasShapes } from "@/content/facts";
import { Card, FadeIn, StatusBadge, cardClass } from "@/components/v2/kit";
import { CallChip } from "@/components/ui/primitives";
import { Icon, IconTile } from "@/components/labs2/icons";

/* ── Two keys model ── */
export function Keys() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-2">
      {DEVELOPERS.keys.map((k, i) => {
        const c = `var(--${k.tone})`;
        return (
          <FadeIn key={k.name} delay={i * 80} className="h-full">
            <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-8">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-80" style={{ background: `linear-gradient(90deg, ${c}, transparent 75%)` }} />
              <div className="flex items-center gap-3">
                <IconTile name={k.tone === "agent" ? "gamepad" : "coin"} tone={k.tone} />
                <div>
                  <p className="mono text-[0.95rem] font-medium" style={{ color: c }}>
                    {k.name}
                  </p>
                  <p className="text-[0.85rem] text-[var(--paper-dim)]">{k.role}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 border-t border-[var(--rule)] pt-5">
                {k.rows.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-[0.95rem]">
                    <Icon name="check" size={16} className="mt-[3px] shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        );
      })}
      <FadeIn delay={160} className="md:col-span-2">
        <div className="mt-4 flex flex-col gap-4 border-l-2 border-[color-mix(in_oklab,var(--hot)_45%,var(--rule))] py-1 pl-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-[1.1rem] font-semibold">{ARENA.humans.title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--paper-dim)]">{ARENA.humans.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
            {ARENA.humans.scope.map((s) => (
              <li
                key={s}
                className="mono rounded-full border px-2.5 py-1 text-[0.7rem]"
                style={s.startsWith("write") ? { color: "var(--hot)", borderColor: "color-mix(in oklab, var(--hot) 40%, transparent)" } : { color: "var(--paper-dim)", borderColor: "var(--rule-strong)" }}
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}

/* ── Resources ── */
const RES_ICONS = ["doc", "api", "globe"];
export function Resources() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {DEVELOPERS.sdk.map((r, i) => (
        <FadeIn key={r.title} delay={i * 70} className="h-full">
          <a
            href={r.href}
            target={/^https?:/.test(r.href) ? "_blank" : undefined}
            rel="noreferrer"
            className={`group flex h-full flex-col ${cardClass({ surface: "void", interactive: true })} hover:bg-[var(--deck-raise)]`}
          >
            <IconTile name={RES_ICONS[i] ?? "doc"} tone="agent" />
            <h3 className="mono mt-5 text-[1.05rem] font-medium">{r.title}</h3>
            <p className="mt-2 flex-1 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{r.body}</p>
            <p className="mono mt-5 truncate text-[0.72rem] text-[var(--signal)]">
              {r.href.replace(/^https?:\/\//, "")} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </a>
        </FadeIn>
      ))}
    </div>
  );
}

/* ── Environments: tensor contracts per game ── */
export function Environments() {
  return (
    <>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FACTS.games.map((g, i) => {
          const desc = ARENA.games.find((a) => a.name === g.name)?.body;
          if (!hasShapes(g))
            return (
              <FadeIn key={g.slug} delay={i * 80} className="h-full">
                <Card className="flex h-full flex-col !p-0">
                  <div className="p-6 md:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[1.2rem] font-semibold">{g.name}</h3>
                      <StatusBadge status={SIGNAL.status} />
                    </div>
                    {desc && <p className="mt-3 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{desc}</p>}
                  </div>
                  <div className="mt-auto border-t border-[var(--rule)] bg-[color-mix(in_oklab,var(--void)_45%,transparent)] p-5 md:p-7">
                    <p className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{g.format} policy · tensor contract</p>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--paper)]">{SIGNAL.shapes}</p>
                    <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--paper-dim)]">Local testing: NumPy test mode and a viewer for match replay.</p>
                  </div>
                </Card>
              </FadeIn>
            );
          return (
            <FadeIn key={g.slug} delay={i * 80} className="h-full">
              <Card className="flex h-full flex-col !p-0">
                <div className="p-6 md:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[1.2rem] font-semibold">{g.name}</h3>
                    <span className="mono rounded-full border border-[var(--rule-strong)] px-2.5 py-0.5 text-[0.64rem] tracking-[0.1em] text-[var(--paper-dim)]">{g.format}</span>
                  </div>
                  {desc && <p className="mt-3 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{desc}</p>}
                </div>
                <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[var(--rule)] bg-[color-mix(in_oklab,var(--void)_45%,transparent)] p-5 md:gap-5 md:p-7">
                  <Tensor label="input" value={g.input} />
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="mono rounded-md border border-[color:color-mix(in_oklab,var(--agent)_45%,transparent)] px-2 py-1.5 text-[0.68rem] text-[var(--agent)]">model</span>
                    <span aria-hidden className="text-[var(--paper-dim)]">→</span>
                  </div>
                  <Tensor label="output" value={g.output} out />
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
      <FadeIn className="mt-6 flex flex-wrap items-center gap-3 text-[0.88rem] text-[var(--paper-dim)]">
        <span>List every game and its base architecture:</span>
        <CallChip method="GET" path="/games" className="rounded-md pointer-coarse:min-h-11 pointer-coarse:items-stretch pointer-coarse:[&>span]:flex pointer-coarse:[&>span]:items-center" />
      </FadeIn>
    </>
  );
}

function Tensor({ label, value, out }: { label: string; value: string; out?: boolean }) {
  const [name, shape] = value.split(": ");
  return (
    <div className="min-w-0">
      <div aria-hidden className="relative mb-3 h-12">
        {out ? (
          <div className="flex h-full items-end gap-1.5">
            {[0.55, 0.85, 0.4].map((h, i) => (
              <span key={i} className="w-3 rounded-sm bg-[color:color-mix(in_oklab,var(--signal)_70%,transparent)]" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        ) : (
          [0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="grid-bg absolute h-9 w-9 rounded-[4px] border border-[color:color-mix(in_oklab,var(--agent)_40%,transparent)] bg-[var(--deck)]"
              style={{ left: i * 6, top: 12 - i * 3, opacity: 0.45 + i * 0.13 }}
            />
          ))
        )}
      </div>
      <p className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--paper-dim)]">{label}</p>
      <p className="mono mt-1 break-all text-[0.74rem] text-[var(--paper)] md:text-[0.8rem]">{name}</p>
      <p className="mono text-[0.86rem] md:text-[0.95rem]" style={{ color: out ? "var(--signal)" : "var(--agent)" }}>
        {shape}
      </p>
    </div>
  );
}
