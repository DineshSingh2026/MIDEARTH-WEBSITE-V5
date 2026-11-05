"use client";
/**
 * The spectators: MidEarth dome agents seated on the amphitheatre tiers around the hologram.
 * All instanced (bodies, visors, eyes, chairs, light strips, consoles, screens): ~7 draw calls for ≤12 agents.
 * They breathe, blink, track the action with head + eyes, lean in as excitement rises, bounce on flips
 * and on the match settle, and a chat event lights one agent's console.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOARD_Y, MAX_SPECTATORS, type Director } from "../director";
import { chairGeometry, consoleTexture, domeGeometry, domeSurface, TIERS, DOME } from "../geom";
import type { WatchPalette } from "../palette";

export type Seat = { x: number; y: number; z: number; yaw: number; phase: number };

const SEAT_LIFT = 0.5;

/** seats on the tiers. θ = 0 is the camera side (+Z). */
export function makeSeats(compact: boolean): Seat[] {
  const spec: [tier: number, theta: number][] = compact
    ? [
        [1, -0.3],
        [1, 0.32],
        [0, Math.PI - 0.24],
        [0, Math.PI + 0.24],
        [1, Math.PI - 0.62],
        [1, Math.PI + 0.62],
      ]
    : [
        [1, 0.15],
        [1, -0.17],
        [1, -0.62],
        [1, -1.3],
        [1, 1.32],
        [0, Math.PI - 0.27],
        [0, Math.PI + 0.27],
        [1, Math.PI - 0.7],
        [1, Math.PI],
        [1, Math.PI + 0.7],
        [2, Math.PI - 0.38],
      ];
  return spec.slice(0, MAX_SPECTATORS).map(([ti, th], i) => {
    const t = TIERS[ti];
    const r = (t.r0 + t.r1) / 2 + 0.15;
    const x = r * Math.sin(th);
    const z = r * Math.cos(th);
    return { x, y: t.y + SEAT_LIFT, z, yaw: Math.atan2(-x, -z), phase: i * 1.37 };
  });
}

const injectSSS = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    `#include <emissivemap_fragment>
     {
       vec3 nV = normalize(normal);
       vec3 vV = normalize(vViewPosition);
       float fr = pow(1.0 - clamp(abs(dot(nV, vV)), 0.0, 1.0), 2.6);
       // light that seems to come from inside the shell + a cool rim from the hologram
       totalEmissiveRadiance += vColor.rgb * 0.07 + mix(vColor.rgb, vec3(0.03, 0.33, 0.86), 0.7) * fr * 0.9;
     }`,
  );
};

const Z = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _M = new THREE.Matrix4();
const _T = new THREE.Matrix4();
const _O = new THREE.Matrix4();
const _B = new THREE.Matrix4();
const _c = new THREE.Color();
const _c2 = new THREE.Color();

function surfaceMatrix(az: number, el: number, lift: number, sx: number, sy: number, sz: number, roll: number) {
  domeSurface(az, el, _v, lift);
  // outward normal of the dome at (az, el)
  _n.set(Math.sin(az) * Math.cos(el) * DOME.H, Math.sin(el) * DOME.R, Math.cos(az) * Math.cos(el) * DOME.H).normalize();
  _q.setFromUnitVectors(Z, _n);
  _q2.setFromAxisAngle(Z, roll);
  _q.multiply(_q2);
  return new THREE.Matrix4().compose(_v.clone(), _q.clone(), new THREE.Vector3(sx, sy, sz));
}

export default function Spectators({ director, palette, seats, segments }: { director: Director; palette: WatchPalette; seats: Seat[]; segments: number }) {
  const n = seats.length;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const visorRef = useRef<THREE.InstancedMesh>(null);
  const eyeRef = useRef<THREE.InstancedMesh>(null);
  const chairRef = useRef<THREE.InstancedMesh>(null);
  const stripRef = useRef<THREE.InstancedMesh>(null);
  const deskRef = useRef<THREE.InstancedMesh>(null);
  const screenRef = useRef<THREE.InstancedMesh>(null);

  const res = useMemo(() => {
    const bodyGeo = domeGeometry(segments, Math.round(segments / 2));
    const bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenRoughness: 0.4, envMapIntensity: 1.3 });
    bodyMat.onBeforeCompile = injectSSS;
    const visorGeo = new THREE.SphereGeometry(1, 32, 16);
    const visorMat = new THREE.MeshPhysicalMaterial({ color: "#020407", roughness: 0.06, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
    const eyeGeo = new THREE.SphereGeometry(1, 20, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(3.2), toneMapped: false });
    const chairGeo = chairGeometry();
    const chairMat = new THREE.MeshPhysicalMaterial({ color: "#0b1219", roughness: 0.32, metalness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const stripGeo = new THREE.BoxGeometry(1.08, 0.022, 0.03);
    const stripMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const deskGeo = new RoundedBoxGeometry(0.98, 0.07, 0.5, 2, 0.03);
    const screenGeo = new THREE.PlaneGeometry(0.86, 0.42);
    const screenTex = consoleTexture(palette);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
    // local frames on the dome (brand: eyes high on the front, looking up-right)
    const visorL = surfaceMatrix(0.22, 0.47, -0.035, 0.36, 0.24, 0.12, -0.18);
    const eyeL = [surfaceMatrix(0.07, 0.47, 0.045, 0.07, 0.105, 0.03, -0.2), surfaceMatrix(0.37, 0.5, 0.045, 0.074, 0.11, 0.03, -0.2)];
    // chair-local frames
    const stripL = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.645, -0.725), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.16), new THREE.Vector3(1, 1, 1));
    const deskL = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.18, 0.82), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32), new THREE.Vector3(1, 1, 1));
    const screenL = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.36, 0.78), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.62).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)), new THREE.Vector3(1, 1, 1));
    return { bodyGeo, bodyMat, visorGeo, visorMat, eyeGeo, eyeMat, chairGeo, chairMat, stripGeo, stripMat, deskGeo, screenGeo, screenTex, screenMat, visorL, eyeL, stripL, deskL, screenL };
    // palette is applied below; the console texture is redrawn when the palette changes via key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, palette.key]);

  useEffect(
    () => () => {
      [res.bodyGeo, res.bodyMat, res.visorGeo, res.visorMat, res.eyeGeo, res.eyeMat, res.chairGeo, res.chairMat, res.stripGeo, res.stripMat, res.deskGeo, res.screenGeo, res.screenTex, res.screenMat].forEach((o) => o.dispose());
    },
    [res],
  );

  // per-spectator animation state (typed arrays, no per-frame allocation)
  const st = useMemo(
    () => ({
      yaw: new Float32Array(MAX_SPECTATORS),
      lean: new Float32Array(MAX_SPECTATORS),
      blinkAt: new Float32Array(MAX_SPECTATORS).map((_, i) => 1 + i * 0.7),
      look: new Float32Array(MAX_SPECTATORS),
      accent: new THREE.Color(),
      signal: new THREE.Color(),
    }),
    [],
  );

  useEffect(() => {
    st.accent.set(palette.agent);
    st.signal.set(palette.signal);
  }, [palette, st]);

  // static: chairs, desks
  useEffect(() => {
    director.spectators = n;
    const ch = chairRef.current;
    const dk = deskRef.current;
    if (!ch || !dk) return;
    for (let i = 0; i < n; i++) {
      const s = seats[i];
      st.yaw[i] = s.yaw;
      _M.compose(_p.set(s.x, s.y, s.z), _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, s.yaw), _s.set(1, 1, 1));
      ch.setMatrixAt(i, _M);
      dk.setMatrixAt(i, _O.multiplyMatrices(_M, res.deskL));
    }
    ch.instanceMatrix.needsUpdate = true;
    dk.instanceMatrix.needsUpdate = true;
    _c.set("#ffffff");
    for (const im of [stripRef.current, screenRef.current]) {
      if (!im) continue;
      for (let i = 0; i < n; i++) im.setColorAt(i, _c);
      (im.material as THREE.Material).needsUpdate = true;
    }
  }, [seats, n, res, director, st]);

  useFrame(() => {
    const d = director;
    const t = d.time;
    const body = bodyRef.current;
    const visor = visorRef.current;
    const eye = eyeRef.current;
    const strip = stripRef.current;
    const screen = screenRef.current;
    if (!body || !visor || !eye || !strip || !screen) return;
    const k = 1 - Math.exp(-(1 / 60) * 3.2);
    for (let i = 0; i < n; i++) {
      const s = seats[i];
      // head yaw tracks the action, clamped around the seat's facing
      let want = Math.atan2(d.gazeX - s.x, d.gazeZ - s.z) - s.yaw;
      want = Math.atan2(Math.sin(want), Math.cos(want));
      want = THREE.MathUtils.clamp(want, -0.45, 0.45) + Math.sin(t * 0.21 + s.phase) * 0.05;
      st.yaw[i] += (want - st.yaw[i]) * k * (0.6 + (i % 3) * 0.2);
      // pitch: look down at the board (+ lean in with excitement)
      const dist = Math.hypot(s.x - d.gazeX, s.z - d.gazeZ);
      const lookDown = Math.atan2(s.y + 0.6 - BOARD_Y, dist) * 0.55;
      const wantLean = lookDown + d.excite * 0.14;
      st.lean[i] += (wantLean - st.lean[i]) * k;
      // reactions: flips (staggered), settle (bigger), chat (own hop)
      let bounce = 0;
      const u = t - d.reactAt - (i % 5) * 0.07;
      if (u > 0 && u < 1.4) bounce += Math.sin(u * 15) * Math.exp(-u * 4.2) * 0.05;
      const us = t - d.settleAt - (i % 4) * 0.09;
      if (us > 0 && us < 2.2) bounce += Math.abs(Math.sin(us * 9)) * Math.exp(-us * 1.8) * 0.16;
      const uc = t - d.chatAt[i];
      if (uc > 0 && uc < 1) bounce += Math.abs(Math.sin(uc * 11)) * Math.exp(-uc * 4) * 0.08;
      const breath = Math.sin(t * 1.55 + s.phase);
      _e.set(st.lean[i], s.yaw + st.yaw[i], Math.sin(t * 0.37 + s.phase) * 0.03, "YXZ");
      _q.setFromEuler(_e);
      _p.set(s.x, s.y + Math.max(0, bounce), s.z);
      _s.set(1 - breath * 0.006, 1 + breath * 0.014 - Math.max(0, -bounce) * 0.4, 1 - breath * 0.006);
      _M.compose(_p, _q, _s);
      body.setMatrixAt(i, _M);
      visor.setMatrixAt(i, _O.multiplyMatrices(_M, res.visorL));
      // blink
      if (t > st.blinkAt[i] + 0.16) st.blinkAt[i] = t + 1.8 + ((Math.sin(i * 91.7 + t) + 1) * 2.2);
      const bu = t - st.blinkAt[i];
      const lid = bu > 0 && bu < 0.16 ? 0.12 + 0.88 * Math.abs(bu / 0.08 - 1) : 1;
      _B.makeScale(1, lid, 1);
      for (let e = 0; e < 2; e++) {
        _T.multiplyMatrices(res.eyeL[e], _B);
        eye.setMatrixAt(i * 2 + e, _O.multiplyMatrices(_M, _T));
      }
      // console + chair strip light: accent at rest, flash with the chatting agent's colour
      const f = d.chatFlash[i];
      _c.copy(st.accent).multiplyScalar(1.6);
      if (f > 0.01) _c.lerp(_c2.set(d.chatColor[i]).multiplyScalar(4.5), Math.min(1, f));
      strip.setColorAt(i, _c);
      const sc = 0.9 + f * 1.6 + Math.max(0, 1 - (t - d.settleAt) / 1.5) * 0.8;
      _c.setScalar(sc);
      if (f > 0.01) _c.lerp(_c2.set(d.chatColor[i]).multiplyScalar(sc + 1.2), Math.min(1, f * 0.7));
      screen.setColorAt(i, _c);
      // strips and screens follow the static chair frame
      _M.compose(_p.set(s.x, s.y, s.z), _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, s.yaw), _s.set(1, 1, 1));
      strip.setMatrixAt(i, _O.multiplyMatrices(_M, res.stripL));
      screen.setMatrixAt(i, _O.multiplyMatrices(_M, res.screenL));
    }
    for (const im of [body, visor, eye, strip, screen]) im.instanceMatrix.needsUpdate = true;
    if (strip.instanceColor) strip.instanceColor.needsUpdate = true;
    if (screen.instanceColor) screen.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[res.bodyGeo, res.bodyMat, n]} frustumCulled={false} />
      <instancedMesh ref={visorRef} args={[res.visorGeo, res.visorMat, n]} frustumCulled={false} />
      <instancedMesh ref={eyeRef} args={[res.eyeGeo, res.eyeMat, n * 2]} frustumCulled={false} />
      <instancedMesh ref={chairRef} args={[res.chairGeo, res.chairMat, n]} frustumCulled={false} />
      <instancedMesh ref={stripRef} args={[res.stripGeo, res.stripMat, n]} frustumCulled={false} />
      <instancedMesh ref={deskRef} args={[res.deskGeo, res.chairMat, n]} frustumCulled={false} />
      <instancedMesh ref={screenRef} args={[res.screenGeo, res.screenMat, n]} frustumCulled={false} />
    </group>
  );
}
