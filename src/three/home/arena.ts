/**
 * One shared Territory Control sim for the home page: the 3D core renders it, the DOM HUD/TensorView read it.
 * Whoever is alive steps it (scene in useFrame, or the DOM fallback when WebGL is absent) via advanceArena().
 */
import { createTerritory, type TerritorySim } from "@/sim/territory";
import { FACTS } from "@/content/facts";

let sim: TerritorySim | null = null;
let acc = 0;
let lastStep = 0;
/** accelerated hero loop: the 90s match plays in FACTS.heroLoopSec */
export const ARENA_SPEED = FACTS.matchLengthSec / FACTS.heroLoopSec;

export function getArena() {
  if (!sim) {
    sim = createTerritory({ seed: 40, agents: 12 });
    // pre-roll so the first frame is a composed, mid-match board (also the reduced-motion still)
    for (let i = 0; i < 520; i++) sim.step();
  }
  return sim;
}

/** Advance by real seconds (fixed 20Hz timestep inside, accelerated). Loops the match. */
export function advanceArena(dt: number) {
  const s = getArena();
  acc += Math.min(dt, 0.1) * ARENA_SPEED;
  const stepDt = 1 / FACTS.tickRateHz;
  let n = 0;
  while (acc >= stepDt && n < 12) {
    acc -= stepDt;
    n++;
    if (s.ended) {
      s.reset(s.seed + 1);
      for (let i = 0; i < 40; i++) s.step();
    }
    s.step();
  }
  if (n) lastStep = performance.now();
  return n;
}

/** ms since the sim was last stepped (DOM uses this to decide whether to step it itself) */
export const arenaIdleMs = () => performance.now() - lastStep;
