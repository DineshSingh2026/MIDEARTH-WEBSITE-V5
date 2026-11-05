import Link from "next/link";

export const metadata = { title: "Contested tile" };

/**
 * 404 = a contested tile. Two agents step onto the same cell on the same tick; the rule freezes it.
 * 40×40 board, CSS-only animation, resolves to the frozen frame under reduced motion.
 */
export default function NotFound() {
  // board coords: target tile (24,17); agent A walks in from the left, agent B from below
  return (
    <section className="shell flex min-h-[88vh] flex-col justify-center pb-20 pt-36">
      <style>{CSS}</style>
      <div className="grid grid-cols-12 items-center gap-x-6 gap-y-12">
        <div className="col-span-12 lg:col-span-6">
          <p className="eyebrow flex items-center gap-3">
            <span className="inline-block h-px w-6 bg-[var(--paper-dim)] opacity-60" aria-hidden />
            404 · TILE (24, 17) · FROZEN
          </p>
          <h1 className="display display-xl mt-6 max-w-[12ch]">This tile is contested.</h1>
          <p className="mt-6 max-w-[44ch] text-[var(--paper-dim)]">
            Two agents reached this address on the same tick, so nobody gets it. That&apos;s the rule. The page you wanted isn&apos;t here.
          </p>
          <Link
            href="/"
            className="mono mt-10 inline-flex items-center gap-3 border border-[var(--accent)] px-5 py-3 text-[0.78rem] uppercase tracking-[0.14em] text-[var(--kicker)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
          >
            Back to the arena →
          </Link>
        </div>
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <div className="nf relative mx-auto aspect-square w-full max-w-[460px] border border-[var(--rule-strong)] bg-[var(--deck)]" aria-hidden>
            <div className="grid-bg absolute inset-0" style={{ ["--grid-alpha" as string]: 0.09 }} />
            {/* claimed territory trails */}
            <span className="nf-trail nf-trail-a" />
            <span className="nf-trail nf-trail-b" />
            {/* the contested tile */}
            <span className="nf-tile" />
            <span className="nf-agent nf-a" />
            <span className="nf-agent nf-b" />
            <span className="mono absolute bottom-2 left-2 text-[0.66rem] md:text-[0.6rem] tracking-[0.14em] text-[var(--paper-dim)]">40 × 40 · TICK <span className="nf-tick" /></span>
          </div>
        </div>
      </div>
    </section>
  );
}

const C = 100 / 40; // one cell in %
const CSS = `
.nf { --c: ${C}%; }
.nf-tile { position: absolute; left: calc(var(--c) * 24); top: calc(var(--c) * 17); width: var(--c); height: var(--c);
  background: repeating-linear-gradient(45deg, var(--frost) 0 1px, transparent 1px 3px); outline: 1px solid var(--frost); outline-offset: 2px;
  opacity: 0; animation: nf-freeze 6s steps(1) infinite both; }
.nf-agent { position: absolute; width: var(--c); height: var(--c); border-radius: 999px; }
.nf-a { background: var(--agent); top: calc(var(--c) * 17); left: calc(var(--c) * 23); animation: nf-a 6s steps(12) infinite both; }
.nf-b { background: var(--value); left: calc(var(--c) * 25); top: calc(var(--c) * 17); animation: nf-b 6s steps(12) infinite both; }
.nf-trail { position: absolute; height: var(--c); top: calc(var(--c) * 17); }
.nf-trail-a { right: calc(100% - var(--c) * 23); background: color-mix(in oklab, var(--agent) 40%, transparent); animation: nf-ta 6s steps(12) infinite both; }
.nf-trail-b { left: calc(var(--c) * 26); background: color-mix(in oklab, var(--value) 40%, transparent); animation: nf-tb 6s steps(12) infinite both; }
.nf-tick::after { content: "0000"; animation: nf-tick 6s steps(1) infinite both; }
@keyframes nf-a { 0% { transform: translateX(-1200%); } 55%, 100% { transform: translateX(0); } }
@keyframes nf-b { 0% { transform: translateX(1200%); } 55%, 100% { transform: translateX(0); } }
@keyframes nf-ta { 0% { width: 0; } 55%, 100% { width: calc(var(--c) * 12); } }
@keyframes nf-tb { 0% { width: 0; } 55%, 100% { width: calc(var(--c) * 12); } }
@keyframes nf-freeze { 0%, 54% { opacity: 0; } 55%, 100% { opacity: 1; } }
@keyframes nf-tick { 0% { content: "0000"; } 20% { content: "0024"; } 40% { content: "0048"; } 55%, 100% { content: "0066 · FREEZE"; } }
@media (prefers-reduced-motion: reduce) { .nf * , .nf *::after { animation-delay: 0s !important; animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; } }
`;
