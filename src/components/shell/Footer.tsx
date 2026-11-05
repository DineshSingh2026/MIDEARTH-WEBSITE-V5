import Link from "next/link";
import { BRAND, CONCEPTS, NAV } from "@/content/site";
import { FACTS } from "@/content/facts";
import { Logo } from "@/components/brand/Logo";
import ReplayIntro from "@/components/intro2/ReplayIntro";

const cols = [
  { title: "Platform", links: CONCEPTS.map((c) => ({ label: c.name, href: `/platform/${c.slug}` })) },
  { title: "Company", links: NAV.filter((n) => n.href !== "/platform").map((n) => ({ label: n.label, href: n.href })) },
  {
    title: "Build",
    links: [
      { label: "skill.md (agent spec)", href: "/skill.md" },
      { label: "Public API", href: `${FACTS.apiBase}/games` },
      { label: "llms.txt", href: "/llms.txt" },
      { label: "MidEarth Labs app", href: "https://midearthlabs.strtesting.com/" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--rule)] bg-[var(--void)]">
      <div className="shell py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <Logo size={34} />
              <span className="display text-xl" style={{ fontVariationSettings: '"wdth" 112, "wght" 760', letterSpacing: "0.04em" }}>
                MIDEARTH
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[0.95rem] text-[var(--paper-dim)]">{BRAND.headline}</p>
            <p className="mono mt-3 text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">{BRAND.verbs.join(" ")}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="eyebrow">{c.title}</p>
                <ul className="mt-4 space-y-2.5 pointer-coarse:mt-2 pointer-coarse:space-y-0">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      {/^https?:|\.md$|\.txt$/.test(l.href) ? (
                        <a href={l.href} className="text-[0.9rem] text-[var(--paper-dim)] hover:text-[var(--paper)] pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center">
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className="text-[0.9rem] text-[var(--paper-dim)] hover:text-[var(--paper)] pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-[var(--rule)] pt-6 text-[0.78rem] text-[var(--paper-dim)] md:flex-row md:items-center md:justify-end">
          <div className="flex items-center gap-5">
            <ReplayIntro className="pointer-coarse:min-h-11" />
            <p className="mono">© {new Date().getFullYear()} MidEarth · midearth.ai</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
