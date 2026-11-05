"use client";
/**
 * Games scene — a slow, dim perspective 40×40 arena floor receding into the dark.
 * Tile claims come from a real (seeded) Territory Control sim stepped at quarter speed, so even the
 * background obeys the published rules. Kept faint: it is atmosphere behind the DOM, not content.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createTerritory } from "@/sim/territory";
import { frameState } from "../registry";
import { useUI } from "@/store/ui";

const S = 40;
const SIZE = 22; // world units across

export default function GamesScene() {
  const motion = useUI((s) => s.motion);
  const mode = useUI((s) => s.mode);
  const sim = useMemo(() => {
    const s = createTerritory({ seed: 23, agents: 10 });
    for (let i = 0; i < 20 * 30; i++) s.step();
    return s;
  }, []);
  const group = useRef<THREE.Group>(null);
  const tiles = useRef<THREE.InstancedMesh>(null);
  const acc = useRef(0);

  const { gridGeo, tileGeo } = useMemo(() => {
    const pts: number[] = [];
    const c = SIZE / S;
    for (let i = 0; i <= S; i++) {
      const p = -SIZE / 2 + i * c;
      pts.push(p, 0, -SIZE / 2, p, 0, SIZE / 2, -SIZE / 2, 0, p, SIZE / 2, 0, p);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const t = new THREE.PlaneGeometry(c * 0.86, c * 0.86);
    t.rotateX(-Math.PI / 2);
    return { gridGeo: g, tileGeo: t };
  }, []);

  const gridMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false }), []);
  const tileMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }),
    [],
  );
  const colors = useMemo(() => sim.agents.map((a) => new THREE.Color(a.color)), [sim]);

  // theme
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const paper = cs.getPropertyValue("--paper").trim() || "#dfe9ec";
    const light = mode === "stands";
    gridMat.color.set(paper);
    gridMat.opacity = light ? 0.12 : 0.07;
    tileMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    tileMat.opacity = light ? 0.1 : 0.14;
    tileMat.needsUpdate = true;
  }, [mode, gridMat, tileMat]);

  // instance layout
  useEffect(() => {
    const m = tiles.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = SIZE / S;
    for (let i = 0; i < S * S; i++) {
      o.position.set(-SIZE / 2 + ((i % S) + 0.5) * c, 0.001, -SIZE / 2 + (((i / S) | 0) + 0.5) * c);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(0, 0, 0));
    }
    m.instanceMatrix.needsUpdate = true;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const black = useMemo(() => new THREE.Color(0, 0, 0), []);
  function paint() {
    const m = tiles.current;
    if (!m) return;
    for (let i = 0; i < S * S; i++) {
      const o = sim.owner[i];
      m.setColorAt(i, o >= 0 ? colors[o] : black);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  useEffect(
    () => () => {
      gridGeo.dispose();
      tileGeo.dispose();
      gridMat.dispose();
      tileMat.dispose();
    },
    [gridGeo, tileGeo, gridMat, tileMat],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    if (motion) {
      acc.current += Math.min(dt, 0.1) * 5; // quarter speed
      let n = 0;
      while (acc.current >= 1 && n < 4) {
        if (sim.ended) sim.reset(sim.seed + 1);
        sim.step();
        acc.current -= 1;
        n++;
      }
      if (n) paint();
      const t = state.clock.elapsedTime;
      g.rotation.y = t * 0.012 + frameState.pointer.x * 0.05;
      g.position.y = -3.1 + frameState.pointer.y * 0.12;
    }
  });

  return (
    <group position={[0, -3.1, -6]} rotation={[0.08, 0, 0]}>
      <group ref={group}>
        <lineSegments geometry={gridGeo} material={gridMat} />
        <instancedMesh ref={tiles} args={[tileGeo, tileMat, S * S]} frustumCulled={false} />
      </group>
    </group>
  );
}
