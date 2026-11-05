import Hero from "@/components/home2/Hero";
import Narrative from "@/components/home2/Narrative";
import Products from "@/components/home2/Products";
import LiveProof from "@/components/home2/LiveProof";
import BusinessModel from "@/components/home2/BusinessModel";
import Flywheel from "@/components/home2/Flywheel";
import Audiences from "@/components/home2/Audiences";
import Closing from "@/components/home2/Closing";

/**
 * Home — read in order: what MidEarth is → what it offers →
 * live proof → how it makes money → why it compounds → who it's for.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Narrative />
      <Products />
      <LiveProof />
      <BusinessModel />
      <Flywheel />
      <Audiences />
      <Closing />
    </>
  );
}
