import { LABS } from "@/content/site";
import { Button, FadeIn } from "@/components/v2/kit";
import { Icon } from "./icons";

type Plan = (typeof LABS.plans)[number];

export default function Pricing() {
  return (
    <>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LABS.plans.map((p: Plan, i) => {
          const featured = "featured" in p && p.featured;
          const href = p.name === "Enterprise" ? "/enterprise#contact" : LABS.appUrl;
          return (
            <FadeIn key={p.name} delay={i * 70} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-6 ${featured ? "bg-[var(--deck-raise)]" : "bg-[var(--deck)]"}`}
                style={{
                  borderColor: featured ? "color-mix(in oklab, var(--signal) 55%, transparent)" : "var(--rule)",
                  boxShadow: featured ? "0 24px 60px -30px color-mix(in oklab, var(--signal) 45%, transparent)" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[1.1rem] font-semibold">{p.name}</h3>
                  {featured && (
                    <span className="mono rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[0.62rem] font-semibold tracking-[0.1em] text-[var(--on-accent)]">RECOMMENDED</span>
                  )}
                </div>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.02em]">{p.price}</span>
                  {p.per && <span className="text-[0.92rem] text-[var(--paper-dim)]">{p.per}</span>}
                </p>
                <p className="mt-4 min-h-[3.2rem] text-[0.92rem] leading-relaxed text-[var(--paper-dim)]">{p.body}</p>
                <Button href={href} variant={featured ? "primary" : "secondary"} className={`mt-6 w-full justify-center ${featured ? "border border-transparent" : ""}`}>
                  {p.cta}
                </Button>
                <div className="mt-6 border-t border-[var(--rule)] pt-5">
                  <p className="mono text-[0.66rem] tracking-[0.12em] text-[var(--paper-dim)]">INCLUDES</p>
                  <ul className="mt-3 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[0.92rem]">
                        <Icon name="check" size={16} className="mt-[3px] shrink-0 text-[var(--signal)]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
      <p className="mt-6 max-w-3xl text-[0.78rem] leading-relaxed text-[var(--paper-dim)]">{LABS.planNote}</p>
    </>
  );
}
