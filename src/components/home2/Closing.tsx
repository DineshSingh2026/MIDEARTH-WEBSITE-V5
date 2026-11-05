"use client";
import { BRAND, CTA } from "@/content/site";
import { Button, FadeIn } from "@/components/v2/kit";
import { Logo } from "@/components/brand/Logo";
import { SectionBg } from "@/components/v2/backgrounds";

export default function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--rule)] py-24 md:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(55%_60%_at_50%_45%,black,transparent)]" />
      <SectionBg kind="network" fade="edges" opacity={0.5} />
      <div className="shell relative">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <Logo size={44} className="mx-auto" />
          <h2 className="mt-8 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.025em]">{BRAND.closing.title}</h2>
          <p className="mx-auto mt-6 max-w-[62ch] text-[1.02rem] leading-relaxed text-[var(--paper-dim)] md:text-[1.1rem]">{BRAND.closing.body}</p>
          <p className="mono mt-8 text-[0.8rem] uppercase tracking-[0.16em] text-[var(--signal)]">{BRAND.closing.sign}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href={CTA.primary.href}>{CTA.primary.label}</Button>
            <Button href={CTA.secondary.href} variant="secondary">
              {CTA.secondary.label}
            </Button>
            <Button href={CTA.investors.href} variant="ghost">
              {CTA.investors.label}
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
