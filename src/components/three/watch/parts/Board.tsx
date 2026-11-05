"use client";
/**
 * The live arena: the real 40×40 Territory Control grid as ONE instanced draw call, the sim's agents as
 * small glowing domes (instanced) with light beams, and flip shockwaves (instanced ring pool).
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, BOARD_Y, GRID, N_TILES, SIM_AGENTS, type Director } from "../director";
import { miniDomeGeometry } from "../geom";
import type { WatchPalette } from "../palette";

const TILE = BOARD / GRID;

const tileVert = /* glsl */ `
uniform float uTime;
attribute vec4 aState;   // owned, flip progress, frozen, event time
attribute vec3 aCol;     // owner colour
attribute vec3 aFlipCol; // flipping agent colour
attribute float aKind;   // 1 claim, 2 flip
varying vec3 vCol; varying vec3 vFlipCol; varying vec4 vState; varying vec3 vLocal; varying float vPulse; varying float vKind; varying vec2 vGrid;
void main(){
  vLocal = position;
  vCol = aCol; vFlipCol = aFlipCol; vState = aState; vKind = aKind;
  float age = uTime - aState.w;
  float pulse = age >= 0.0 ? exp(-age * (aKind > 1.5 ? 2.2 : 4.0)) : 0.0;
  vPulse = pulse;
  float h = mix(0.35, 1.0, aState.x) + pulse * (aKind > 1.5 ? 7.0 : 3.0) + aState.y * 2.5;
  vec3 p = position;
  p.y = (p.y + 0.5) * h;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vGrid = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const tileFrag = /* glsl */ `
uniform float uTime; uniform vec3 uNeutral; uniform vec3 uLine; uniform vec3 uFrost; uniform float uBoost;
varying vec3 vCol; varying vec3 vFlipCol; varying vec4 vState; varying vec3 vLocal; varying float vPulse; varying float vKind; varying vec2 vGrid;
void main(){
  vec2 q = vLocal.xz;
  float e = max(abs(q.x), abs(q.y));
  float rim = smoothstep(0.36, 0.5, e);
  float top = step(0.499, vLocal.y);
  // slow travelling light across the neutral glass
  float wave = 0.5 + 0.5 * sin(vGrid.x * 1.7 + vGrid.y * 1.1 - uTime * 0.9);
  vec3 neutral = uNeutral * (0.75 + 0.5 * wave) + uLine * rim * (0.38 + 0.25 * wave);
  float inner = 1.0 - smoothstep(0.0, 0.5, e);
  vec3 owned = vCol * (0.42 + 0.35 * inner + 1.25 * rim);
  vec3 col = mix(neutral, owned, vState.x);
  // claim / flip pulse
  col += mix(vCol, vec3(1.0), 0.35) * vPulse * (vKind > 1.5 ? 3.2 : 1.6);
  // flip progress ring around the edge
  float a = atan(q.y, q.x) / 6.28318 + 0.5;
  float ring = smoothstep(0.34, 0.42, e) * step(a, vState.y) * step(0.001, vState.y);
  col = mix(col, vFlipCol * 3.0, ring);
  // frozen: contested, crystalline white shimmer
  float sh = 0.6 + 0.4 * sin(uTime * 38.0 + (vGrid.x - vGrid.y) * 40.0);
  col = mix(col, uFrost * (2.4 + sh * 1.6), vState.z);
  col *= mix(0.32, 1.0, top);
  gl_FragColor = vec4(col * uBoost, 1.0);
}`;

const waveVert = /* glsl */ `
attribute float aAge; varying float vAge; varying vec2 vUv; varying vec3 vC;
void main(){ vAge = aAge; vUv = uv; vC = instanceColor; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const waveFrag = /* glsl */ `
varying float vAge; varying vec2 vUv; varying vec3 vC;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float ring = smoothstep(0.78, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d));
  float fade = clamp(1.0 - vAge / 1.1, 0.0, 1.0);
  gl_FragColor = vec4(vC * ring * fade * fade * 3.0, 1.0);
}`;

const beamVert = /* glsl */ `
varying vec2 vUv; varying vec3 vC;
void main(){ vUv = uv; vC = instanceColor; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const beamFrag = /* glsl */ `
uniform float uTime; varying vec2 vUv; varying vec3 vC;
void main(){
  float x = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float y = vUv.y;
  float a = pow(x, 3.0) * pow(1.0 - y, 1.6) * (0.85 + 0.15 * sin(y * 40.0 - uTime * 6.0));
  gl_FragColor = vec4(vC * a * 0.9, 1.0);
}`;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _w = { x: 0, z: 0 };
const UP = new THREE.Vector3(0, 1, 0);

export default function Board({ director, palette }: { director: Director; palette: WatchPalette }) {
  const tilesRef = useRef<THREE.InstancedMesh>(null);
  const agentsRef = useRef<THREE.InstancedMesh>(null);
  const beamsRef = useRef<THREE.InstancedMesh>(null);
  const wavesRef = useRef<THREE.InstancedMesh>(null);
  const seen = useRef(-1);

  const res = useMemo(() => {
    const tileGeo = new THREE.BoxGeometry(1, 1, 1);
    const aState = new THREE.InstancedBufferAttribute(new Float32Array(N_TILES * 4), 4);
    const aCol = new THREE.InstancedBufferAttribute(new Float32Array(N_TILES * 3), 3);
    const aFlipCol = new THREE.InstancedBufferAttribute(new Float32Array(N_TILES * 3), 3);
    const aKind = new THREE.InstancedBufferAttribute(new Float32Array(N_TILES), 1);
    [aState, aCol, aFlipCol, aKind].forEach((a) => a.setUsage(THREE.DynamicDrawUsage));
    tileGeo.setAttribute("aState", aState);
    tileGeo.setAttribute("aCol", aCol);
    tileGeo.setAttribute("aFlipCol", aFlipCol);
    tileGeo.setAttribute("aKind", aKind);
    const tileMat = new THREE.ShaderMaterial({
      vertexShader: tileVert,
      fragmentShader: tileFrag,
      uniforms: {
        uTime: { value: 0 },
        uNeutral: { value: new THREE.Color() },
        uLine: { value: new THREE.Color() },
        uFrost: { value: new THREE.Color() },
        uBoost: { value: 1 },
      },
    });
    const agentGeo = miniDomeGeometry();
    const agentMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const beamGeo = new THREE.PlaneGeometry(1, 1);
    beamGeo.translate(0, 0.5, 0);
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const waveGeo = new THREE.PlaneGeometry(1, 1);
    waveGeo.rotateX(-Math.PI / 2);
    const aAge = new THREE.InstancedBufferAttribute(new Float32Array(12).fill(99), 1);
    aAge.setUsage(THREE.DynamicDrawUsage);
    waveGeo.setAttribute("aAge", aAge);
    const waveMat = new THREE.ShaderMaterial({ vertexShader: waveVert, fragmentShader: waveFrag, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const colors = new Array<THREE.Color>(SIM_AGENTS).fill(null as unknown as THREE.Color).map(() => new THREE.Color());
    return { tileGeo, tileMat, aState, aCol, aFlipCol, aKind, agentGeo, agentMat, beamGeo, beamMat, waveGeo, waveMat, aAge, colors };
  }, []);

  useEffect(
    () => () => {
      [res.tileGeo, res.tileMat, res.agentGeo, res.agentMat, res.beamGeo, res.beamMat, res.waveGeo, res.waveMat].forEach((o) => o.dispose());
    },
    [res],
  );

  useEffect(() => {
    res.tileMat.uniforms.uNeutral.value.set(palette.blue).multiplyScalar(0.075);
    res.tileMat.uniforms.uLine.value.set(palette.agent).multiplyScalar(0.28);
    res.tileMat.uniforms.uFrost.value.set("#e8f6ff");
    seen.current = -1;
  }, [palette, res]);

  // static tile layout
  useEffect(() => {
    const m = tilesRef.current;
    if (!m) return;
    for (let i = 0; i < N_TILES; i++) {
      const ix = i % GRID;
      const iz = (i / GRID) | 0;
      _p.set(((ix + 0.5) / GRID - 0.5) * BOARD, 0, ((iz + 0.5) / GRID - 0.5) * BOARD);
      _s.set(TILE * 0.9, 0.05, TILE * 0.9);
      m.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    // waves start hidden
    const w = wavesRef.current;
    if (w) {
      _s.set(0.001, 0.001, 0.001);
      for (let i = 0; i < 12; i++) w.setMatrixAt(i, _m.compose(_p.set(0, 0, 0), _q.identity(), _s));
      w.instanceMatrix.needsUpdate = true;
    }
    // create instanceColor buffers before the first compile so USE_INSTANCING_COLOR is defined
    _c.set("#ffffff");
    for (const im of [agentsRef.current, beamsRef.current, wavesRef.current]) {
      if (!im) continue;
      for (let i = 0; i < im.count; i++) im.setColorAt(i, _c);
      (im.material as THREE.Material).needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    const d = director;
    const sim = d.sim;
    const t = d.time;
    res.tileMat.uniforms.uTime.value = t;
    res.beamMat.uniforms.uTime.value = t;
    res.tileMat.uniforms.uBoost.value = 1 + Math.max(0, 1 - (t - d.settleAt) / 1.5) * 0.6;

    for (let i = 0; i < SIM_AGENTS; i++) res.colors[i].set(sim.agents[i].color);

    // tiles: re-upload only when the sim advanced
    if (seen.current !== d.tileVersion) {
      seen.current = d.tileVersion;
      const st = res.aState.array as Float32Array;
      const col = res.aCol.array as Float32Array;
      const fc = res.aFlipCol.array as Float32Array;
      const kd = res.aKind.array as Float32Array;
      const owner = sim.owner;
      for (let i = 0; i < N_TILES; i++) {
        const o = owner[i];
        const j = i * 4;
        st[j] = o >= 0 ? 1 : 0;
        st[j + 1] = sim.flip[i];
        st[j + 2] = sim.frozen[i];
        st[j + 3] = d.tileAt[i];
        kd[i] = d.tileKind[i];
        const k = i * 3;
        if (o >= 0) {
          const c = res.colors[o];
          col[k] = c.r;
          col[k + 1] = c.g;
          col[k + 2] = c.b;
        }
        const fb = sim.flipBy[i];
        if (fb >= 0) {
          const c = res.colors[fb];
          fc[k] = c.r;
          fc[k + 1] = c.g;
          fc[k + 2] = c.b;
        }
      }
      res.aState.needsUpdate = true;
      res.aCol.needsUpdate = true;
      res.aFlipCol.needsUpdate = true;
      res.aKind.needsUpdate = true;
    }

    // agents + beams
    const am = agentsRef.current;
    const bm = beamsRef.current;
    if (am && bm) {
      for (let i = 0; i < SIM_AGENTS; i++) {
        d.agentWorld(i, _w);
        const bob = Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.03;
        const a = sim.agents[i];
        const yaw = Math.atan2(a.vx, a.vy);
        _q.setFromAxisAngle(UP, yaw);
        _p.set(_w.x, BOARD_Y + 0.05 + bob, _w.z);
        _s.setScalar(TILE * 0.95);
        am.setMatrixAt(i, _m.compose(_p, _q, _s));
        _c.copy(res.colors[i]).multiplyScalar(i === d.leaderId ? 2.6 : 1.7);
        am.setColorAt(i, _c);
        _p.y = BOARD_Y + 0.08;
        // beams face the camera around their vertical axis
        const cam = state.camera.position;
        _q.setFromAxisAngle(UP, Math.atan2(cam.x - _w.x, cam.z - _w.z));
        _s.set(TILE * 1.1, i === d.leaderId ? 1.25 : 0.7, 1);
        bm.setMatrixAt(i, _m.compose(_p, _q, _s));
        _c.copy(res.colors[i]).multiplyScalar(i === d.leaderId ? 1.0 : 0.6);
        bm.setColorAt(i, _c);
      }
      am.instanceMatrix.needsUpdate = true;
      bm.instanceMatrix.needsUpdate = true;
      if (am.instanceColor) am.instanceColor.needsUpdate = true;
      if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
    }

    // flip shockwaves
    const wm = wavesRef.current;
    if (wm) {
      const ages = res.aAge.array as Float32Array;
      for (let i = 0; i < d.waveCap; i++) {
        const age = t - d.waveAt[i];
        ages[i] = age;
        const live = age >= 0 && age < 1.1;
        const r = live ? TILE * (1.2 + age * 9) : 0.0001;
        _p.set(d.waveX[i], BOARD_Y + 0.06, d.waveZ[i]);
        _s.set(r, 1, r);
        wm.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
        _c.set(d.waveColor[i]);
        wm.setColorAt(i, _c);
      }
      wm.instanceMatrix.needsUpdate = true;
      if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
      res.aAge.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={tilesRef} args={[res.tileGeo, res.tileMat, N_TILES]} position={[0, BOARD_Y, 0]} frustumCulled={false} />
      <instancedMesh ref={agentsRef} args={[res.agentGeo, res.agentMat, SIM_AGENTS]} frustumCulled={false} />
      <instancedMesh ref={beamsRef} args={[res.beamGeo, res.beamMat, SIM_AGENTS]} frustumCulled={false} renderOrder={5} />
      <instancedMesh ref={wavesRef} args={[res.waveGeo, res.waveMat, 12]} frustumCulled={false} renderOrder={6} />
    </group>
  );
}
