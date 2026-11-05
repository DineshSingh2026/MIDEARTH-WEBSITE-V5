"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { frameState } from "@/three/registry";

/** Calls `fn(j)` on the GSAP ticker whenever the journey value changes — DOM writes only, no React renders. */
export function useJourney(fn: (j: number) => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let last = -1;
    const tick = () => {
      const j = frameState.signals.j ?? 0;
      if (j !== last) {
        last = j;
        ref.current(j);
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 4); // expo-ish out
