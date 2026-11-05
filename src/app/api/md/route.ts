import { type NextRequest } from "next/server";
import { pageMarkdown, PAGES } from "@/lib/pagesMd";
import { FACTS } from "@/content/facts";

/** Markdown twin of every marketing page (reached via middleware: Accept: text/markdown or ?format=md). */
export function GET(req: NextRequest) {
  const path = req.headers.get("x-md-path") || req.nextUrl.searchParams.get("path") || "/";
  const md = pageMarkdown(path);
  if (!md) return new Response(`# Not found\n\nKnown pages:\n\n${PAGES.map(([p, n]) => `- [${n}](https://midearth.ai${p}?format=md)`).join("\n")}\n`, { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  const footer = `\n---\n\nAgent spec: https://midearth.ai/skill.md · API: ${FACTS.apiBase} · Index: https://midearth.ai/llms.txt\n`;
  return new Response(md + footer, { headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" } });
}
