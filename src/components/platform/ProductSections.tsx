import Link from "next/link";
import { Button, Card, FadeIn, Note, StatusBadge } from "@/components/v2/kit";
import { cardClass } from "@/components/v2/surface";
import { CONCEPTS, ECOSYSTEM, REG_NOTE, type Concept } from "@/content/site";
import ProductCard from "./ProductCard";
import { DIM_TONE, STATUS_MEANING, STATUS_TONE, conceptsOf, dimensionOf, layerIndexOf, needsRegNote, neighbours } from "./data";

/** Small eyebrow + title used inside product sections (keeps h2 hierarchy consistent). */
export function Heading({ eyebrow, title, lead, tone = "var(--signal)" }: { eyebrow: string; title: string; lead?: string; tone?: string }) {
  return (
    <FadeIn className="max-w-3xl">
      <p className="eyebrow" style={{ color: tone }}>
        {eyebrow}
      </p>
      <h2 className="mt-4 text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{title}</h2>
      {lead && <p className="mt-4 text-[1.02rem] leading-relaxed text-[var(--paper-dim)]">{lead}</p>}
    </FadeIn>
  );
}

/** "At a glance" strip under the hero — answers what / where / status in one row. */
export function AtAGlance({ c }: { c: Concept }) {
  const d = dimensionOf(c);
  const li = layerIndexOf(c.slug);
  const cells = [
    { k: "What it is", v: c.short },
    { k: "Dimension", v: d.title, tone: DIM_TONE[c.dimension] },
    { k: "Ecosystem layer", v: `${String(li + 1).padStart(2, "0")} · ${ECOSYSTEM.layers[li]?.label}` },
    { k: "Status", v: STATUS_MEANING[c.status], tone: STATUS_TONE[c.status] },
  ];
  return (
    <FadeIn>
      <dl className={`grid grid-cols-1 divide-y divide-[var(--rule)] overflow-hidden sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 ${cardClass({ pad: false })}`}>
        {cells.map((x, i) => (
          <div key={x.k} className={`px-6 py-5 ${i % 2 === 1 ? "sm:border-l sm:border-[var(--rule)]" : ""} ${i >= 2 ? "sm:border-t sm:border-[var(--rule)] lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <dt className="mono text-[0.66rem] tracking-[0.14em] text-[var(--paper-dim)]">{x.k.toUpperCase()}</dt>
            <dd className="mt-1.5 text-[0.98rem] font-medium leading-snug" style={{ color: x.tone ?? "var(--paper)" }}>
              {x.v}
            </dd>
          </div>
        ))}
      </dl>
    </FadeIn>
  );
}

/** The 3 how-it-works steps. */
export function Steps({ c }: { c: Concept }) {
  return (
    <ol className="mt-10 border-b border-[var(--rule)]">
      {c.how.map((s, i) => (
        <li key={i}>
          <FadeIn delay={i * 80}>
            <div className="flex items-center gap-5 border-t border-[var(--rule)] py-5">
              <span className="mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--signal)]/40 bg-[var(--signal)]/[0.06] text-[0.78rem] text-[var(--signal)]">
                {i + 1}
              </span>
              <p className="text-[1.02rem] font-medium leading-snug">{s}</p>
            </div>
          </FadeIn>
        </li>
      ))}
    </ol>
  );
}

export function Features({ c }: { c: Concept }) {
  return (
    <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
      {c.features.map((f, i) => (
        <FadeIn key={f} delay={(i % 3) * 60} className="h-full">
          <div className="flex h-full items-start gap-3 border-t border-[var(--rule)] py-5">
            <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DIM_TONE[c.dimension] }} />
            <p className="text-[0.98rem] leading-snug">{f}</p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

export function Revenue({ c }: { c: Concept }) {
  return (
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {c.revenue.map((r, i) => (
        <FadeIn key={r} delay={(i % 3) * 60} className="h-full">
          <div className="flex h-full items-start gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--value)_22%,var(--rule))] bg-[color-mix(in_oklab,var(--value)_4%,var(--deck))] px-5 py-5">
            <span className="mono shrink-0 pt-0.5 text-[0.72rem] text-[var(--value)]">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-[0.98rem] leading-snug">{r}</p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

/** Notes: product note, REG_NOTE where regulated revenue appears, roadmap honesty line. */
export function Notes({ c }: { c: Concept }) {
  const notes: string[] = [];
  if (c.note) notes.push(c.note);
  if (needsRegNote(c)) notes.push(REG_NOTE);
  if (c.status === "ROADMAP") notes.push(`${c.name} is on the roadmap and not live yet. The revenue lines above describe the intended model.`);
  if (!notes.length) return null;
  return (
    <FadeIn className="mt-8 grid gap-3 md:grid-cols-2">
      {notes.map((n) => (
        <Note key={n}>{n}</Note>
      ))}
    </FadeIn>
  );
}

/** Where this product sits in the ecosystem + upstream / downstream products. */
export function ConnectsTo({ c }: { c: Concept }) {
  const li = layerIndexOf(c.slug);
  const layers = ECOSYSTEM.layers;
  type Group = { label: string; sub: string; items: Concept[] };
  const groups = ([
    li > 0 && { label: `Feeds ${c.name}`, sub: layers[li - 1].label, items: conceptsOf(layers[li - 1].concepts) },
    { label: "Same layer", sub: layers[li].label, items: conceptsOf(layers[li].concepts).filter((x) => x.slug !== c.slug) },
    li < layers.length - 1 && { label: `Built on ${c.name}`, sub: layers[li + 1].label, items: conceptsOf(layers[li + 1].concepts) },
  ] as (Group | false)[]).filter((g): g is Group => !!g && g.items.length > 0);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-12">
      {/* mini stack */}
      <FadeIn className="lg:col-span-4">
        <ol className="space-y-1 lg:sticky lg:top-28">
          {layers.map((l, i) => {
            const on = i === li;
            const near = Math.abs(i - li) === 1;
            return (
              <li key={l.label}>
                <div
                  className="border-l-2 py-2 pl-4 transition-colors"
                  style={{
                    borderColor: on ? "var(--signal)" : "var(--rule-strong)",
                    opacity: on || near ? 1 : 0.55,
                  }}
                >
                  <p className="mono text-[0.62rem] tracking-[0.14em] text-[var(--paper-dim)]">LAYER {String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-0.5 text-[0.95rem] font-semibold">{l.label}</p>
                  {on && <p className="mono mt-1 text-[0.72rem] text-[var(--signal)]">● {c.name} sits here</p>}
                </div>
                {i < layers.length - 1 && (
                  <p aria-hidden className="mono py-0.5 pl-[18px] text-[0.7rem] text-[var(--paper-dim)]">
                    ↓
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </FadeIn>
      {/* related */}
      <div className="space-y-8 lg:col-span-8">
        {groups.map((g) => (
          <div key={g.label}>
            <FadeIn>
              <p className="text-[1rem] font-semibold">{g.label}</p>
              <p className="mono mt-0.5 text-[0.72rem] text-[var(--paper-dim)]">{g.sub}</p>
            </FadeIn>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {g.items.map((x, j) => (
                <FadeIn key={x.slug} delay={j * 50} className="h-full">
                  <ProductCard c={x} compact surface="void" />
                </FadeIn>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Prev / next product + closing CTA. */
export function ProductNav({ c }: { c: Concept }) {
  const { prev, next } = neighbours(c.slug);
  const link = (x: Concept, dir: "prev" | "next") => (
    <Link
      href={`/platform/${x.slug}`}
      className={`group flex flex-col items-start gap-2 ${cardClass({ interactive: true })} hover:bg-[var(--deck-raise)] ${dir === "next" ? "sm:items-end sm:text-right" : ""}`}
    >
      <span className="mono text-[0.7rem] tracking-[0.14em] text-[var(--paper-dim)]">{dir === "prev" ? "← PREVIOUS" : "NEXT →"}</span>
      <span className="text-[1.1rem] font-semibold transition-colors group-hover:text-[var(--signal)]">
        <span className="mono mr-2 text-[0.8rem] text-[var(--paper-dim)]">{x.n}</span>
        {x.name}
      </span>
      <StatusBadge status={x.status} />
    </Link>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {link(prev, "prev")}
        {link(next, "next")}
      </div>
      <FadeIn className="mt-16">
        <Card className="!p-8 md:!p-10" glow="var(--value)">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="eyebrow !text-[var(--value)]">ONE OF {CONCEPTS.length} PRODUCTS</p>
              <h2 className="mt-3 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-[-0.015em]">See how {c.name} fits the business model.</h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
              <Button href="/business-model">Business model</Button>
              <Button href="/platform" variant="secondary">
                All products
              </Button>
            </div>
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
