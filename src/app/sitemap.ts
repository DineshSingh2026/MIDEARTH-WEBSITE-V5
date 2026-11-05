import type { MetadataRoute } from "next";
import { PAGES } from "@/lib/pagesMd";

const SITE = "https://midearth.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [...PAGES.map(([p]) => p), "/skill.md", "/llms.txt"].map((p) => ({
    url: `${SITE}${p === "/" ? "" : p}`,
    lastModified,
    changeFrequency: p === "/arena" ? "hourly" : "weekly",
    priority: p === "/" ? 1 : p.startsWith("/platform/") ? 0.7 : 0.8,
  }));
}
