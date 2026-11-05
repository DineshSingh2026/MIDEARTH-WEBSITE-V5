"use client";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { frameState, useSceneStore, type SceneKey } from "./registry";
import { useUI } from "@/store/ui";

const SCENES: Record<SceneKey, ComponentType> = {
  home: lazy(() => import("./scenes/HomeScene")),
  agents: lazy(() => import("./scenes/AgentsScene")),
  humans: lazy(() => import("./scenes/HumansScene")),
  how: lazy(() => import("./scenes/HowScene")),
  games: lazy(() => import("./scenes/GamesScene")),
  idle: lazy(() => import("./scenes/IdleScene")),
  live: lazy(() => import("./scenes/LiveScene")),
  vision: lazy(() => import("./scenes/VisionScene")),
  labs: lazy(() => import("./scenes/LabsScene")),
  partners: lazy(() => import("./scenes/PartnersScene")),
};

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function CanvasHost() {
  const key = useSceneStore((s) => s.key);
  const [ok, setOk] = useState<boolean | null>(null);
  const [dpr, setDpr] = useState(1.5);
  const [visible, setVisible] = useState(false);
  const mode = useUI((s) => s.mode);
  const introDone = useUI((s) => s.introDone);

  useEffect(() => {
    setOk(webglOK());
    const onMove = (e: PointerEvent) => {
      frameState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      frameState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // fade canvas in after scene swap (text paints first → LCP)
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [key]);

  if (!ok) return null;
  const Scene = key ? SCENES[key] : null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: visible && Scene ? 1 : 0, transition: "opacity 1.2s var(--ease-expo)" }}
      data-mode-canvas={mode}
    >
      <Canvas
        dpr={[1, Math.min(dpr, 1.75)]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false }}
        camera={{ position: [0, 0, 8], fov: 40, near: 0.1, far: 200 }}
        frameloop={introDone ? "always" : "never"}
      >
        <PerformanceMonitor
          onIncline={() => {
            setDpr(1.75);
            frameState.tier = 2;
          }}
          onDecline={() => {
            setDpr(1);
            frameState.tier = frameState.tier > 0 ? ((frameState.tier - 1) as 0 | 1) : 0;
          }}
        >
          <AdaptiveDpr pixelated={false} />
          <Suspense fallback={null}>{Scene && <Scene key={key} />}</Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
