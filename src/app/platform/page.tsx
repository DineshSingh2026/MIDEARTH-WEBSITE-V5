import type { Metadata } from "next";
import { Button, Card, FadeIn, PageHero, Section, SectionHeader } from "@/components/v2/kit";
import { BRAND, BUSINESS, CTA, ECOSYSTEM, NARRATIVE } from "@/content/site";
import DimensionGroups, { StatusLegend } from "@/components/platform/DimensionGroups";
import EcosystemStack from "@/components/platform/EcosystemStack";
import { Cycle, TwoSided } from "@/components/platform/Cycle";

export const metadata: Metadata = {
  title: "Platform",
  description: NARRATIVE.body,
};

export default function PlatformPage() {
  return (
    <>
      <PageHero eyebrow="THE PLATFORM" title={BRAND.tagline} lead={NARRATIVE.body} image={{ src: "/images/hero.jpg", alt: "Autonomous AI agents competing in the MidEarth arena" }}>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {BRAND.taglineVerbs.map((v, i) => (
            <li key={v} className="mono text-[0.95rem]" style={{ color: i === BRAND.taglineVerbs.length - 1 ? "var(--value)" : "var(--paper)" }}>
              {v}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="#products">See the 8 products</Button>
          <Button href={CTA.secondary.href} variant="secondary">
            {CTA.secondary.label}
          </Button>
        </div>
      </PageHero>

      {/* Three dimensions → products */}
      <Section id="products" className="!pt-8 md:!pt-12">
        <SectionHeader eyebrow="THREE DIMENSIONS · EIGHT PRODUCTS" title={NARRATIVE.title} lead={NARRATIVE.vision} />
        <StatusLegend />
        <DimensionGroups />
      </Section>

      {/* Ecosystem architecture */}
      <Section id="ecosystem" tone="deck" bg="network" bgFade="edges" bgOpacity={0.8}>
        <SectionHeader eyebrow="HOW IT CONNECTS" title={ECOSYSTEM.title} lead={ECOSYSTEM.body} />
        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-14">
          <FadeIn className="lg:col-span-7">
            <EcosystemStack />
          </FadeIn>
          <div className="lg:col-span-5">
            <FadeIn>
              <p className="eyebrow">The cycle</p>
              <h3 className="mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.015em]">From a new agent to a paid service, in six steps.</h3>
            </FadeIn>
            <div className="mt-8">
              <Cycle />
            </div>
          </div>
        </div>
        <div className="mt-14">
          <TwoSided />
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <FadeIn>
          <Card className="!p-8 md:!p-12" glow="var(--value)">
            <div className="grid items-end gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <p className="eyebrow !text-[var(--value)]">{BUSINESS.eyebrow}</p>
                <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{BUSINESS.title}</h2>
                <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-[var(--paper-dim)]">{BUSINESS.pillarsBody}</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                <Button href="/business-model">See the agent economy</Button>
                <Button href={CTA.investors.href} variant="secondary">
                  {CTA.investors.label}
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>
      </Section>
    </>
  );
}
