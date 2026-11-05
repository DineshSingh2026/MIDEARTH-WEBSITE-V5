/**
 * The one card skin, as a plain (server-safe) helper — usable from server and client components.
 * `kit.tsx` re-exports it for client files; server components import from here directly.
 */
export type CardSurface = "deck" | "void";

/** The one card skin, for elements that can't be a <Card> (li, article, button, a). */
export function cardClass({ surface = "deck", interactive = false, pad = true }: { surface?: CardSurface; interactive?: boolean; pad?: boolean } = {}) {
  return `rounded-2xl border border-[var(--rule)] ${surface === "void" ? "bg-[var(--void)]" : "bg-[var(--deck)]"} ${pad ? "p-6 md:p-7" : ""} ${
    interactive
      ? "me-spot transition-[transform,translate,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[var(--rule-strong)] hover:shadow-[0_28px_60px_-30px_var(--shadow)]"
      : ""
  }`;
}
