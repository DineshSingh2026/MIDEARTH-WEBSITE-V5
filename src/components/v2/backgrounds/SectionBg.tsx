"use client";
/**
 * <SectionBg kind="network" /> — a data-related canvas behind a section.
 * Absolutely positioned, aria-hidden, pointer-events none, masked so it fades out at the edges
 * and (by default) away from the text column on the left. Usually set via `<Section bg="…">`.
 * The scene fades + settles in the first time the section is seen (`data-on`, see globals.css).
 */
import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { useUI } from "@/store/ui";
import { mountScene } from "./engine";
import { SCENE_TONE, SCENES, type BgKind } from "./scenes";

export type BgFade = "right" | "left" | "center" | "edges";

const V = "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)";
/** banded: solid behind the header row, dissolving into the content below */
const VB = "linear-gradient(to bottom, transparent, #000 12%, #000 52%, transparent)";
const MASKS: Record<BgFade, string> = {
  // text column (left ~45%) stays clean; the scene owns the right half
  right: `linear-gradient(to right, transparent 38%, rgba(0,0,0,.4) 50%, #000 64%, #000 95%, transparent), ${V}`,
  left: `linear-gradient(to left, transparent 38%, rgba(0,0,0,.4) 50%, #000 64%, #000 95%, transparent), ${V}`,
  center: "radial-gradient(62% 68% at 50% 50%, #000 25%, transparent 100%)",
  edges: `linear-gradient(to right, rgba(0,0,0,.4), rgba(0,0,0,.12) 22%, rgba(0,0,0,.2) 55%, #000 82%), ${V}`,
};

const SEED: Record<BgKind, number> = { network: 11, territory: 23, flow: 37, chain: 41, ranks: 53, forecast: 67, code: 71, racks: 83, pillars: 89, pods: 97, debate: 101, marketplace: 107 };

const BG_QUERY = "(min-width: 768px)";
const lowPower = () => typeof navigator !== "undefined" && (navigator.hardwareConcurrency || 8) <= 4;
const subscribeBg = (cb: () => void) => {
  const mq = window.matchMedia(BG_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** backgrounds only on screens ≥768px and devices with more than 4 cores; nothing on the server pass */
function useBgEnabled() {
  return useSyncExternalStore(
    subscribeBg,
    () => window.matchMedia(BG_QUERY).matches && !lowPower(),
    () => false,
  );
}

export default function SectionBg({ kind, fade = "right", opacity = 1, band, className = "" }: { kind: BgKind; fade?: BgFade; opacity?: number; band?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motion = useUI((s) => s.motion);
  const enabled = useBgEnabled();
  useEffect(() => {
    const c = ref.current;
    if (!c || !enabled) return;
    return mountScene(c, SCENES[kind] as (typeof SCENES)["network"], { motion, seed: SEED[kind] });
  }, [kind, motion, enabled]);
  if (!enabled) return null;
  const mask = band ? MASKS[fade].replace(V, VB) : MASKS[fade];
  return (
    <div
      aria-hidden
      data-bg={kind}
      className={`me-bg pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in", opacity, ...(band ? { bottom: "auto", height: `min(100%, ${band}px)` } : null) }}
    >
      <span className="me-aura" style={{ "--aura": SCENE_TONE[kind] } as CSSProperties} />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
