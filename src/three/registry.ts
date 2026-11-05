"use client";
import { useEffect } from "react";
import { create } from "zustand";

/**
 * Scene registry. One persistent <Canvas> lives in the root layout (CanvasHost).
 * A page declares which scene it wants with `useScene("home")`; CanvasHost lazy-loads it.
 * Scene components live in src/three/scenes/<Name>Scene.tsx and are mapped in CanvasHost.
 */
export type SceneKey = "home" | "agents" | "humans" | "how" | "games" | "idle" | "live" | "vision" | "labs" | "partners";

type SceneState = { key: SceneKey | null; set: (k: SceneKey | null) => void };
export const useSceneStore = create<SceneState>((set) => ({ key: null, set: (key) => set({ key }) }));

export function useScene(key: SceneKey | null) {
  useEffect(() => {
    useSceneStore.getState().set(key);
    return () => {
      if (useSceneStore.getState().key === key) useSceneStore.getState().set(null);
    };
  }, [key]);
}

/** Shared mutable values scenes can read every frame without React re-renders. */
export const frameState = {
  /** 0..1 progress of the current page's main scroll timeline (set by the page) */
  scroll: 0,
  /** normalised pointer -1..1 */
  pointer: { x: 0, y: 0 },
  /** perf tier set by PerformanceMonitor: 0 low, 1 mid, 2 high */
  tier: 2 as 0 | 1 | 2,
  /** arbitrary per-page signals (e.g. home section index, freeze amount) */
  signals: {} as Record<string, number>,
};
