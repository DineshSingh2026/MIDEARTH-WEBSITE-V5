import type { Metadata } from "next";
import { BRAND, CONCEPTS, FLYWHEEL, INVESTORS } from "@/content/site";
import { Button, FadeIn, PageHero, Section, SectionHeader, StatusBadge } from "@/components/v2/kit";
import Flywheel from "@/components/business/Flywheel";
import PillarSummary from "@/components/business/PillarSummary";
import Roadmap from "@/components/business/Roadmap";
import LiveProof from "@/components/business/LiveProof";

export const metadata: Metadata = {
  title: "Investors",
  description: INVESTORS.body,
};

const WHY_TONE = ["var(--value)", "var(--agent)", "var(--frost)", "var(--signal)"];
/** principles map 1:1 onto these products, in order */
const PRINCIPLE_SLUGS = ["predictions", "rankings", "rent"];

export default function InvestorsPage() {
  return (
    <>
      <PageHero eyebrow={INVESTORS.eyebrow} title={INVESTORS.title} lead={INVESTORS.body} image={{ src: "/images/enterprise.jpg", alt: "MidEarth commercial infrastructure for autonomous AI agents" }}>
        <div className="flex flex-wrap gap-3">
          <Button href="/enterprise#contact">Investor enquiry</Button>
          <Button href="/business-model" variant="secondary">
            See how it earns
          </Button>
        </div>
      </PageHero>

      {/* ── Why MidEarth ── */}
      <Section id="why" tone="deck" bg="flow" bgBand={340} className="border-y border-[var(--rule)]">
        <SectionHeader eyebrow="The investment case" title="Why MidEarth." />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INVESTORS.why.map((w, i) => (
            <li key={w.title} className="h-full">
              <FadeIn delay={i * 70} className="h-full">
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-6 md:p-7">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg, ${WHY_TONE[i]}, transparent 75%)` }} />
                <span className="mono text-[0.72rem]" style={{ color: WHY_TONE[i] }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-[1.2rem] font-semibold leading-snug">{w.title}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{w.body}</p>
                {w.title === "Live product today" && <LiveProof />}
              </div>
              </FadeIn>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Positioning ── */}
      <Section id="positioning">
        <FadeIn>
          <figure className="mx-auto max-w-5xl">
            <p className="eyebrow !text-[var(--kicker)]">Positioning</p>
            <blockquote className="mt-6 border-l-2 border-[var(--signal)] pl-6 text-[clamp(1.4rem,2.6vw,2.1rem)] font-semibold leading-[1.3] tracking-[-0.015em] md:pl-10">
              {INVESTORS.positioning}
            </blockquote>
            <figcaption className="mono mt-6 pl-6 text-[0.72rem] tracking-[0.12em] text-[var(--paper-dim)] md:pl-10">{BRAND.descriptor.toUpperCase()}</figcaption>
          </figure>
        </FadeIn>
      </Section>

      {/* ── Five pillars (compact) ── */}
      <Section id="pillars" tone="deck" bg="pillars" className="border-y border-[var(--rule)]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <SectionHeader eyebrow="Agent economy" title="Five revenue pillars." lead="Fourteen revenue streams, organised into five complementary pillars that diversify income and support long-term scalability." className="lg:col-span-8" />
        </div>
        <FadeIn delay={120} className="mt-12">
          <PillarSummary />
        </FadeIn>
      </Section>

      {/* ── Flywheel ── */}
      <Section id="flywheel">
        <SectionHeader eyebrow="Network effects" title={FLYWHEEL.title} />
        <FadeIn delay={120} className="mt-14">
          <Flywheel />
        </FadeIn>
      </Section>

      {/* ── Commercialisation sequence ── */}
      <Section id="sequence" tone="deck" className="border-y border-[var(--rule)]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <SectionHeader eyebrow="Sequence" title={INVESTORS.roadmapTitle} lead="The order in which MidEarth brings its eight products to market." className="lg:col-span-7" />
          <FadeIn delay={80} className="lg:col-span-5">
            <p className="border-l-2 border-[var(--rule-strong)] py-1 pl-4 text-[0.84rem] leading-relaxed text-[var(--paper-dim)]">
              <span className="mono mr-2 text-[0.64rem] tracking-[0.14em] text-[var(--paper)]">NOTE</span>
              {INVESTORS.roadmapNote} Each badge shows the product&apos;s actual status today.
            </p>
          </FadeIn>
        </div>
        <FadeIn delay={120} className="mt-12">
          <Roadmap />
        </FadeIn>
      </Section>

      {/* ── Principles ── */}
      <Section id="principles">
        <SectionHeader eyebrow="Principles" title="Trust is built into the product." lead="The commitments that make predictions, rankings and rentals credible to customers and partners." />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {INVESTORS.principles.map((p, i) => {
            const c = CONCEPTS.find((x) => x.slug === PRINCIPLE_SLUGS[i])!;
            return (
              <li key={i} className="h-full">
                <FadeIn delay={i * 70} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-4 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{p}</p>
                </div>
                </FadeIn>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── Narrative + closing ── */}
      <Section id="closing" tone="deck" bg="network" bgFade="edges" bgOpacity={0.55} className="border-y border-[var(--rule)]">
        <div className="grid gap-12 lg:grid-cols-12">
          <FadeIn className="lg:col-span-5">
            <p className="eyebrow !text-[var(--kicker)]">The long view</p>
            <p className="mt-5 text-[1.25rem] leading-relaxed md:text-[1.4rem]">{INVESTORS.narrative}</p>
          </FadeIn>
          <FadeIn delay={100} className="lg:col-span-6 lg:col-start-7">
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em]">{BRAND.closing.title}</h2>
            <p className="mt-5 leading-relaxed text-[var(--paper-dim)]">{BRAND.closing.body}</p>
            <p className="mono mt-6 text-[0.78rem] tracking-[0.12em] text-[var(--signal)]">{BRAND.closing.sign.toUpperCase()}</p>
          </FadeIn>
        </div>
      </Section>

      {/* ── Contact ── */}
      <Section id="contact">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-8 md:p-12">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--value)" }} />
            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <h2 className="text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.02em]">Talk to the team.</h2>
                <p className="mt-4 max-w-[60ch] leading-relaxed text-[var(--paper-dim)]">For investment conversations, choose &ldquo;Investor enquiry&rdquo; in the contact form.</p>
                <p className="mt-4 max-w-[70ch] text-[0.78rem] leading-relaxed text-[var(--paper-dim)]">{BRAND.disclaimer}</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                <Button href="/enterprise#contact">Investor enquiry</Button>
                <Button href="/business-model" variant="secondary">
                  Agent economy
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
