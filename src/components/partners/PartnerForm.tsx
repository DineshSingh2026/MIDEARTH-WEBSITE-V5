"use client";
import { useId, useState } from "react";
import { PARTNERS } from "@/content/copy/partners";
import { partnerSchema } from "./schema";

type Field = "name" | "company" | "type" | "message";
type Errors = Partial<Record<Field, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const F = PARTNERS.form;

export function PartnerForm() {
  const uid = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const parsed = partnerSchema.safeParse(data);
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as Field;
        if (!next[k]) next[k] = i.message;
      }
      setErrors(next);
      const first = (["name", "company", "type", "message"] as Field[]).find((k) => next[k]);
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  const fieldCls =
    "mt-2 w-full border-0 border-b border-[var(--rule-strong)] bg-transparent px-0 py-3 text-[1.05rem] text-[var(--paper)] placeholder:text-[var(--paper-dim)] placeholder:opacity-60 transition-colors duration-300 focus:border-[var(--signal)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-[var(--hot)]";

  const label = (k: Field, n: string) => (
    <label htmlFor={`${uid}-${k}`} className="flex items-baseline justify-between">
      <span className="eyebrow">
        <span className="mr-2 opacity-60">{n}</span>
        {F.fields[k]}
      </span>
      {errors[k] && (
        <span id={`${uid}-${k}-err`} className="mono text-[0.7rem] text-[var(--hot)]">
          {errors[k]}
        </span>
      )}
    </label>
  );
  const aria = (k: Field) => ({
    id: `${uid}-${k}`,
    name: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${uid}-${k}-err` : undefined,
    onInput: () => errors[k] && setErrors((e) => ({ ...e, [k]: undefined })),
  });

  if (status === "sent") {
    return (
      <div role="status" className="ticks flex min-h-[22rem] flex-col justify-between border border-[var(--rule)] bg-[var(--deck)] p-8">
        <span className="mono text-[0.72rem] tracking-[0.16em] text-[var(--signal)]">200 · RECEIVED</span>
        <p className="display display-l max-w-[14ch]">{F.sent}</p>
        <button type="button" onClick={() => setStatus("idle")} className="mono self-start text-[0.74rem] uppercase tracking-[0.14em] text-[var(--paper-dim)] underline underline-offset-4 hover:text-[var(--paper)]">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-x-8 gap-y-9 md:grid-cols-2" aria-describedby={status === "error" ? `${uid}-status` : undefined}>
      <div>
        {label("name", "A")}
        <input {...aria("name")} type="text" autoComplete="name" required className={fieldCls} placeholder="Ada Lovelace" />
      </div>
      <div>
        {label("company", "B")}
        <input {...aria("company")} type="text" autoComplete="organization" required className={fieldCls} placeholder="Company Ltd." />
      </div>
      <div className="md:col-span-2">
        {label("type", "C")}
        <div className="relative">
          <select {...aria("type")} defaultValue="" required className={`${fieldCls} appearance-none pr-8 [&>option]:bg-[var(--deck)] [&>option]:text-[var(--paper)]`}>
            <option value="" disabled>
              Choose one
            </option>
            {F.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span aria-hidden className="mono pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[var(--paper-dim)]">
            ↓
          </span>
        </div>
      </div>
      <div className="md:col-span-2">
        {label("message", "D")}
        <textarea {...aria("message")} rows={5} required className={`${fieldCls} resize-y`} placeholder="What would you like to build in the arena?" />
      </div>
      {/* honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p id={`${uid}-status`} role={status === "error" ? "alert" : undefined} aria-live="polite" className="mono text-[0.74rem] text-[var(--hot)]">
          {status === "error" ? F.error : ""}
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="group relative inline-flex items-center justify-center gap-3 overflow-hidden bg-[var(--paper)] px-7 py-4 text-[var(--void)] transition-opacity disabled:opacity-60"
        >
          <span className="mono relative z-10 text-[0.8rem] uppercase tracking-[0.14em]">{status === "sending" ? "Sending…" : F.submit}</span>
          <span aria-hidden className="relative z-10 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1">
            →
          </span>
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-[var(--signal)] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-0" />
        </button>
      </div>
    </form>
  );
}
