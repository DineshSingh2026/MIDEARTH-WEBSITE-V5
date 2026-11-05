"use client";
/**
 * The Watch scene (lazy chunk). One <Canvas>, frameloop driven by the stage (visible + tab shown + motion),
 * dpr capped at 1.5, PerformanceMonitor steps quality down (reflections, MSAA, DOF, dpr) and finally asks the
 * stage to fall back to the poster. Every geometry/material/texture is disposed by its owner on unmount.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { Director, type LiveFeed } from "./director";
import type { WatchPalette } from "./palette";
import Board from "./parts/Board";
import Hologram from "./parts/Hologram";
import Room from "./parts/Room";
import Spectators, { makeSeats } from "./parts/Spectators";
import Jumbotron from "./parts/Jumbotron";

export type Framing = {
  /** share of the canvas width the composition is pushed right (0 = centred). Leaves room for overlaid text. */
  shift: number;
  /** camera distance multiplier */
  dist: number;
  /** look-at height */
  lookY: number;
  /** camera height */
  camY: number;
};

type Props = {
  feed: LiveFeed;
  palette: WatchPalette;
  active: boolean;
  compact: boolean;
  framing: Framing;
  pointer: { current: { x: number; y: number } };
  forcedTier?: number | null;
  onReady: () => void;
  onFallback: () => void;
};

/** 2 = full (reflections 512, MSAA, DOF) · 1 = reflections 256, no DOF · 0 = no reflections, dpr 1 */
type Tier = 0 | 1 | 2;

export default function WatchCanvas({ feed, palette, active, compact, framing, pointer, forcedTier, onReady, onFallback }: Props) {
  const director = useMemo(() => new Director(feed), [feed]);
  const [tier, setTier] = useState<Tier>(() => (forcedTier != null ? (Math.max(0, Math.min(2, forcedTier)) as Tier) : compact ? 1 : 2));
  const declines = useRef(0);
  const seats = useMemo(() => makeSeats(compact || tier === 0), [compact, tier]);
  const dpr: [number, number] = tier === 0 ? [1, 1] : compact ? [1, 1.25] : [1, 1.5];

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 3, 11] }}
      onCreated={({ gl, camera }) => {
        (camera as THREE.PerspectiveCamera & { manual?: boolean }).manual = true;
        gl.setClearColor(new THREE.Color(palette.void), 1);
        gl.toneMapping = THREE.NoToneMapping;
        const lost = (e: Event) => {
          e.preventDefault();
          onFallback();
        };
        gl.domElement.addEventListener("webglcontextlost", lost, { once: true });
      }}
      aria-hidden
    >
      <color attach="background" args={[palette.void]} />
      <fog attach="fog" args={[palette.void, 14, 30]} />
      {forcedTier == null && (
        <PerformanceMonitor
          flipflops={4}
          onDecline={() => {
            declines.current++;
            setTier((t) => {
              if (t === 0 && declines.current > 3) onFallback();
              return (t > 0 ? t - 1 : 0) as Tier;
            });
          }}
          onIncline={() => setTier((t) => (t < (compact ? 1 : 2) ? ((t + 1) as Tier) : t))}
        />
      )}
      <Rig director={director} framing={framing} pointer={pointer} />
      <Ready onReady={onReady} />
      <Lights palette={palette} />
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer form="ring" intensity={2.2} color={palette.agent} scale={6} position={[0, 7, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color={palette.signal} scale={[10, 1.2, 1]} position={[0, 3, -10]} />
        <Lightformer form="rect" intensity={0.8} color={palette.blue} scale={[10, 1.2, 1]} position={[-9, 2.5, 3]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.7} color={palette.agent} scale={[10, 1.2, 1]} position={[9, 2.5, 3]} rotation-y={-Math.PI / 2} />
        <Lightformer form="circle" intensity={2.5} color={palette.frost} scale={2.5} position={[0, 2, 0]} />
      </Environment>
      <Room director={director} palette={palette} reflect={tier === 2 ? 512 : tier === 1 && !compact ? 256 : 0} compact={compact} />
      <Hologram director={director} palette={palette} />
      <Board director={director} palette={palette} />
      <Spectators director={director} palette={palette} seats={seats} segments={compact ? 40 : 56} />
      <Jumbotron director={director} palette={palette} y={compact ? 4.6 : 4.15} />
      <Post tier={tier} />
    </Canvas>
  );
}

/** tier 0 = no postprocessing at all (renderer tone maps directly) */
function Post({ tier }: { tier: Tier }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = tier === 0 ? THREE.AgXToneMapping : THREE.NoToneMapping;
  }, [gl, tier]);
  if (tier === 0) return null;
  return (
    <EffectComposer multisampling={tier === 2 ? 4 : 0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.72} />
      {tier === 2 ? <DepthOfField target={[0, 1.4, 0]} worldFocusRange={9} bokehScale={2.2} height={480} /> : null}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.18} />
    </EffectComposer>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 3) onReady();
  });
  return null;
}

function Lights({ palette }: { palette: WatchPalette }) {
  return (
    <>
      <ambientLight intensity={0.12} color={palette.frost} />
      <hemisphereLight args={[palette.agent, palette.void, 0.25]} />
      {/* the hologram lights the room */}
      <pointLight position={[0, 1.9, 0]} intensity={26} distance={16} decay={1.6} color={palette.agent} />
      <pointLight position={[0, 6.6, 0]} intensity={10} distance={12} decay={1.6} color={palette.frost} />
      {/* soft fill from the camera side so the near domes keep their gradient */}
      <directionalLight position={[2, 6, 12]} intensity={0.55} color={palette.frost} />
      <directionalLight position={[-6, 3, -8]} intensity={0.6} color={palette.signal} />
    </>
  );
}

const _look = new THREE.Vector3();

/** slow orbit + pointer parallax + composition shift (off-centre projection, no distortion) */
function Rig({ director, framing, pointer }: { director: Director; framing: Framing; pointer: Props["pointer"] }) {
  const { camera, size } = useThree();
  const sm = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const w = Math.max(8, size.width);
    const h = Math.max(8, size.height);
    const s = framing.shift;
    const fullW = w * (1 + 2 * s);
    cam.aspect = fullW / h;
    // keep the hologram's width in frame on narrow (portrait) canvases
    const visibleAspect = w / h;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * 1.78);
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / Math.max(0.5, visibleAspect)));
    cam.fov = THREE.MathUtils.clamp(fov, 28, 50);
    if (s > 0) cam.setViewOffset(fullW, h, 0, 0, w, h);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, framing.shift]);

  useFrame((_, dt) => {
    director.update(dt);
    const t = director.time;
    const k = 1 - Math.exp(-Math.min(0.05, dt) * 2.5);
    sm.current.x += (pointer.current.x - sm.current.x) * k;
    sm.current.y += (pointer.current.y - sm.current.y) * k;
    const az = Math.sin(t * 0.045) * 0.2 + sm.current.x * 0.07;
    const r = 11.2 * framing.dist + Math.sin(t * 0.06) * 0.25 - director.excite * 0.25;
    const y = framing.camY + Math.sin(t * 0.07) * 0.12 - sm.current.y * 0.18;
    camera.position.set(Math.sin(az) * r, y, Math.cos(az) * r);
    _look.set(sm.current.x * 0.15, framing.lookY, 0);
    camera.lookAt(_look);
  });
  return null;
}
