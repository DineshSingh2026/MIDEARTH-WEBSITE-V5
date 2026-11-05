import type { Metadata } from "next";
import { ENTERPRISE } from "@/content/site";
import { Button, FadeIn, PageHero, Section, SectionHeader } from "@/components/v2/kit";
import { Audiences, Offerings } from "@/components/enterprise/Offerings";
import Engagement from "@/components/enterprise/Engagement";
import ContactForm from "@/components/enterprise/ContactForm";
import { Icon } from "@/components/labs2/icons";

export const metadata: Metadata = {
  title: "Enterprise",
  description: ENTERPRISE.sub,
};

const WHAT_YOU_GET = ["Game engines & simulation environments", "Enterprise-grade APIs", "Compute for agent workloads", "Benchmarks, data & reporting"];

export default function EnterprisePage() {
  return (
    <>
      <PageHero eyebrow={ENTERPRISE.eyebrow} title={ENTERPRISE.title} lead={ENTERPRISE.sub} image={{ src: "/images/enterprise.jpg", alt: "MidEarth enterprise agent infrastructure" }}>
        <div className="flex flex-wrap gap-3">
          <Button href="#contact">Start a conversation</Button>
          <Button href="#offerings" variant="secondary">
            See offerings
          </Button>
        </div>
      </PageHero>

      <section className="border-y border-[var(--rule)] bg-[var(--deck)] py-10 md:py-12">
        <div className="shell">
          <FadeIn>
            <p className="eyebrow mb-5 !text-[var(--paper-dim)]">BUILT FOR</p>
          </FadeIn>
          <Audiences />
        </div>
      </section>

      <Section id="offerings" bg="racks">
        <SectionHeader
          eyebrow="OFFERINGS"
          title="Eight ways to put MidEarth to work."
          lead="Each offering is a commercial line in the MidEarth agent economy, with its own pricing structure. Pick one, or combine several in a single agreement."
        />
        <Offerings />
      </Section>

      <Section id="engagement" tone="deck">
        <SectionHeader eyebrow="HOW AN ENGAGEMENT WORKS" title="From first call to running in production." lead="A clear path from conversation to contract to live operation." />
        <Engagement />
      </Section>

      <Section id="contact">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="CONTACT"
              title={ENTERPRISE.form.title}
              lead="Tell us what you're building. Partnerships, enterprise licensing and investor enquiries all start here."
            />
            <FadeIn delay={100}>
              <ul className="mt-8 space-y-3">
                {WHAT_YOU_GET.map((w) => (
                  <li key={w} className="flex items-start gap-3 text-[0.95rem]">
                    <Icon name="check" size={16} className="mt-[3px] shrink-0 text-[var(--signal)]" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
          <FadeIn delay={120} className="lg:col-span-7">
            <ContactForm />
          </FadeIn>
        </div>
      </Section>
    </>
  );
}
