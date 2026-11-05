"use client";
/**
 * The hologram: a pedestal in the arena pit projecting a light column; the board floats inside a
 * cylindrical light curtain (fresnel, scanlines, a rising sweep), crowned by two slow data rings.
 */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, BOARD_Y, type Director } from "../director";
import type { WatchPalette } from "../palette";

const SHELL_R = 2.95;
const SHELL_Y0 = BOARD_Y - 0.62;
const SHELL_H = 2.5;

const shellVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const shellFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColor; uniform vec3 uColor2; uniform float uPulse; uniform float uI;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float y = vUv.y;
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float fadeTop = 1.0 - smoothstep(0.35, 1.0, y);
  float base = exp(-y * 22.0);
  float scan = 0.55 + 0.45 * sin(vW.y * 120.0 - uTime * 2.0);
  float sweepY = fract(uTime * 0.16);
  float sweep = exp(-pow((y - sweepY) * 16.0, 2.0)) * (1.0 - sweepY);
  float ribs = pow(abs(sin(vUv.x * 3.14159 * 64.0)), 60.0);
  float dashes = step(0.5, fract(vUv.x * 24.0 + uTime * 0.05)) * exp(-pow((y - 0.18) * 40.0, 2.0));
  vec3 c = mix(uColor, uColor2, y);
  float a = (fres * 0.85 + 0.05) * scan * fadeTop + ribs * 0.18 * fadeTop + sweep * 0.55 + base * 1.6 + dashes * 0.7;
  a *= 1.0 + uPulse * 1.4;
  gl_FragColor = vec4(c * a * uI, 1.0);
}`;

const ringFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColor; uniform float uSpeed; uniform float uTicks;
varying vec2 vUv;
void main(){
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x) / 6.28318 + 0.5 + uTime * uSpeed;
  float band = smoothstep(0.86, 0.9, r) * (1.0 - smoothstep(0.985, 1.0, r));
  float ticks = step(0.55, fract(a * uTicks)) * smoothstep(0.86, 0.9, r) * (1.0 - smoothstep(0.93, 0.95, r));
  float arc = step(0.08, fract(a * 3.0)) * smoothstep(0.955, 0.965, r) * (1.0 - smoothstep(0.985, 0.995, r));
  float v = ticks * 0.9 + arc * 1.6 + band * 0.06;
  gl_FragColor = vec4(uColor * v, 1.0);
}`;
const simpleVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const emitterFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColor; uniform vec3 uColor2; uniform float uPulse;
varying vec2 vUv;
void main(){
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float glow = exp(-r * 2.4) * 0.55;
  float rings = pow(0.5 + 0.5 * cos(r * 60.0 - uTime * 1.6), 12.0) * (1.0 - r) * 0.5;
  float edge = smoothstep(0.9, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r)) * 2.0;
  vec3 c = mix(uColor2, uColor, r);
  gl_FragColor = vec4(c * (glow + rings + edge) * (1.0 + uPulse), 1.0);
}`;

const coneFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColor; uniform float uI;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float facing = pow(abs(dot(normalize(vN), normalize(vV))), 2.4);
  float y = vUv.y;
  float n = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.6) * sin(vUv.x * 17.0 - uTime * 0.4);
  float a = facing * smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(0.7, 1.0, y)) * n;
  gl_FragColor = vec4(uColor * a * uI, 1.0);
}`;

export default function Hologram({ director, palette }: { director: Director; palette: WatchPalette }) {
  const res = useMemo(() => {
    const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false } as const;
    const shellGeo = new THREE.CylinderGeometry(SHELL_R, SHELL_R, SHELL_H, 96, 1, true);
    shellGeo.translate(0, SHELL_H / 2, 0);
    const shellMat = new THREE.ShaderMaterial({
      vertexShader: shellVert,
      fragmentShader: shellFrag,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() }, uPulse: { value: 0 }, uI: { value: 1 } },
      side: THREE.DoubleSide,
      ...add,
    });
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    ringGeo.rotateX(-Math.PI / 2);
    const mkRing = (speed: number, ticks: number) =>
      new THREE.ShaderMaterial({
        vertexShader: simpleVert,
        fragmentShader: ringFrag,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uSpeed: { value: speed }, uTicks: { value: ticks } },
        side: THREE.DoubleSide,
        ...add,
      });
    const ringA = mkRing(0.012, 180);
    const ringB = mkRing(-0.02, 96);
    const emitGeo = new THREE.CircleGeometry(1, 96);
    emitGeo.rotateX(-Math.PI / 2);
    const emitMat = new THREE.ShaderMaterial({
      vertexShader: simpleVert,
      fragmentShader: emitterFrag,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() }, uPulse: { value: 0 } },
      ...add,
    });
    const coneGeo = new THREE.CylinderGeometry(2.3, 1.2, 6.2, 64, 1, true);
    coneGeo.translate(0, 3.1, 0);
    const coneMat = new THREE.ShaderMaterial({
      vertexShader: shellVert,
      fragmentShader: coneFrag,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uI: { value: 0.07 } },
      side: THREE.DoubleSide,
      ...add,
    });
    // pedestal: dark glossy drum + a lit lip
    const pedGeo = new THREE.CylinderGeometry(2.25, 2.6, 0.62, 96, 1, false);
    pedGeo.translate(0, 0.31, 0);
    const pedMat = new THREE.MeshPhysicalMaterial({ color: "#0a1016", roughness: 0.28, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.15 });
    const lipGeo = new THREE.TorusGeometry(2.27, 0.022, 8, 160);
    lipGeo.rotateX(Math.PI / 2);
    const lipMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const footGeo = new THREE.TorusGeometry(2.62, 0.016, 8, 160);
    footGeo.rotateX(Math.PI / 2);
    const footMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    // board underside: thin dark glass slab so the grid has body
    const slabGeo = new THREE.BoxGeometry(BOARD + 0.16, 0.05, BOARD + 0.16);
    const slabMat = new THREE.MeshPhysicalMaterial({ color: "#050a10", roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.85 });
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD + 0.16, 0.05, BOARD + 0.16));
    const frameMat = new THREE.LineBasicMaterial({ toneMapped: false });
    return { shellGeo, shellMat, ringGeo, ringA, ringB, emitGeo, emitMat, coneGeo, coneMat, pedGeo, pedMat, lipGeo, lipMat, footGeo, footMat, slabGeo, slabMat, frameGeo, frameMat };
  }, []);

  useEffect(() => () => Object.values(res).forEach((o) => o.dispose()), [res]);

  useEffect(() => {
    const agent = new THREE.Color(palette.agent);
    const blue = new THREE.Color(palette.blue);
    const signal = new THREE.Color(palette.signal);
    res.shellMat.uniforms.uColor.value.copy(agent).lerp(blue, 0.3).multiplyScalar(0.55);
    res.shellMat.uniforms.uColor2.value.copy(blue).multiplyScalar(0.4);
    res.ringA.uniforms.uColor.value.copy(agent).multiplyScalar(1.3);
    res.ringB.uniforms.uColor.value.copy(signal).multiplyScalar(1.1);
    res.emitMat.uniforms.uColor.value.copy(agent).multiplyScalar(1.4);
    res.emitMat.uniforms.uColor2.value.copy(signal).multiplyScalar(0.9);
    res.coneMat.uniforms.uColor.value.copy(agent).lerp(new THREE.Color(palette.frost), 0.4);
    res.lipMat.color.copy(agent).multiplyScalar(2.2);
    res.footMat.color.copy(signal).multiplyScalar(1.6);
    res.frameMat.color.copy(agent).multiplyScalar(1.6);
  }, [palette, res]);

  useFrame(() => {
    const t = director.time;
    const settle = Math.max(0, 1 - (t - director.settleAt) / 1.8);
    const pulse = director.excite * 0.35 + settle;
    res.shellMat.uniforms.uTime.value = t;
    res.shellMat.uniforms.uPulse.value = pulse;
    res.ringA.uniforms.uTime.value = t;
    res.ringB.uniforms.uTime.value = t;
    res.emitMat.uniforms.uTime.value = t;
    res.emitMat.uniforms.uPulse.value = pulse;
    res.coneMat.uniforms.uTime.value = t;
  });

  return (
    <group>
      <mesh geometry={res.pedGeo} material={res.pedMat} />
      <mesh geometry={res.lipGeo} material={res.lipMat} position={[0, 0.625, 0]} />
      <mesh geometry={res.footGeo} material={res.footMat} position={[0, 0.012, 0]} />
      <mesh geometry={res.emitGeo} material={res.emitMat} position={[0, 0.635, 0]} scale={2.2} renderOrder={2} />
      <mesh geometry={res.slabGeo} material={res.slabMat} position={[0, BOARD_Y - 0.03, 0]} />
      <lineSegments geometry={res.frameGeo} material={res.frameMat} position={[0, BOARD_Y - 0.03, 0]} />
      <mesh geometry={res.shellGeo} material={res.shellMat} position={[0, SHELL_Y0, 0]} renderOrder={8} />
      <mesh geometry={res.ringGeo} material={res.ringA} position={[0, SHELL_Y0 + SHELL_H * 0.86, 0]} scale={SHELL_R * 2.18} renderOrder={9} />
      <mesh geometry={res.ringGeo} material={res.ringB} position={[0, SHELL_Y0 + SHELL_H * 0.97, 0]} scale={SHELL_R * 1.7} renderOrder={9} />
      <mesh geometry={res.coneGeo} material={res.coneMat} position={[0, 0.62, 0]} renderOrder={7} />
    </group>
  );
}
