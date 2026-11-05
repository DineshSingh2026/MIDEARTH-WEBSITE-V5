"use client";
/**
 * The amphitheatre: stepped tiers with lit edges around a reflective pit, a dark ribbed drum wall with
 * curved light strips, a ceiling halo above the hologram and drifting dust in the light.
 */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { TIERS, tierGeometry, wallPanelTexture } from "../geom";
import type { Director } from "../director";
import type { WatchPalette } from "../palette";

const WALL_R = 13.5;
const WALL_H = 9;
const DUST = 240;

const dustVert = /* glsl */ `
uniform float uTime; uniform float uPx;
attribute float aSeed;
varying float vA;
void main(){
  vec3 p = position;
  float t = uTime * (0.04 + aSeed * 0.05);
  p.x += sin(t * 3.0 + aSeed * 40.0) * 0.35;
  p.z += cos(t * 2.3 + aSeed * 17.0) * 0.35;
  p.y = mod(p.y + t * 1.2, 6.5) + 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float r = length(p.xz);
  vA = (1.0 - smoothstep(2.5, 6.5, r)) * smoothstep(0.3, 1.2, p.y) * (1.0 - smoothstep(5.0, 6.8, p.y)) * (0.4 + 0.6 * fract(aSeed * 7.13));
  gl_PointSize = uPx * (0.7 + aSeed) * (14.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const dustFrag = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.0) * vA; gl_FragColor = vec4(uColor * a, 1.0); }`;

const wallFrag = /* glsl */ `
uniform vec3 uBase; uniform vec3 uLine; uniform float uTime;
varying vec2 vUv; varying vec3 vW;
void main(){
  // brushed dark drum with panel seams and faint vertical gradient
  float panelsX = pow(abs(sin(vUv.x * 3.14159 * 72.0)), 120.0);
  float panelsY = pow(abs(sin(vW.y * 3.14159 * 0.72)), 160.0);
  float seam = max(panelsX, panelsY);
  float g = smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  vec3 c = uBase * (0.45 + 0.55 * g) + uLine * seam * 0.022;
  gl_FragColor = vec4(c, 1.0);
}`;
const wallVert = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

/** curved strips: [radius, y, start angle, arc length, colour key, tube] — θ measured like the seats (0 = camera side) */
const STRIPS: [number, number, number, number, "signal" | "agent" | "blue", number][] = [
  [WALL_R - 0.05, 1.9, 1.7, 2.9, "agent", 0.022],
  [WALL_R - 0.05, 2.25, 2.0, 2.3, "signal", 0.014],
  [WALL_R - 0.05, 4.1, 1.3, 0.9, "blue", 0.02],
  [WALL_R - 0.05, 5.6, 2.4, 1.5, "agent", 0.03],
  [WALL_R - 0.05, 1.9, 4.9, 1.2, "signal", 0.018],
  [WALL_R - 0.05, 1.9, 0.2, 1.1, "signal", 0.018],
];
/** ceiling arcs: [radius, y, start, len, colour, tube] */
const CEIL: [number, number, number, number, "signal" | "agent" | "blue", number][] = [
  [11.6, 7.4, 1.5, 3.2, "agent", 0.04],
  [9.4, 7.8, 2.2, 2.4, "signal", 0.03],
  [9.4, 7.8, 5.0, 1.6, "blue", 0.03],
  [3.4, 6.8, 0, Math.PI * 2, "agent", 0.035],
  [3.1, 6.8, 0, Math.PI * 2, "blue", 0.012],
];

export default function Room({ director, palette, reflect, compact }: { director: Director; palette: WatchPalette; reflect: 0 | 256 | 512; compact: boolean }) {
  const res = useMemo(() => {
    const tierGeo = tierGeometry();
    const tierMat = new THREE.MeshPhysicalMaterial({ color: "#0a1118", roughness: 0.3, metalness: 0.6, clearcoat: 0.9, clearcoatRoughness: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.9 });
    const edgeGeos = TIERS.map((t) => {
      const g = new THREE.TorusGeometry(t.r0 - 0.035, 0.018, 6, 256);
      g.rotateX(Math.PI / 2);
      g.translate(0, t.y + 0.03, 0);
      return g;
    });
    const edgeMats = TIERS.map(() => new THREE.MeshBasicMaterial({ toneMapped: false }));
    const wallGeo = new THREE.CylinderGeometry(WALL_R, WALL_R, WALL_H, 128, 1, true);
    wallGeo.translate(0, WALL_H / 2, 0);
    const wallMat = new THREE.ShaderMaterial({ vertexShader: wallVert, fragmentShader: wallFrag, uniforms: { uBase: { value: new THREE.Color() }, uLine: { value: new THREE.Color() }, uTime: { value: 0 } }, side: THREE.BackSide });
    const ceilGeo = new THREE.CircleGeometry(WALL_R, 96);
    ceilGeo.rotateX(Math.PI / 2);
    ceilGeo.translate(0, WALL_H - 0.6, 0);
    const ceilMat = new THREE.MeshStandardMaterial({ color: "#05080c", roughness: 0.6, metalness: 0.5 });
    const outerFloorGeo = new THREE.RingGeometry(9.5, WALL_R, 96, 1);
    outerFloorGeo.rotateX(-Math.PI / 2);
    const outerFloorMat = new THREE.MeshStandardMaterial({ color: "#060a0f", roughness: 0.35, metalness: 0.6 });
    const pitGeo = new THREE.CircleGeometry(4.4, 96);
    pitGeo.rotateX(-Math.PI / 2);
    const pitMat = new THREE.MeshPhysicalMaterial({ color: "#071017", roughness: 0.12, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05 });
    const mkArcs = (list: typeof STRIPS, inset = 0) =>
      list.map(([r, y, a0, len, , tube]) => {
        const g = new THREE.TorusGeometry(r - inset, tube, 6, Math.max(24, Math.round(len * 60)), len);
        g.rotateX(Math.PI / 2);
        // torus arc starts at +X going towards −Z after rotateX; rotate so the arc begins at θ = a0 (seat convention)
        g.rotateY(a0 - Math.PI / 2 + len);
        g.translate(0, y, 0);
        return g;
      });
    const stripGeos = mkArcs(STRIPS, 0.3);
    const ceilGeos = mkArcs(CEIL);
    const stripMats = { signal: new THREE.MeshBasicMaterial({ toneMapped: false }), agent: new THREE.MeshBasicMaterial({ toneMapped: false }), blue: new THREE.MeshBasicMaterial({ toneMapped: false }) };
    // ribs on the wall (one instanced draw)
    const ribGeo = new THREE.BoxGeometry(0.16, WALL_H, 0.28);
    ribGeo.translate(0, WALL_H / 2, 0);
    const ribMat = new THREE.MeshStandardMaterial({ color: "#0b1219", roughness: 0.4, metalness: 0.7 });
    // decorative wall panels
    const panelTex = wallPanelTexture(palette);
    const panelGeo = new THREE.PlaneGeometry(2.6, 1.3);
    const panelMat = new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    // dust
    const dustGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(DUST * 3);
    const seed = new Float32Array(DUST);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < DUST; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 6.5;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rnd() * 6.5;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rnd();
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uColor: { value: new THREE.Color() } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { tierGeo, tierMat, edgeGeos, edgeMats, wallGeo, wallMat, ceilGeo, ceilMat, outerFloorGeo, outerFloorMat, pitGeo, pitMat, stripGeos, ceilGeos, stripMats, ribGeo, ribMat, panelTex, panelGeo, panelMat, dustGeo, dustMat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.key]);

  useEffect(
    () => () => {
      const all: { dispose(): void }[] = [res.tierGeo, res.tierMat, res.wallGeo, res.wallMat, res.ceilGeo, res.ceilMat, res.outerFloorGeo, res.outerFloorMat, res.pitGeo, res.pitMat, res.ribGeo, res.ribMat, res.panelTex, res.panelGeo, res.panelMat, res.dustGeo, res.dustMat];
      all.push(...res.edgeGeos, ...res.edgeMats, ...res.stripGeos, ...res.ceilGeos, ...Object.values(res.stripMats));
      all.forEach((o) => o.dispose());
    },
    [res],
  );

  useEffect(() => {
    const c = (h: string, k: number) => new THREE.Color(h).multiplyScalar(k);
    res.stripMats.signal.color.copy(c(palette.signal, 2.4));
    res.stripMats.agent.color.copy(c(palette.agent, 2.4));
    res.stripMats.blue.color.copy(c(palette.blue, 2.6));
    res.edgeMats[0].color.copy(c(palette.agent, 2.0));
    res.edgeMats[1].color.copy(c(palette.signal, 1.6));
    res.edgeMats[2].color.copy(c(palette.agent, 1.3));
    res.wallMat.uniforms.uBase.value.set(palette.deck).lerp(new THREE.Color("#0a1622"), 0.5).multiplyScalar(0.5);
    res.wallMat.uniforms.uLine.value.set(palette.agent);
    res.dustMat.uniforms.uColor.value.set(palette.frost).multiplyScalar(0.55);
  }, [palette, res]);

  const ribs = useMemo(() => {
    const count = 40;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const arr: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a);
      arr.push(m.clone().compose(new THREE.Vector3(Math.sin(a) * (WALL_R - 0.1), 0, Math.cos(a) * (WALL_R - 0.1)), q, new THREE.Vector3(1, 1, 1)));
    }
    return arr;
  }, []);

  useFrame((state) => {
    res.dustMat.uniforms.uTime.value = director.time;
    res.dustMat.uniforms.uPx.value = state.viewport.dpr;
  });

  const panels: [number, number][] = [
    [Math.PI - 0.95, 3.0],
    [Math.PI + 0.95, 3.0],
    [Math.PI * 0.5 + 0.2, 2.6],
    [-Math.PI * 0.5 - 0.2, 2.6],
  ];

  return (
    <group>
      <mesh geometry={res.wallGeo} material={res.wallMat} />
      <instancedMesh
        args={[res.ribGeo, res.ribMat, ribs.length]}
        ref={(m) => {
          if (!m) return;
          ribs.forEach((r, i) => m.setMatrixAt(i, r));
          m.instanceMatrix.needsUpdate = true;
        }}
        frustumCulled={false}
      />
      <mesh geometry={res.ceilGeo} material={res.ceilMat} />
      <mesh geometry={res.outerFloorGeo} material={res.outerFloorMat} />
      <mesh geometry={res.tierGeo} material={res.tierMat} />
      {res.edgeGeos.map((g, i) => (
        <mesh key={i} geometry={g} material={res.edgeMats[i]} />
      ))}
      {res.stripGeos.map((g, i) => (
        <mesh key={`s${i}`} geometry={g} material={res.stripMats[STRIPS[i][4]]} />
      ))}
      {res.ceilGeos.map((g, i) => (
        <mesh key={`c${i}`} geometry={g} material={res.stripMats[CEIL[i][4]]} />
      ))}
      {!compact &&
        panels.map(([a, y], i) => (
          <mesh key={`p${i}`} geometry={res.panelGeo} material={res.panelMat} position={[Math.sin(a) * (WALL_R - 0.35), y, Math.cos(a) * (WALL_R - 0.35)]} rotation={[0, a + Math.PI, 0]} />
        ))}
      {reflect > 0 ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <circleGeometry args={[4.4, 96]} />
          <MeshReflectorMaterial
            resolution={reflect}
            blur={[260, 80]}
            mixBlur={0.9}
            mixStrength={4}
            mixContrast={1.1}
            roughness={0.55}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#0a141c"
            metalness={0.6}
            mirror={0.6}
          />
        </mesh>
      ) : (
        <mesh geometry={res.pitGeo} material={res.pitMat} position={[0, 0.002, 0]} />
      )}
      <points geometry={res.dustGeo} material={res.dustMat} frustumCulled={false} renderOrder={10} />
    </group>
  );
}
