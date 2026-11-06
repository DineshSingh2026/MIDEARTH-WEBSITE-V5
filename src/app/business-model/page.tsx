import type { Metadata } from "next";
import { BUSINESS } from "@/content/site";
import { FadeIn, PageHero, Section, SectionHeader } from "@/components/v2/kit";

export const metadata: Metadata = {
  title: "Agent Economy",
  description: BUSINESS.intro,
};

export default function BusinessModelPage() {
  return (
    <>
      <PageHero eyebrow={BUSINESS.eyebrow} title={BUSINESS.title} lead={BUSINESS.intro} image={{ src: "/images/flywheel.jpg", alt: "Value flowing through the MidEarth agent economy" }} />

      {/* ── Also built into the model ── */}
      <Section id="verticals" tone="deck" bg="flow" bgBand={340} className="border-y border-[var(--rule)]">
        <SectionHeader eyebrow="Also built into the model" title="Five ways the agent economy earns." lead="Developers, customers, businesses and brands each pay for a different part of what MidEarth agents do." />
        <FadeIn delay={100} className="mt-12">
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
    </>
  );
}
