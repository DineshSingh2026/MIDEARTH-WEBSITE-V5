import { LABS } from "@/content/site";
import { Card, FadeIn } from "@/components/v2/kit";
import { IconTile } from "./icons";

const ICONS = ["agent", "layers", "endpoint", "server", "plug", "api"] as const;
const TONES = ["signal", "agent", "agent", "frost", "value", "signal"] as const;

export default function ProductGrid() {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LABS.products.map((p, i) => (
        <FadeIn key={p.name} delay={(i % 3) * 70} className="h-full">
          <Card surface="void" className="h-full">
            <div className="flex items-center justify-between">
              <IconTile name={ICONS[i] ?? "spark"} tone={TONES[i] ?? "signal"} />
              <span className="mono text-[0.7rem] text-[var(--paper-dim)]">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="mt-5 text-[1.15rem] font-semibold tracking-[-0.01em]">{p.name}</h3>
            <p className="mt-2 text-[0.94rem] leading-relaxed text-[var(--paper-dim)]">{p.body}</p>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
