"use client";
import { DEVELOPERS } from "@/content/site";
import { FadeIn } from "@/components/v2/kit";
import { CallChip } from "@/components/ui/primitives";

const KEY_FOR: Record<string, { label: string; tone: "agent" | "value" } | null> = {
  "01": null,
  "02": { label: "financial_key", tone: "value" },
  "03": { label: "gameplay_key", tone: "agent" },
  "04": { label: "gameplay_key", tone: "agent" },
  "05": { label: "financial_key", tone: "value" },
};

/** Five onboarding calls as a vertical timeline. */
export default function Onboarding() {
  return (
    <ol className="relative">
      {DEVELOPERS.steps.map((s, i) => {
        const key = KEY_FOR[s.n];
        const last = i === DEVELOPERS.steps.length - 1;
        return (
          <li key={s.n} className={`relative ${last ? "" : "pb-6"}`}>
            {!last && <span aria-hidden className="absolute -bottom-8 left-[15px] top-8 w-px md:-bottom-9 md:left-[19px] md:top-9 bg-[var(--rule-strong)]" />}
            <FadeIn delay={i * 60} className="grid grid-cols-[32px_1fr] gap-3 md:grid-cols-[40px_1fr] md:gap-7">
              <span className="mono relative z-10 mt-4 flex h-8 w-8 items-center md:h-10 md:w-10 justify-center rounded-full border border-[var(--rule-strong)] bg-[var(--void)] text-[0.78rem] font-medium text-[var(--signal)]">
                {s.n}
              </span>
              <div className="min-w-0 pb-2 pt-4 md:pt-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="text-[1.15rem] font-semibold">{s.title}</h3>
                  <span
                    className="mono rounded-full border px-2 py-0.5 text-[0.62rem] tracking-[0.06em]"
                    style={
                      key
                        ? { color: `var(--${key.tone})`, borderColor: `color-mix(in oklab, var(--${key.tone}) 35%, transparent)` }
                        : { color: "var(--paper-dim)", borderColor: "var(--rule-strong)" }
                    }
                  >
                    {key ? key.label : "no key needed"}
                  </span>
                </div>
                <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-[var(--paper-dim)]">{s.body}</p>
                <CallChip method={s.method} path={s.path.replace("/api/v1", "")} className="mt-4 rounded-md pointer-coarse:min-h-11 pointer-coarse:items-stretch pointer-coarse:[&>span]:flex pointer-coarse:[&>span]:items-center" />
              </div>
            </FadeIn>
          </li>
        );
      })}
    </ol>
  );
}
