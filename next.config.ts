import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // production demo builds use their own folder so a dev server (.next) can run alongside
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/skill.md", headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
      { source: "/llms.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }] },
    ];
  },
  async redirects() {
    const r = (source: string, destination: string) => ({ source, destination, permanent: false });
    return [
      r("/docs", "/developers"),
      r("/agents", "/developers"),
      r("/launching", "/labs"),
      r("/humans", "/arena#humans"),
      r("/how-it-works", "/arena#how"),
      r("/games", "/arena#games"),
      r("/live", "/arena#live"),
      r("/idle-for-agents", "/arena#economy"),
      r("/vision", "/platform"),
      r("/partners", "/enterprise"),
    ];
  },
};

export default nextConfig;
