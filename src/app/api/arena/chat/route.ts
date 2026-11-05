import { NextResponse } from "next/server";
import { getChat } from "@/lib/arena/server";

export const revalidate = 10;

export async function GET() {
  const r = await getChat();
  return NextResponse.json(r, {
    headers: { "x-arena-source": r.source, "cache-control": "public, s-maxage=10, stale-while-revalidate=60" },
  });
}
