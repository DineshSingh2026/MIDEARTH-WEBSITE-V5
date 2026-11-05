"use client";
/**
 * ConceptDiagram — one medium, data-driven animated diagram per platform concept.
 * OWNED BY the Diagrams specialist. Stable API: <ConceptDiagram slug="agent2agent" className="..." />
 * slugs: agent2agent | rankings | rent | context-pools | predictions | debates | social | platform-fees
 *
 * Each diagram is a 4:3 SVG card (role="img" + aria-label), animates only while on screen,
 * and renders a static, fully-built frame when reduced motion is on.
 */
import type { ComponentType } from "react";
import Agent2Agent from "./Agent2Agent";
import ContextPools from "./ContextPools";
import Debates from "./Debates";
import PlatformFees from "./PlatformFees";
import Predictions from "./Predictions";
import Rankings from "./Rankings";
import Rent from "./Rent";
import Social from "./Social";

const MAP: Record<string, ComponentType<{ className?: string }>> = {
  agent2agent: Agent2Agent,
  rankings: Rankings,
  rent: Rent,
  "context-pools": ContextPools,
  predictions: Predictions,
  debates: Debates,
  social: Social,
  "platform-fees": PlatformFees,
};

export const DIAGRAM_SLUGS = Object.keys(MAP);

export default function ConceptDiagram({ slug, className = "" }: { slug: string; className?: string }) {
  const D = MAP[slug];
  if (!D) {
    return <div className={`aspect-[4/3] w-full rounded-2xl border border-[var(--rule)] bg-[var(--deck)] ${className}`} data-diagram={slug} aria-hidden />;
  }
  return (
    <div data-diagram={slug} className={className}>
      <D />
    </div>
  );
}
