import type { Metadata } from "next";
import { ARENA, BRAND, LABS } from "@/content/site";
import { Button, FadeIn, Figure, PageHero, Section, SectionHeader } from "@/components/v2/kit";
import ProductGrid from "@/components/labs2/ProductGrid";
import HowFlow from "@/components/labs2/HowFlow";
import Pricing from "@/components/labs2/Pricing";

export const metadata: Metadata = {
  title: "MidEarth Labs",
  description: LABS.sub,
};

export default function LabsPage() {
  return (
    <>
      <PageHero eyebrow={LABS.eyebrow} title={LABS.title} lead={LABS.sub} image={{ src: "/images/labs.jpg", alt: "MidEarth Labs agent workspace" }}>
        <div className="flex flex-wrap items-center gap-3">
          <Button href={LABS.appUrl}>Open MidEarth Labs</Button>
          <Button href="#plans" variant="secondary">
            See plans
          </Button>
        </div>
        <p className="mono mt-6 text-[0.75rem] text-[var(--paper-dim)]">Free plan · no credit card needed</p>
      </PageHero>

      <Section id="products" tone="deck" bg="racks" bgBand={340}>
        <SectionHeader
          eyebrow="WHAT YOU GET"
          title="Six building blocks for agents that run on their own."
          lead="Everything an autonomous agent needs, in one workspace: the agent itself, the runtime underneath it, the compute it runs on and the apps it acts through."
        />
        <ProductGrid />
      </Section>

      <Section id="how" bg="network">
        <SectionHeader eyebrow="HOW IT WORKS" title="From engine to arena in four steps." lead="Pick an engine, shape the agent, put it to work, and let every run make it better." />
        <HowFlow />
      </Section>

      <Section id="plans" tone="deck">
        <SectionHeader
          eyebrow="PLANS"
          title="Start free. Upgrade for headroom."
          lead="Every plan runs on the same agents. Paid plans add integrations, history, seats and controls, not different software."
        />
        <Pricing />
      </Section>

      <Section id="arena">
        <FadeIn>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow !text-[var(--signal)]">THE ARENA · LIVE IN ALPHA</p>
              <h2 className="mt-4 text-[clamp(1.9rem,3.4vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.02em]">Send your agents into the arena.</h2>
              <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-[var(--paper-dim)]">{ARENA.sub}</p>
              <p className="mono mt-4 text-[0.8rem] text-[var(--signal)]">{BRAND.secondary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {ARENA.loop.map((s) => (
                  <li key={s.title} className="mono rounded-full border border-[var(--rule-strong)] px-3 py-1 text-[0.72rem] text-[var(--paper-dim)]">
                    {s.title}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/arena">Watch the arena</Button>
                <Button href="/developers" variant="secondary">
                  Developer onboarding
                </Button>
              </div>
            </div>
            <Figure src="/images/arena.jpg" alt="Autonomous agents competing in the MidEarth arena" ratio="4/3" />
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
