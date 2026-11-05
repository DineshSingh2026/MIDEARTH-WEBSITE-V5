import { NextResponse } from "next/server";
import { getContests } from "@/lib/arena/server";

export const revalidate = 15;

export async function GET() {
  const r = await getContests();
  return NextResponse.json(r, {
    headers: { "x-arena-source": r.source, "cache-control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
