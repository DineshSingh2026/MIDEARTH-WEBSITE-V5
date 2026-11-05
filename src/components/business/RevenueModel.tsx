"use client";
/** "Five revenue pillars" (explorer). */
import { useState } from "react";
import { BUSINESS, PILLARS, REG_NOTE } from "@/content/site";
import { FadeIn, Section, SectionHeader } from "@/components/v2/kit";
import PillarExplorer from "./PillarExplorer";

export default function RevenueModel() {
  const [active, setActive] = useState<string>(PILLARS[0].key);

  return (
    <Section id="pillars" bg="pillars" className="border-t border-[var(--rule)]">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <SectionHeader eyebrow="The business model" title={BUSINESS.pillarsTitle} lead={BUSINESS.pillarsBody} className="lg:col-span-8" />
        <FadeIn delay={80} className="lg:col-span-4">
          <p className="text-[0.85rem] leading-relaxed text-[var(--paper-dim)] lg:text-right">
            The pillars are the business model. The streams inside each pillar are how it earns.
          </p>
        </FadeIn>
      </div>
      <FadeIn delay={120} className="mt-12">
        <PillarExplorer active={active} onChange={setActive} />
      </FadeIn>
      <p className="mt-6 text-[0.78rem] leading-relaxed text-[var(--paper-dim)]">
        <span className="text-[var(--hot)]">*</span> {REG_NOTE}
      </p>
    </Section>
  );
}
