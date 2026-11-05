"use client";
/**
 * IdleScene — the chain membrane as a luminous fluid boundary.
 * Full-viewport shader quad. The membrane's height follows the hero diagram (frameState.signals.idleMembraneY),
 * so scrolling the page carries you down through it into the off-chain layer. Crossings in the diagram
 * (one deposit, one withdrawal) send ripples along the boundary. Reduced motion: time frozen.
 */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frameState } from "../registry";
import { useUI } from "@/store/ui";

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uY, uOn, uRippleX, uRippleAge, uAspect, uTier;
uniform vec3 uGold, uCyan;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 p = vUv*2.0-1.0;
  float x = p.x * uAspect;
  float t = uTime;

  // fluid boundary height
  float yM = uY
    + 0.010*sin(x*2.3 + t*0.55)
    + 0.006*sin(x*5.1 - t*0.9)
    + 0.014*(fbm(vec2(x*1.3 + t*0.08, t*0.12)) - 0.5);
  // ripple from the latest crossing
  float dx = abs(x - uRippleX*uAspect);
  float age = uRippleAge;
  yM += 0.05 * exp(-age*0.9) * sin(dx*14.0 - age*7.0) * exp(-dx*1.6) * step(0.0, age);

  float d = p.y - yM;
  float ad = abs(d);

  // luminous core + halo, slightly brighter where the ripple passes
  float energy = 1.0 + 1.5*exp(-age*1.2)*exp(-dx*2.0);
  float core = exp(-ad*320.0) * 0.9 * energy;
  float halo = exp(-ad*22.0) * 0.16 * energy;
  float mist = exp(-ad*5.0) * 0.05;

  vec3 side = d > 0.0 ? uGold : uCyan;
  vec3 col = mix(side, vec3(1.0), clamp(core, 0.0, 1.0)*0.55);

  // off-chain body: slow cyan currents (match loops are fast and many; this is their wake)
  float below = smoothstep(0.0, -0.08, d);
  float flow = 0.0;
  if (uTier > 0.5) {
    vec2 q = vec2(x*1.6 + t*0.05, p.y*2.2);
    float f1 = fbm(q + vec2(fbm(q*1.7 + t*0.06), 0.0));
    flow = smoothstep(0.55, 0.85, f1) * 0.07 * below;
  }
  // on-chain body: still, sparse gold sediment (value at rest)
  float above = smoothstep(0.0, 0.08, d);
  float sed = step(0.996, hash(floor(vec2(x, p.y)*vec2(60.0, 60.0)))) * 0.25 * above * exp(-ad*1.5);

  float a = (core + halo + mist) + flow + sed;
  vec3 c = col * (core + halo + mist) + uCyan * flow + uGold * sed;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0) * uOn);
}
`;

export default function IdleScene() {
  const motion = useUI((s) => s.motion);
  const { size } = useThree();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uY: { value: 0 },
      uOn: { value: 0 },
      uRippleX: { value: -0.5 },
      uRippleAge: { value: 99 },
      uAspect: { value: 1 },
      uTier: { value: 2 },
      uGold: { value: new THREE.Color("#E3B341") },
      uCyan: { value: new THREE.Color("#22C8E8") },
    }),
    [],
  );

  useFrame((_, dt) => {
    const u = uniforms;
    const s = frameState.signals;
    if (motion) u.uTime.value += dt;
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uTier.value = frameState.tier;
    const target = s.idleMembraneOn ? (s.idleMembraneY ?? 0) : -1.4;
    // once the hero is scrolled past, the boundary rests just off the top: you're below it now
    u.uY.value += (Math.min(1.25, target) - u.uY.value) * Math.min(1, dt * 8);
    u.uOn.value += ((s.idleMembraneOn ? 1 : 0) - u.uOn.value) * Math.min(1, dt * 2);
    if (s.idleRippleT) {
      u.uRippleX.value = s.idleRippleX ?? 0;
      u.uRippleAge.value = performance.now() / 1000 - s.idleRippleT;
    }
    // mode-aware palette (field = luminous, stands = ink tones)
    const stands = document.documentElement.dataset.mode === "stands";
    u.uGold.value.set(stands ? "#8A6613" : "#E3B341");
    u.uCyan.value.set(stands ? "#0B6E85" : "#22C8E8");
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} depthTest={false} />
    </mesh>
  );
}
