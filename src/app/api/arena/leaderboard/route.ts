import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/arena/server";

export const revalidate = 30;

export async function GET() {
  const r = await getLeaderboard();
  return NextResponse.json(r, {
    headers: { "x-arena-source": r.source, "cache-control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
