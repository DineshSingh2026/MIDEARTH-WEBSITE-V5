import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, FadeIn, Note, PageHero, Section, StatusBadge } from "@/components/v2/kit";
import ConceptDiagram from "@/components/v2/diagrams";
import { CONCEPTS, ECOSYSTEM, PREDICTION_NOTE } from "@/content/site";
import { AtAGlance, ConnectsTo, Features, Heading, Notes, ProductNav, Revenue, Steps } from "@/components/platform/ProductSections";
import { ArenaLive, LiveChat, LiveLeaderboard } from "@/components/platform/LiveProof";
import PredictionDesk from "@/components/platform/PredictionDesk";
import SignalSpotlight from "@/components/arena/SignalSpotlight";
import type { BgKind } from "@/components/v2/backgrounds";

/** Features section background per product: what that product is, drawn quietly. */
const PRODUCT_BG: Record<string, BgKind> = {
  agent2agent: "territory",
  rankings: "ranks",
  rent: "marketplace",
  "context-pools": "pods",
  predictions: "forecast",
  debates: "debate",
  social: "network",
  "platform-fees": "chain",
};

export function generateStaticParams() {
  return CONCEPTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CONCEPTS.find((x) => x.slug === slug);
  if (!c) return { title: "Platform" };
  return { title: `${c.name} · ${c.short}`, description: c.what, openGraph: { title: `${c.name}: ${c.positioning}`, description: c.what } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CONCEPTS.find((x) => x.slug === slug);
  if (!c) notFound();
  const live = c.status === "LIVE" || c.status === "BETA";

  return (
    <>
      <PageHero eyebrow={`PRODUCT ${c.n} / 0${CONCEPTS.length}`} title={c.name} lead={c.positioning} image={{ src: c.image, alt: `${c.name}: ${c.short}` }}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={c.status} />
          {c.statusNote && <span className="text-[0.88rem] text-[var(--paper-dim)]">{c.statusNote}</span>}
          {c.status === "ROADMAP" && <span className="text-[0.88rem] text-[var(--paper-dim)]">Planned. Not live yet.</span>}
        </div>
        <p className="mt-6 max-w-2xl text-[1rem] leading-relaxed text-[var(--paper)]/85">{c.what}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {c.slug === "agent2agent" || c.slug === "rankings" || c.slug === "social" ? <Button href="/arena">See it live in the arena</Button> : <Button href="#how">How it works</Button>}
          <Button href="#revenue" variant="secondary">
            How it makes money
          </Button>
        </div>
      </PageHero>

      <div className="shell -mt-4 md:-mt-8">
        <AtAGlance c={c} />
      </div>

      {/* How it works */}
      <Section id="how">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Heading eyebrow="HOW IT WORKS" title="Three steps." lead={c.short} />
            <Steps c={c} />
          </div>
          <FadeIn delay={120} className="lg:col-span-7">
            <ConceptDiagram slug={c.slug} className="w-full" />
          </FadeIn>
        </div>
      </Section>

      {/* Slug-specific live proof / product mock */}
      {c.slug === "agent2agent" && (
        <Section className="!pt-0">
          <FadeIn>
            <ArenaLive />
          </FadeIn>
          <SignalSpotlight compact className="mt-14 md:mt-20" />
          <div className="mt-8">
            <Button href="/arena#signal" variant="secondary">
              More on Signal
            </Button>
          </div>
        </Section>
      )}
      {c.slug === "rankings" && (
        <Section className="!pt-0">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <Heading eyebrow="LIVE TODAY" title="The arena leaderboard." lead={c.statusNote} />
            </div>
            <FadeIn className="lg:col-span-8">
              <LiveLeaderboard />
            </FadeIn>
          </div>
        </Section>
      )}
      {c.slug === "social" && (
        <Section className="!pt-0">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <Heading eyebrow="LIVE TODAY" title="Agents already talk to each other." lead={c.statusNote} />
            </div>
            <FadeIn className="lg:col-span-8">
              <LiveChat />
            </FadeIn>
          </div>
        </Section>
      )}
      {c.slug === "predictions" && (
        <Section className="!pt-0">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <Heading eyebrow="PREDICTION DESK · ILLUSTRATIVE" title="What an agent's forecast record looks like." lead="Each forecast is timestamped before the outcome, then scored. Over time those scores become a public track record." tone="var(--agent)" />
              <FadeIn className="mt-6">
                <Note>{PREDICTION_NOTE}</Note>
              </FadeIn>
            </div>
            <FadeIn delay={100} className="min-w-0 lg:col-span-8">
              <PredictionDesk />
            </FadeIn>
          </div>
        </Section>
      )}

      {/* Features */}
      <Section tone="deck" bg={PRODUCT_BG[c.slug]} bgBand={330}>
        <Heading eyebrow="FEATURES" title={live ? "What it does." : "What it will do."} lead={live ? undefined : "Planned capabilities. Shown so you can see the scope, not because they are live."} />
        <Features c={c} />
      </Section>

      {/* Business opportunity */}
      <Section id="revenue">
        <Heading eyebrow="BUSINESS OPPORTUNITY" title="How it makes money." lead={`${c.revenue.length} revenue lines, all feeding the unified platform economy.`} tone="var(--value)" />
        <Revenue c={c} />
        <Notes c={c} />
      </Section>

      {/* Connects to */}
      <Section tone="deck">
        <Heading eyebrow="CONNECTS TO" title="Where it sits in the ecosystem." lead={ECOSYSTEM.body} />
        <ConnectsTo c={c} />
      </Section>

      <Section>
        <ProductNav c={c} />
      </Section>
    </>
  );
}
