"use client";
/**
 * Enterprise contact form → POST /api/partners.
 * The route's zod schema accepts { name, company, type, message, website(honeypot) } with a fixed type list,
 * so the enterprise type maps to the nearest accepted value and the exact type + email travel in the message.
 */
import { useState, type FormEvent } from "react";
import { ENTERPRISE } from "@/content/site";


type Errors = Partial<Record<"name" | "company" | "email" | "type" | "message", string>>;
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; msg: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const data = { name: v("name"), company: v("company"), email: v("email"), type: v("type"), message: v("message"), website: String(fd.get("website") ?? "") };
    const err: Errors = {};
    if (data.name.length < 2) err.name = "Tell us your name.";
    if (data.company.length < 2) err.company = "Which company or organisation?";
    if (!EMAIL_RE.test(data.email)) err.email = "That doesn't look like an email address.";
    if (!data.type) err.type = "Pick an enquiry type.";
    if (data.message.length < 10) err.message = "A sentence or two, at least.";
    setErrors(err);
    if (Object.keys(err).length) return;

    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          company: data.company,
          email: data.email,
          type: data.type,
          message: `Enquiry type: ${data.type}\nEmail: ${data.email}\n\n${data.message}`.slice(0, 4000),
          website: data.website,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) {
        setState({ kind: "sent" });
        form.reset();
      } else {
        setState({ kind: "error", msg: "We couldn't send that. Check the fields and try again in a moment." });
      }
    } catch {
      setState({ kind: "error", msg: "Network error. Try again in a moment." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="flex h-full flex-col justify-center rounded-2xl border border-[color:color-mix(in_oklab,var(--signal)_40%,transparent)] bg-[var(--deck)] p-8">
        <p className="mono text-[0.72rem] tracking-[0.12em] text-[var(--signal)]">RECEIVED</p>
        <h3 className="mt-3 text-[1.5rem] font-semibold">Thanks, we&apos;ll be in touch.</h3>
        <p className="mt-2 text-[0.95rem] text-[var(--paper-dim)]">Your enquiry reached the MidEarth team.</p>
        <button type="button" onClick={() => setState({ kind: "idle" })} className="mt-6 inline-flex min-h-11 items-center self-start text-[0.9rem] font-semibold text-[var(--signal)] underline-offset-4 hover:underline">
          Send another enquiry
        </button>
      </div>
    );
  }

  const sending = state.kind === "sending";
  return (
    <form onSubmit={onSubmit} noValidate className="relative rounded-2xl border border-[var(--rule)] bg-[var(--deck)] p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" autoComplete="name" error={errors.name} />
        <Field name="company" label="Company" autoComplete="organization" error={errors.company} />
        <Field name="email" label="Work email" type="email" autoComplete="email" error={errors.email} />
        <label className="block">
          <span className="text-[0.82rem] font-medium text-[var(--paper-dim)]">Enquiry type</span>
          <select
            name="type"
            defaultValue=""
            aria-invalid={!!errors.type}
            className={`${INPUT} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238da0a9' stroke-width='1.6'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9`}
          >
            <option value="" disabled>
              Choose one
            </option>
            {ENTERPRISE.form.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.type && <Err>{errors.type}</Err>}
        </label>
      </div>
      <label className="mt-5 block">
        <span className="text-[0.82rem] font-medium text-[var(--paper-dim)]">Message</span>
        <textarea name="message" rows={5} aria-invalid={!!errors.message} placeholder="What are you looking to build or explore?" className={`${INPUT} resize-y`} />
        {errors.message && <Err>{errors.message}</Err>}
      </label>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 text-[0.92rem] font-semibold text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Start a conversation"} <span aria-hidden>→</span>
        </button>
        <p className="text-[0.78rem] text-[var(--paper-dim)]">We only use these details to reply to you.</p>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="mt-4 rounded-lg border border-[color:color-mix(in_oklab,var(--hot)_45%,transparent)] px-4 py-3 text-[0.88rem] text-[var(--hot)]">
          {state.msg}
        </p>
      )}
    </form>
  );
}

const INPUT =
  "mt-2 block w-full rounded-lg border border-[var(--rule-strong)] bg-[var(--void)] px-3.5 py-3 text-base text-[var(--paper)] md:pointer-fine:text-[0.95rem] placeholder:text-[var(--paper-dim)]/60 outline-none transition focus:border-[var(--signal)] aria-[invalid=true]:border-[var(--hot)]";

function Field({ name, label, type = "text", autoComplete, error }: { name: string; label: string; type?: string; autoComplete?: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-[0.82rem] font-medium text-[var(--paper-dim)]">{label}</span>
      <input name={name} type={type} autoComplete={autoComplete} aria-invalid={!!error} className={INPUT} />
      {error && <Err>{error}</Err>}
    </label>
  );
}

function Err({ children }: { children: string }) {
  return <span className="mt-1.5 block text-[0.78rem] text-[var(--hot)]">{children}</span>;
}
