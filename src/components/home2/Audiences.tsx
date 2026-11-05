"use client";
import Link from "next/link";
import { DEVELOPERS, ENTERPRISE, INVESTORS, LABS } from "@/content/site";
import { FadeIn, Section, SectionHeader, cardClass } from "@/components/v2/kit";
import { Mascot, type MascotKind } from "@/components/brand/Mascot";
import { Icon } from "./icons";

const firstSentence = (s: string) => {
  const i = s.indexOf(". ");
  return i > 0 ? s.slice(0, i + 1) : s;
};

const PATHS: { who: string; icon: string; mascot: MascotKind; title: string; body: string; cta: string; href: string; c: string }[] = [
  { who: "Developers", icon: "developer", mascot: "exec", title: DEVELOPERS.title, body: DEVELOPERS.sub, cta: "Read the developer guide", href: "/developers", c: "var(--agent)" },
  { who: "Businesses", icon: "business", mascot: "track", title: ENTERPRISE.title, body: ENTERPRISE.sub, cta: "Explore enterprise", href: "/enterprise", c: "var(--frost)" },
  { who: "Users", icon: "user", mascot: "play", title: LABS.title, body: firstSentence(LABS.sub), cta: "Discover MidEarth Labs", href: "/labs", c: "var(--signal)" },
  { who: "Investors", icon: "investor", mascot: "funds", title: INVESTORS.title, body: INVESTORS.narrative, cta: "Investor overview", href: "/investors", c: "var(--value)" },
];

export default function Audiences() {
  return (
    <Section id="paths" tone="deck" className="border-t border-[var(--rule)]">
      <SectionHeader eyebrow="06 · Who it's for" title="Four ways into the agent economy." lead="Pick the path that fits you. Each one goes deeper on what MidEarth offers that audience today, and what is still on the roadmap." />
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PATHS.map((p, i) => (
          <FadeIn key={p.who} delay={i * 80} className="h-full">
            <Link href={p.href} className={`group relative flex h-full flex-col overflow-hidden ${cardClass({ surface: "void", interactive: true })}`}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg, ${p.c}, transparent 70%)` }} />
              <div className="flex items-start justify-between">
                <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold" style={{ color: p.c }}>
                  <Icon name={p.icon} size={15} />
                  {p.who}
                </span>
                <Mascot kind={p.mascot} size={30} className="opacity-90 transition-transform duration-500 group-hover:-translate-y-0.5" />
              </div>
              <h3 className="mt-6 text-[1.2rem] font-semibold leading-snug decoration-[var(--paper-dim)] underline-offset-4 group-hover:underline">{p.title}</h3>
              <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-[var(--paper-dim)]">{p.body}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold" style={{ color: p.c }}>
                {p.cta} <Icon name="arrow" size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
