import type { Metadata } from "next";
import { BUSINESS, FLYWHEEL, PILLARS, REG_NOTE, STREAMS } from "@/content/site";
import { Button, FadeIn, Figure, PageHero, Section, SectionHeader, Stat } from "@/components/v2/kit";
import RevenueModel from "@/components/business/RevenueModel";
import TwoSided from "@/components/business/TwoSided";
import Flywheel from "@/components/business/Flywheel";

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
          <Button href="#pillars">See the five pillars</Button>
          <Button href="/investors" variant="secondary">
            Investor overview
          </Button>
        </div>
      </PageHero>

      <RevenueModel />

      {/* ── Verticals ── */}
      <Section id="verticals" tone="deck" bg="flow" bgBand={340} className="border-y border-[var(--rule)]">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow="Revenue verticals" title="Where the money comes from, in one table." lead="The same model, read by product line: what each vertical sells and how it charges." />
          </div>
          <FadeIn delay={80} className="lg:col-span-7">
            <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--void)] px-5 md:px-8">
              <table className="w-full text-left">
                <caption className="sr-only">Revenue verticals and their commercial models</caption>
                <thead>
                  <tr className="border-b border-[var(--rule)]">
                    <th scope="col" className="mono pb-3.5 pt-5 pr-5 text-[0.64rem] font-normal tracking-[0.16em] text-[var(--paper-dim)] md:pr-6">
                      VERTICAL
                    </th>
                    <th scope="col" className="mono pb-3.5 pt-5 pl-5 text-[0.64rem] font-normal tracking-[0.16em] text-[var(--paper-dim)] md:pl-6">
                      HOW IT CHARGES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BUSINESS.verticals.map((v, i) => (
                    <tr key={v.name} className="border-b border-[var(--rule)] last:border-0">
                      <th scope="row" className="py-4 pr-5 align-top font-semibold md:pr-6">
                        <span className="mono mr-3 text-[0.7rem] font-normal text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
                        {v.name}
                      </th>
                      <td className="py-4 pl-5 align-top text-[0.92rem] text-[var(--paper-dim)] md:pl-6">{v.model}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={100} className="mt-16">
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

      {/* ── Two-sided marketplace ── */}
      <Section id="two-sided" bg="network">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <SectionHeader eyebrow="Marketplace economics" title="MidEarth earns from both sides." lead="Developers supply agents. Customers consume what those agents can do. The platform sits in the middle of every transaction." className="lg:col-span-7" />
          <FadeIn delay={100} className="hidden lg:col-span-5 lg:block">
            <Figure src="/images/marketplace.jpg" alt="The MidEarth agent marketplace" ratio="16/9" />
          </FadeIn>
        </div>
        <FadeIn delay={120} className="mt-12">
          <TwoSided />
        </FadeIn>
      </Section>

      {/* ── Flywheel ── */}
      <Section id="flywheel" tone="deck" className="border-y border-[var(--rule)]">
        <SectionHeader eyebrow="Network effects" title={FLYWHEEL.title} lead="Each stage feeds the next, and every turn of the loop adds demand to more than one pillar." />
        <FadeIn delay={120} className="mt-14">
          <Flywheel />
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
