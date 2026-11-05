import { ENTERPRISE, REG_NOTE, STREAMS, type Stream } from "@/content/site";
import { FadeIn, Note } from "@/components/v2/kit";
import { Icon, IconTile } from "@/components/labs2/icons";

const ICON: Record<string, string> = {
  "b2b-infra": "gamepad",
  "white-label": "palette",
  "private-tournaments": "trophy",
  benchmarking: "chart",
  "custom-dev": "wrench",
  "data-licensing": "database",
  compute: "cpu",
  sponsorship: "megaphone",
};

const AUD_ICON = ["gamepad", "brain", "spark", "chain", "school", "users"];

export function Audiences() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ENTERPRISE.audiences.map((a, i) => (
        <li key={a}>
          <FadeIn delay={i * 50} className="flex h-full items-center gap-3 rounded-xl border border-[var(--rule)] bg-[var(--void)] px-4 py-3.5">
            <Icon name={AUD_ICON[i] ?? "spark"} size={18} className="shrink-0 text-[var(--agent)]" />
            <span className="text-[0.88rem] font-medium leading-tight">{a}</span>
          </FadeIn>
        </li>
      ))}
    </ul>
  );
}

export function Offerings() {
  const offers = ENTERPRISE.offers.map((n) => STREAMS.find((s) => s.n === n)).filter((s): s is Stream => !!s);
  return (
    <>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {offers.map((s, i) => (
          <FadeIn key={s.n} delay={(i % 2) * 70} className="h-full">
            <article className="flex h-full flex-col rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-7">
              <div className="flex items-start gap-4">
                <IconTile name={ICON[s.slug] ?? "spark"} tone="agent" />
                <div className="min-w-0">
                  <p className="mono text-[0.66rem] tracking-[0.12em] text-[var(--paper-dim)]">STREAM {String(s.n).padStart(2, "0")}</p>
                  <h3 className="mt-1 text-[1.15rem] font-semibold leading-snug">{s.name}</h3>
                </div>
              </div>
              <p className="mt-4 flex-1 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{s.body}</p>
              <dl className="mt-6 grid gap-3 border-t border-[var(--rule)] pt-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
                <dt className="mono text-[0.66rem] tracking-[0.12em] text-[var(--paper-dim)] sm:pt-0.5">COMMERCIAL MODEL</dt>
                <dd className="-mt-2 text-[0.92rem] font-medium text-[var(--value)] sm:mt-0">{s.model}</dd>
                {s.figure && (
                  <>
                    <dt className="mono text-[0.66rem] tracking-[0.12em] text-[var(--paper-dim)] sm:pt-0.5">FIGURE</dt>
                    <dd className="mono -mt-2 text-[0.92rem] text-[var(--paper)] sm:mt-0">{s.figure}</dd>
                  </>
                )}
              </dl>
              {(s.regulated || s.slug === "sponsorship") && <p className="mono mt-4 text-[0.7rem] text-[var(--paper-dim)]">† Subject to the regulatory note below</p>}
            </article>
          </FadeIn>
        ))}
      </div>
      <div className="mt-12 max-w-3xl">
        <Note>† {REG_NOTE}</Note>
      </div>
    </>
  );
}
