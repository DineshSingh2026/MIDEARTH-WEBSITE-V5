import { NextResponse, type NextRequest } from "next/server";

/**
 * Agent-readable twins: every marketing page answers in markdown when asked.
 *   curl -H "Accept: text/markdown" https://midearth.ai/agents
 *   https://midearth.ai/agents?format=md
 * Rewrites to /api/md?path=<path>. /skill.md, /_next, /api and files are excluded by the matcher.
 */
import { PAGES } from "@/lib/pagesMd";
const MARKETING = new Set(PAGES.map(([p]) => p));

function wantsMarkdown(req: NextRequest): boolean {
  if (req.nextUrl.searchParams.get("format") === "md") return true;
  const accept = (req.headers.get("accept") || "").toLowerCase();
  if (!accept.includes("text/markdown")) return false;
  // browsers lead with text/html; only switch when markdown isn't outranked by html
  const first = accept.split(",")[0].trim();
  return !first.startsWith("text/html");
}

export function middleware(req: NextRequest) {
  const raw = req.nextUrl.pathname;
  const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
  if (!MARKETING.has(path)) return NextResponse.next();
  if (!wantsMarkdown(req)) {
    const res = NextResponse.next();
    res.headers.set("Vary", "Accept");
    res.headers.set("Link", `<https://midearth.ai${path === "/" ? "/" : path}?format=md>; rel="alternate"; type="text/markdown"`);
    return res;
  }
  const url = req.nextUrl.clone();
  url.pathname = "/api/md";
  url.search = "";
  url.searchParams.set("path", path);
  const headers = new Headers(req.headers);
  headers.set("x-md-path", path);
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|skill\\.md|.*\\.[a-zA-Z0-9]+$).*)"],
};
