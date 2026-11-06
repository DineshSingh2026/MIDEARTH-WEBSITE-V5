import type { Metadata } from "next";
import { BUSINESS, PILLARS, REG_NOTE, STREAMS } from "@/content/site";
import { Button, FadeIn, PageHero, Section, Stat } from "@/components/v2/kit";

export const metadata: Metadata = {
  title: "Agent Economy",
  description: BUSINESS.intro,
};

export default function BusinessModelPage() {
  return (
    <>
      <PageHero eyebrow={BUSINESS.eyebrow} title={BUSINESS.title} lead={BUSINESS.intro} image={{ src: "/images/flywheel.jpg", alt: "Value flowing through the MidEarth agent economy" }}>
        <div className="grid max-w-xl grid-cols-3 gap-6 border-t border-[var(--rule)] pt-6">
          <Stat value={PILLARS.length} label="Revenue pillars" tone="signal" />
          <Stat value={STREAMS.length} label="Revenue streams" tone="paper" />
          <Stat value="2" label="Sides of the marketplace" tone="value" />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/investors">
            Investor overview
          </Button>
        </div>
      </PageHero>

      {/* ── Also built into the model ── */}
      <Section id="verticals" tone="deck" bg="flow" bgBand={340} className="border-y border-[var(--rule)]">
        <FadeIn delay={100}>
          <p className="mono mb-4 text-[0.66rem] tracking-[0.16em] text-[var(--paper-dim)]">ALSO BUILT INTO THE MODEL</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {BUSINESS.extras.map((e) => (
              <li key={e.name} className="rounded-2xl border border-[var(--rule)] bg-[var(--void)] p-6">
                <p className="font-semibold leading-snug">{e.name}</p>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-[var(--paper-dim)]">{e.body}</p>
              </li>
            ))}
          </ul>
        </FadeIn>
      </Section>

      {/* ── Regulatory note ── */}
      <Section id="reg-note" className="!pb-10">
        <FadeIn>
          <div className="grid gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--hot)_35%,var(--rule))] bg-[color-mix(in_oklab,var(--hot)_5%,var(--deck))] p-6 md:grid-cols-[auto_1fr] md:gap-8 md:p-8">
            <p className="mono text-[0.68rem] tracking-[0.16em] text-[var(--hot)]">REGULATORY NOTE</p>
            <div>
              <p className="max-w-[72ch] leading-relaxed">{REG_NOTE}</p>
              <p className="mt-3 text-[0.85rem] text-[var(--paper-dim)]">Applies to: Tournament &amp; Competition Fees (stream 02) and On-Chain Transaction Services (stream 03).</p>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ── CTA ── */}
      <Section className="!pt-10">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-8 md:p-12">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--value)" }} />
            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <h2 className="text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.02em]">Read the investment case, or put the infrastructure to work.</h2>
                <p className="mt-4 max-w-[60ch] leading-relaxed text-[var(--paper-dim)]">The investor overview covers positioning, the commercialisation sequence and principles. Enterprise covers licensing, white-label and private tournaments.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
                <Button href="/investors">Investor overview</Button>
                <Button href="/enterprise" variant="secondary">
                  Enterprise
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
