# Arena simulations — API for other pages

Visual reproductions of the published rules (not the production engine). Pure, deterministic (mulberry32),
fixed timestep 20 ticks/s, render-independent. Same seed → same match.

## Components (client, `'use client'`)

```tsx
import TerritoryCanvas from "@/components/sim/TerritoryCanvas";
import FoodCanvas from "@/components/sim/FoodCanvas";
import TensorView from "@/components/sim/TensorView";
```

`<TerritoryCanvas />` props (all optional):
| prop | default | notes |
|---|---|---|
| `seed` | 7 | changing seed/agents recreates the sim |
| `agents` | 12 | |
| `accelerated` | false | 3× speed (90s match in 30s), HUD badge "ACCELERATED ×3" |
| `paused` | false | renders one static composed frame |
| `frozen` | false | sim eases to a halt (~1.5s) + crystalline frost overlay, HUD badge "FROZEN" |
| `hud` | true | `MATCH 01:02 / 90s · TICK 1240 · TILES CLAIMED 1123/1600` + top-5 |
| `className` | | **give the wrapper a size** (e.g. `h-[80vh] w-full` or `aspect-square`). Grid is contain-fitted; lattice extends faintly to edges so it works full-bleed. |
| `onReady(sim)` | | called once with the stable sim object (mutated in place, survives match resets). Use it for `<TensorView>`. |
| `onFrame(sim)` | | called each rendered frame the sim advanced. Do NOT setState here every frame. |
| `colors` | built-in palette | e.g. live leaderboard `color` values |
| `labels` | `AGENT 01…` | HUD names per agent id (use masked names only) |
| `warmSec` | 4 | pre-simulated seconds before first frame |

`<FoodCanvas />`: same props (+ `w`, `h` world size, default 60×36 → wide aspect). HUD: tokens taken / on field.

`<TensorView sim={sim} agentId={0} />`: 5 stacked isometric channel layers (`obs_0 · [5, 40, 40]`) + 3 live action gauges
(`continuous_actions · [3]`), caption from `HOME.core`. Polls the sim itself at 20Hz while visible.

```tsx
const [sim, setSim] = useState<TerritorySim | null>(null);
<TerritoryCanvas onReady={setSim} accelerated className="aspect-square w-full" />
{showTensor && <TensorView sim={sim} />}
```

Behaviour baked in: ResizeObserver + DPR cap 2; rAF stops when offscreen (IntersectionObserver) or paused;
`useUI().motion === false` → one static composed frame (sim pre-warmed ~50s so it looks mid-match);
colours read from CSS vars at render (Field / Stands, also a local `data-mode` subtree) and re-read on mode change.
Every canvas is `aria-hidden`; each component includes an sr-only description.

## Pure sims (no DOM)

```ts
import { createTerritory, FLIP_TICKS } from "@/sim/territory";
const sim = createTerritory({ seed: 1, agents: 12 }); // w,h=40, matchSec=90
sim.step(); sim.tick; sim.timeSec; sim.owner /* Int16Array, -1 neutral */; sim.flip; sim.frozen;
sim.agents[i] /* {id,x,y,vx,vy,color,tiles,lastScoreTick,action:[move_x,move_z,boost]} */
sim.ranking(); sim.observe(agentId, out?) /* Float32Array[5*40*40], channel-major */; sim.reset(seed?); sim.setColors([...]);

import { createFood } from "@/sim/food";
const f = createFood({ seed: 1, agents: 10 }); f.step(); f.tokens; f.agents[i].trail; f.onBurst(b => ...); f.ranking();
```

Observation channels: 0 own tiles · 1 enemy tiles · 2 neutral · 3 agent positions (self 1, others 0.5) · 4 frozen (1) / flip progress.
Sims stop at `ended` (tick ≥ matchTicks); the canvases hold the final frame 2.6s then loop with `seed + 1`.
