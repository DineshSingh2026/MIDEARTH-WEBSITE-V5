import { NextResponse } from "next/server";
import { partnerSchema } from "@/components/partners/schema";

export const runtime = "nodejs";

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENT[c] ?? c);

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = partnerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_error", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const { name, company, email, type, message, website } = parsed.data;
  if (website) return NextResponse.json({ ok: true });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.PARTNER_EMAIL;
  if (!key || !to) {
    console.log("[partners] enquiry (RESEND_API_KEY / PARTNER_EMAIL not set, logged only):", { name, company, email, type, message });
    return NextResponse.json({ ok: true, delivered: "logged" });
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.PARTNER_FROM || "MidEarth Partners <partners@midearth.ai>",
        to: [to],
        ...(email ? { reply_to: email } : {}),
        subject: `MidEarth enquiry · ${type} · ${company}`,
        text: `Name: ${name}\nCompany: ${company}\nType: ${type}\n\n${message}`,
        html: `<p><b>Name:</b> ${esc(name)}<br/><b>Company:</b> ${esc(company)}<br/><b>Type:</b> ${esc(type)}</p><p>${esc(message).replace(/\n/g, "<br/>")}</p>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[partners] resend failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, delivered: "email" });
  } catch (e) {
    console.error("[partners] resend error", e);
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  }
}
