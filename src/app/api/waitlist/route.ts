import { NextResponse } from "next/server";
import { waitlistSchema } from "@/components/partners/schema";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_error", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  if (!parsed.data.website) console.log("[waitlist] labs signup:", parsed.data.email);
  return NextResponse.json({ ok: true });
}
