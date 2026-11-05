"use client";
/**
 * LiveScene — the stands, seen from above the arena.
 * Inner ring: one seat per slot of the most-filled open pool (lit = filled_slots, live).
 * Outer ring: one light per agent on the board, its colour = color_hex, its height ∝ lifetime earnings.
 * A slow broadcast-camera drift orbits the bowl. Reduced motion: still frame.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useArenaDerived, useArenaStore } from "@/lib/arena/client";
import { useUI } from "@/store/ui";
import { frameState } from "../registry";

const dummy = new THREE.Object3D();
const MAX_SEATS = 200;
const MAX_AGENTS = 120;

export default function LiveScene() {
  const motion = useUI((s) => s.motion);
  const mode = useUI((s) => s.mode);
  const { featured } = useArenaDerived();
  const leaders = useArenaStore((s) => s.leaders);
  const seats = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.Mesh>(null);

  const max = Math.min(MAX_SEATS, featured?.max_slots ?? 100);
  const filled = Math.min(max, featured?.filled_slots ?? 0);
  const ink = mode === "stands";
  const pal = useMemo(
    () => ({
      empty: new THREE.Color(ink ? "#B3BFBE" : "#1D282E"),
      lit: new THREE.Color(ink ? "#067A4B" : "#00FFA3"),
      rule: new THREE.Color(ink ? "#CBD4D3" : "#12191D"),
    }),
    [ink],
  );

  // seats
  useEffect(() => {
    const m = seats.current;
    if (!m) return;
    const R = 3.1;
    for (let i = 0; i < MAX_SEATS; i++) {
      if (i >= max) {
        dummy.scale.setScalar(0);
      } else {
        const a = (i / max) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.set(1, i < filled ? 2.4 : 1, 1);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, i < filled ? pal.lit : pal.empty);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [max, filled, pal]);

  // agents on the board
  useEffect(() => {
    const m = lights.current;
    if (!m) return;
    const n = Math.min(MAX_AGENTS, leaders.length);
    const top = leaders[0]?.earned || 1;
    const R = 4.4;
    const c = new THREE.Color();
    for (let i = 0; i < MAX_AGENTS; i++) {
      if (i >= n) dummy.scale.setScalar(0);
      else {
        const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.02;
        const h = 0.15 + (leaders[i].earned / top) * 1.6;
        dummy.position.set(Math.cos(a) * R, h / 2, Math.sin(a) * R);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.set(1, h, 1);
        c.set(leaders[i].color);
        if (ink) c.multiplyScalar(0.75);
        m.setColorAt(i, c);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leaders, ink]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    if (motion) {
      g.rotation.y += dt * 0.04;
      if (sweep.current) sweep.current.rotation.z = -t * 0.35;
    }
    const px = frameState.pointer.x * 0.15;
    state.camera.position.lerp(new THREE.Vector3(px * 4, 4.6, 8.4), 0.04);
    state.camera.lookAt(0, -0.6, 0);
  });

  return (
    <group ref={group} position={[0, -0.4, 0]}>
      {/* field floor: 40×40 arena */}
      <gridHelper args={[3.6, 40, pal.rule, pal.rule]} />
      <instancedMesh ref={seats} args={[undefined, undefined, MAX_SEATS]}>
        <boxGeometry args={[0.035, 0.12, 0.035]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, MAX_AGENTS]}>
        <boxGeometry args={[0.05, 1, 0.05]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={ink ? 0.9 : 0.85} />
      </instancedMesh>
      {/* broadcast sweep: a thin wedge of light raking the stands */}
      <mesh ref={sweep} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.9, 4.8, 48, 1, 0, 0.32]} />
        <meshBasicMaterial color={ink ? "#0B6E85" : "#22C8E8"} transparent opacity={ink ? 0.07 : 0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.01, 128]} />
        <meshBasicMaterial color={pal.empty} />
      </mesh>
    </group>
  );
}
