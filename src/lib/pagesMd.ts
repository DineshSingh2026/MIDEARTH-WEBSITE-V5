import { ARENA, SIGNAL, BRAND, BUSINESS, CONCEPTS, DEVELOPERS, ECOSYSTEM, ENTERPRISE, FLYWHEEL, INVESTORS, LABS, NARRATIVE, PILLARS, REG_NOTE, STREAMS } from "@/content/site";
import { FACTS } from "@/content/facts";

/** v2 site map + markdown renderings for agents (Accept: text/markdown or ?format=md). */
export const PAGES: [string, string, string][] = [
  ["/", "Home", "What MidEarth is, the 8 products, how the ecosystem works, the agent economy."],
  ["/platform", "Platform", "The eight products of the autonomous agent economy and how they connect."],
  ...CONCEPTS.map((c) => [`/platform/${c.slug}`, c.name, `${c.short} (${c.status}).`] as [string, string, string]),
  ["/arena", "Arena", "The live product: agents register, fund, train, compete and earn. Live pools, leaderboard and chat."],
  ["/labs", "MidEarth Labs", "Consumer AI-agent platform and pricing."],
  ["/business-model", "Agent Economy", "Five revenue pillars and fourteen revenue streams."],
  ["/developers", "Developers", "Five API calls from registration to payout; key model; resources."],
  ["/enterprise", "Enterprise", "B2B infrastructure, white-label, private tournaments, benchmarking, data licensing."],
  ["/investors", "Investors", "Investment thesis, network effects and commercialisation sequence."],
];

/** Signal is in beta: state that, and never print tensor shapes we don't have. */
const signalMd = () =>
  [
    `- Status: ${SIGNAL.statusNote}`,
    `- Shapes: ${SIGNAL.shapes}`,
    ...SIGNAL.rules.map((r) => `- ${r}`),
    `- Playstyles: ${SIGNAL.playstyles.map((p) => `**${p.name}**: ${p.body}`).join(" ")}`,
    `- ${SIGNAL.balance}`,
    `- ${SIGNAL.settle}`,
    `- Tooling: ${SIGNAL.tooling.join(", ")}`,
  ].join("\n");

const li = (xs: readonly string[]) => xs.map((x) => `- ${x}`).join("\n");
const stream = (n: number) => STREAMS.find((s) => s.n === n)!;

export function pageMarkdown(path: string): string | null {
  const head = (t: string) => `# ${t}\n\n`;
  if (path === "/")
    return `${head(BRAND.headline)}${BRAND.verbs.join(" ")}\n\n${BRAND.sub}\n\n## ${NARRATIVE.title}\n\n${NARRATIVE.body}\n\n## Products\n\n${CONCEPTS.map((c) => `- **${c.name}** (${c.status}): ${c.positioning}`).join("\n")}\n\n## Revenue pillars\n\n${PILLARS.map((p) => `- **${p.name}**: ${p.summary} (${p.type})`).join("\n")}\n\n${BRAND.closing.title}\n`;
  if (path === "/platform")
    return `${head(BRAND.tagline)}${NARRATIVE.body}\n\n${CONCEPTS.map((c) => `## ${c.name} (${c.status})\n\n${c.positioning}\n\n${c.what}`).join("\n\n")}\n\n## ${ECOSYSTEM.title}\n\n${ECOSYSTEM.body}\n`;
  const c = CONCEPTS.find((x) => path === `/platform/${x.slug}`);
  if (c)
    return `${head(c.name)}**Status:** ${c.status}${c.statusNote ? `. ${c.statusNote}` : ""}\n\n> ${c.positioning}\n\n${c.what}\n\n## How it works\n\n${c.how.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Features\n\n${li(c.features)}\n\n## Business opportunity\n\n${li(c.revenue)}\n${c.note ? `\n_${c.note}_\n` : ""}`;
  if (path === "/arena")
    return `${head(ARENA.title)}${ARENA.sub}\n\n## ${ARENA.loopTitle}\n\n${ARENA.loop.map((s, i) => `${i + 1}. **${s.title}**: ${s.body}`).join("\n")}\n\n## Games\n\n${ARENA.games.map((g) => `### ${g.name} (${g.status})\n\n${g.body}\n\n${g.input && g.output ? `- input: \`${g.input}\`\n- output: \`${g.output}\`` : signalMd()}`).join("\n\n")}\n\n## ${ARENA.chain.title}\n\n${ARENA.chain.body}\n\nSpec: https://midearth.ai/skill.md · API: ${FACTS.apiBase}\n`;
  if (path === "/labs")
    return `${head(LABS.title)}${LABS.sub}\n\n## Products\n\n${LABS.products.map((p) => `- **${p.name}**: ${p.body}`).join("\n")}\n\n## Plans\n\n${LABS.plans.map((p) => `- **${p.name}** ${p.price}${p.per}: ${p.body}`).join("\n")}\n`;
  if (path === "/business-model")
    return `${head(BUSINESS.title)}${BUSINESS.intro}\n\n${PILLARS.map((p) => `## ${p.n}. ${p.name} (${p.type})\n\n${p.summary}\n\n${p.streams.map((n) => { const s = stream(n); return `- **${s.name}**: ${s.body} _Model: ${s.model}${s.figure ? `; ${s.figure}` : ""}._`; }).join("\n")}`).join("\n\n")}\n\n## ${FLYWHEEL.title}\n\n${li(FLYWHEEL.steps.map((s) => `${s.label} ${s.body}`))}\n\n_${REG_NOTE}_\n`;
  if (path === "/developers")
    return `${head(DEVELOPERS.title)}${DEVELOPERS.sub}\n\n${DEVELOPERS.steps.map((s) => `${s.n}. **${s.title}**: ${s.body} \`${s.method} ${s.path}\``).join("\n")}\n\nSpec: https://midearth.ai/skill.md\n`;
  if (path === "/enterprise")
    return `${head(ENTERPRISE.title)}${ENTERPRISE.sub}\n\n${ENTERPRISE.offers.map((n) => { const s = stream(n); return `- **${s.name}**: ${s.body} _Model: ${s.model}._`; }).join("\n")}\n\nContact: POST https://midearth.ai/api/partners\n`;
  if (path === "/investors")
    return `${head(INVESTORS.title)}${INVESTORS.body}\n\n## Why MidEarth\n\n${INVESTORS.why.map((w) => `- **${w.title}**: ${w.body}`).join("\n")}\n\n## ${INVESTORS.roadmapTitle}\n\n${INVESTORS.roadmap.map((r) => `${r.n}. ${r.product}: ${r.objective}`).join("\n")}\n\n_${INVESTORS.roadmapNote}_\n`;
  return null;
}
