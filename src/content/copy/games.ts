import { FACTS } from "../facts";

export const GAMES = {
  eyebrow: "ENVIRONMENTS · REAL-TIME",
  h1: "Two environments. Both physical.",
  sub: "No turns, no move timers, no chess clock. A match is a continuous simulation on a fixed timestep, and every agent in the pool is stepped together.",
  engine:
    "Custom NumPy and CuPy physics ported from Unity ML-Agents environments, architected to scale toward roughly 1,000 concurrent agents per match.",
  envs: [
    {
      slug: "territorycontrol",
      name: "Territory Control",
      status: "LIVE",
      lead: "Claim tiles on a shared grid just by standing on them. The agent with the most territory when the clock runs out wins.",
      rules: [
        "Walking onto a neutral tile claims it instantly.",
        "Walking onto a tile someone else owns and holding it for about a second flips it to you. Step off and that progress resets.",
        "Two or more agents contesting the same tile in the same tick freeze it: no claim, no flip. It's a deliberate fairness rule, never resolved in favour of whoever was \"first\".",
        "Real-time physics on a fixed timestep: every agent acts on the same tick.",
      ],
      match: `${FACTS.matchLengthSec}s · ranked by final score · ties broken by the earlier scoring tick`,
      pool: `capacity ${FACTS.poolCapacity} agents · entry fee ${FACTS.entryFees.join(" / ")} IDLE · opens on a recurring schedule`,
      input: FACTS.games[0].input,
      output: FACTS.games[0].output,
    },
    {
      slug: "foodcollector",
      name: "Food Collector",
      status: "LIVE",
      lead: "Collect food tokens of different values before anyone else reaches them.",
      rules: [
        "Food tokens spawn continuously and carry different point values.",
        "Collection is contact-based and exclusive: the first agent there takes it.",
        "The field is shared and contested. Path efficiency matters more than speed.",
        "Real-time physics on a fixed timestep.",
      ],
      match: `${FACTS.matchLengthSec}s · ranked by final score · ties broken by the earlier scoring tick`,
      pool: `capacity ${FACTS.poolCapacity} agents · entry fee ${FACTS.entryFees.join(" / ")} IDLE · opens on a recurring schedule`,
      input: FACTS.games[1].input,
      output: FACTS.games[1].output,
    },
  ],
  fairness: {
    title: "The architecture is locked on purpose.",
    body: "Every game publishes one base ONNX architecture. You fine-tune it, upload your weights, and the platform checks that the shape matches exactly before you can enter a pool. An upload that doesn't match is rejected with a 400, not quietly resized. The effect: a pool measures how well you trained, not how much model you could afford. Two agents in the same match run the same shape with different weights.",
    ok: "201 shape verified, eligible to enter",
    bad: "400 shape mismatch, upload rejected",
    path: "POST /api/v1/gateway/upload-model",
  },
} as const;
