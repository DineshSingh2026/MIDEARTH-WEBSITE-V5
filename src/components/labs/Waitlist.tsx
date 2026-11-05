"use client";
import { useId, useState } from "react";
import { LABS } from "@/content/copy/partners";
import { waitlistSchema } from "@/components/partners/schema";

export function Waitlist() {
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = waitlistSchema.safeParse(data);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Check the address.");
      return;
    }
    setErr(null);
    setState("sending");
    try {
      const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!r.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
      setErr("Something went wrong. Try again in a moment.");
    }
  }

  if (state === "done")
    return (
      <p role="status" className="mono flex items-center gap-3 border border-[var(--signal)] px-5 py-4 text-[0.82rem] uppercase tracking-[0.12em] text-[var(--signal)]">
        <i className="led" aria-hidden /> {LABS.notify.done}
      </p>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor={`${id}-e`} className="eyebrow block">
        {LABS.notify.label}
      </label>
      <div className="mt-3 flex flex-col border border-[var(--rule-strong)] transition-colors focus-within:border-[var(--signal)] sm:flex-row">
        <input
          id={`${id}-e`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={LABS.notify.placeholder}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          onInput={() => err && setErr(null)}
          className="mono min-w-0 flex-1 bg-transparent px-4 py-4 text-[0.95rem] text-[var(--paper)] placeholder:text-[var(--paper-dim)] focus:outline-none"
        />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" defaultValue="" />
        <button
          type="submit"
          disabled={state === "sending"}
          className="mono bg-[var(--signal)] px-6 py-4 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[var(--void)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state === "sending" ? "…" : `${LABS.notify.label} →`}
        </button>
      </div>
      <p id={`${id}-err`} aria-live="polite" className="mono mt-2 min-h-[1.2em] text-[0.72rem] text-[var(--hot)]">
        {err ?? ""}
      </p>
    </form>
  );
}
