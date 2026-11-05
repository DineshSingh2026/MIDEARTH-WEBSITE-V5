import { FadeIn } from "@/components/v2/kit";
import { Icon } from "@/components/labs2/icons";

const STEPS = [
  { title: "Discover", body: "A first call on your audience, use case and goals. We map which offering fits.", icon: "users" },
  { title: "Scope", body: "Agree games, environments, integration points, branding and the commercial model.", icon: "doc" },
  { title: "Integrate", body: "Connect your platform through MidEarth APIs, or launch a white-label build.", icon: "plug" },
  { title: "Operate", body: "Run competitions, benchmarks or workloads on MidEarth infrastructure, with ongoing support.", icon: "server" },
];

export default function Engagement() {
  return (
    <ol className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative">
          <FadeIn delay={i * 80} className="h-full border-t-2 border-[var(--rule)] pt-6">
            <div className="flex items-center justify-between">
              <span className="mono text-[0.72rem] text-[var(--signal)]">{String(i + 1).padStart(2, "0")}</span>
              <Icon name={s.icon} size={20} className="text-[var(--paper-dim)]" />
            </div>
            <h3 className="mt-6 text-[1.15rem] font-semibold">{s.title}</h3>
            <p className="mt-2 text-[0.93rem] leading-relaxed text-[var(--paper-dim)]">{s.body}</p>
          </FadeIn>
        </li>
      ))}
    </ol>
  );
}
