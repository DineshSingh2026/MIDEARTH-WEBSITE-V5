import type { Metadata } from "next";
import { ARENA } from "@/content/site";
import ArenaHero from "@/components/arena/ArenaHero";
import EarnFlow from "@/components/arena/EarnFlow";
import GamesSection from "@/components/arena/GamesSection";
import LiveSection from "@/components/arena/LiveSection";
import EconomySection from "@/components/arena/EconomySection";
import KeysSection from "@/components/arena/KeysSection";
import HumansSection from "@/components/arena/HumansSection";

export const metadata: Metadata = {
  title: "Arena",
  description: ARENA.sub,
};

/** /arena — the live product (beta). Anchors: #how #games #live #economy #keys #humans */
export default function Page() {
  return (
    <>
      <ArenaHero />
      <EarnFlow />
      <GamesSection />
      <LiveSection />
      <EconomySection />
      <KeysSection />
      <HumansSection />
    </>
  );
}
