"use client";
/**
 * The Agent Exchange (lazy chunk): three glossy MidEarth dome agents on a floating glass plinth,
 * gold value motes spiralling up into five slim golden rings (the five revenue pillars).
 * One Canvas, dpr <= 1.5, bounded instanced motes, no per-frame allocations, frameloop driven by the stage.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";

export type ExPalette = { void: string; signal: string; agent: string; value: string; light: boolean };

const MOTES = 90;
const RINGS = 5;

function domeGeometry() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(0.88, 0), new THREE.Vector2(0.97, 0.03), new THREE.Vector2(1, 0.1)];
  for (let i = 1; i <= 20; i++) {
    const a = (i / 20) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.pow(Math.cos(a), 0.75)), 0.1 + 0.68 * Math.pow(Math.sin(a), 0.95)));
  }
  const g = new THREE.LatheGeometry(pts, 48);
  const stops = [new THREE.Color("#2a9bf0"), new THREE.Color("#36bfb0"), new THREE.Color("#3edb8e"), new THREE.Color("#57ff5e")];
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(0.999, Math.max(0, pos.getY(i) / 0.78)) * 3;
    const k = Math.floor(t);
    c.copy(stops[k]).lerp(stops[k + 1], t - k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function Agent({ geo, angle, scale, phase }: { geo: THREE.BufferGeometry; angle: number; scale: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) ref.current.position.y = 0.2 + Math.sin(t * 0.9 + phase) * 0.04;
  });
  const r = 0.95;
  return (
    <group ref={ref} position={[Math.sin(angle) * r, 0.2, Math.cos(angle) * r]} rotation-y={angle + 0.5} scale={scale}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial vertexColors roughness={0.22} metalness={0} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      {[0.35, 0.72].map((az, i) => (
        <mesh key={i} position={[Math.sin(az) * 0.78, 0.5 + i * 0.05, Math.cos(az) * 0.78]} rotation={[-0.2, az, -0.2]} scale={[0.08, 0.12, 0.04]}>
          <sphereGeometry args={[1, 20, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

const _m = new THREE.Object3D();

function Value({ pal }: { pal: ExPalette }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: MOTES }, (_, i) => ({ p: i / MOTES, a: (i * 2.399) % (Math.PI * 2), s: 0.06 + (i % 7) * 0.006 })), []);
  const gold = useMemo(() => new THREE.Color(pal.value).multiplyScalar(pal.light ? 0.9 : 3), [pal]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < MOTES; i++) {
      const s = seeds[i];
      const u = (s.p + t * s.s) % 1;
      const ang = s.a + u * Math.PI * 3 + t * 0.15;
      const rad = 1.7 - u * 0.9;
      _m.position.set(Math.cos(ang) * rad, 0.15 + u * 3.1, Math.sin(ang) * rad);
      _m.scale.setScalar(0.028 * Math.sin(Math.PI * u));
      _m.updateMatrix();
      m.setMatrixAt(i, _m.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MOTES]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={gold} toneMapped={false} />
    </instancedMesh>
  );
}

function Rings({ pal }: { pal: ExPalette }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((c, i) => {
      c.rotation.z = t * (0.05 + i * 0.015) * (i % 2 ? -1 : 1);
      c.position.y = 1.55 + i * 0.42 + Math.sin(t * 0.5 + i) * 0.03;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh key={i} rotation-x={Math.PI / 2 + 0.08 * (i - 2)}>
          <torusGeometry args={[1.25 - i * 0.12, 0.012, 12, 160]} />
          <meshPhysicalMaterial color={pal.value} metalness={1} roughness={0.18} clearcoat={1} emissive={pal.value} emissiveIntensity={pal.light ? 0.15 : 0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ pointer }: { pointer: { current: { x: number; y: number } } }) {
  const { camera } = useThree();
  const sm = useRef({ x: 0, y: 0 });
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-Math.min(0.05, dt) * 2);
    sm.current.x += (pointer.current.x - sm.current.x) * k;
    sm.current.y += (pointer.current.y - sm.current.y) * k;
    const az = 0.35 + Math.sin(t * 0.06) * 0.17 + sm.current.x * 0.06;
    camera.position.set(Math.sin(az) * 8.6, 3.1 - sm.current.y * 0.2, Math.cos(az) * 8.6);
    camera.lookAt(0, 1.35, 0);
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 3) onReady();
  });
  return null;
}

export default function ExchangeCanvas({ pal, active, still, pointer, onReady }: { pal: ExPalette; active: boolean; still: boolean; pointer: { current: { x: number; y: number } }; onReady: () => void }) {
  const geo = useMemo(domeGeometry, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <Canvas
      frameloop={still ? "demand" : active ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 32, near: 0.1, far: 60, position: [3, 3.1, 8] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden
    >
      <Rig pointer={pointer} />
      <Ready onReady={onReady} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 7, 5]} intensity={1.4} color="#fff3e0" />
      <pointLight position={[0, 1.6, 0]} intensity={8} distance={6} color={pal.value} />
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer form="rect" intensity={3} color="#fff4e6" scale={[6, 3, 1]} position={[-4, 5, 4]} />
        <Lightformer form="rect" intensity={1.6} color={pal.agent} scale={[8, 1.5, 1]} position={[0, 2, -6]} />
        <Lightformer form="ring" intensity={2} color={pal.value} scale={4} position={[0, 7, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1} color={pal.signal} scale={[6, 1, 1]} position={[6, 1, 2]} rotation-y={-Math.PI / 2} />
      </Environment>
      {/* plinth: glass disc over a dark lacquer base, gold rim */}
      <mesh position-y={-0.08}>
        <cylinderGeometry args={[1.9, 1.75, 0.16, 96]} />
        <meshPhysicalMaterial color={pal.light ? "#1a1d24" : "#0b1016"} metalness={0.6} roughness={0.25} clearcoat={1} />
      </mesh>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[1.8, 1.8, 0.04, 96]} />
        <meshPhysicalMaterial color={pal.agent} metalness={0.1} roughness={0.05} clearcoat={1} transparent opacity={0.35} />
      </mesh>
      <mesh position-y={0.0} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.9, 0.02, 12, 160]} />
        <meshPhysicalMaterial color={pal.value} metalness={1} roughness={0.2} emissive={pal.value} emissiveIntensity={pal.light ? 0.2 : 0.8} />
      </mesh>
      {[0, 2.09, 4.19].map((a, i) => (
        <Agent key={i} geo={geo} angle={a} scale={i === 0 ? 0.55 : 0.45} phase={i * 1.7} />
      ))}
      <Value pal={pal} />
      <Rings pal={pal} />
      {!pal.light && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1} luminanceSmoothing={0.2} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
