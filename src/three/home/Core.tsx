"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE } from "./glsl";
import { advanceArena, getArena } from "./arena";
import { ARENA_SIZE, ARENA_Y, CORE_C, CORE_R, MEMBRANE_Y, R, clamp01, getJ, sig, smooth, win } from "./journey";

const W = 40;
const N = W * W;
const CELL = ARENA_SIZE / W;

const hexCache = new Map<string, [number, number, number]>();
const rgb = (hex: string) => {
  let v = hexCache.get(hex);
  if (!v) {
    const c = new THREE.Color(hex);
    v = [c.r, c.g, c.b];
    hexCache.set(hex, v);
  }
  return v;
};

/** Dome profile, after the brand mascot (flat base, full shoulders, high crown) — revolved into the arena dome. */
function domeProfile() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * (Math.PI / 2);
    const x = Math.pow(Math.cos(a), 0.55) * 1.32;
    const y = Math.pow(Math.sin(a), 0.85) * 1.55;
    pts.push(new THREE.Vector2(Math.max(x, 0.0001), y));
  }
  return pts;
}

export function Core() {
  const { gl } = useThree();

  const w = useMemo(() => {
    /* molten cavity: the hollow inner world */
    const cavGeo = new THREE.SphereGeometry(CORE_R, 96, 64);
    const cavMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: { uTime: { value: 0 }, uHeat: { value: 0.3 }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vP; varying vec3 vN; varying vec3 vW;
        void main(){ vP = position; vN = normalize(normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uHeat, uAlpha;
        varying vec3 vP; varying vec3 vN; varying vec3 vW;
        ${NOISE}
        void main(){
          vec3 p = vP * 0.55;
          float f = fbm(p + vec3(0.0, uTime * 0.05, uTime * 0.03));
          float g = fbm(p * 2.1 - vec3(uTime * 0.04));
          float veins = pow(1.0 - abs(f), 9.0);
          float pools = smoothstep(0.35, 0.8, g);
          // latitude/longitude survey lines — the technical drawing inside the cave
          float lat = abs(fract(atan(vP.y, length(vP.xz)) * 12.0 / 3.14159) - 0.5);
          float lon = abs(fract(atan(vP.z, vP.x) * 24.0 / 6.28318) - 0.5);
          float survey = (1.0 - smoothstep(0.0, 0.02, min(lat, lon))) * 0.08;
          vec3 hot = mix(vec3(1.0, 0.36, 0.08), vec3(0.89, 0.70, 0.25), g * 0.5 + 0.5);
          float lower = smoothstep(0.6, -1.0, vP.y / ${CORE_R.toFixed(2)});
          vec3 col = vec3(0.004, 0.012, 0.016) + hot * (veins * 1.6 + pools * 0.25) * (0.35 + lower) + vec3(0.1, 0.5, 0.45) * survey;
          gl_FragColor = vec4(col * uHeat, uAlpha);
        }
      `,
    });

    /* volumetric light shaft down the descent axis */
    const shaftGeo = new THREE.CylinderGeometry(0.55, 1.35, 7.6, 64, 1, true);
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vP; varying float vEdge; varying vec2 vUv;
        void main(){
          vP = position; vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelMatrix) * normal);
          vEdge = abs(dot(n, normalize(cameraPosition - wp.xyz)));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAlpha;
        varying vec3 vP; varying float vEdge; varying vec2 vUv;
        ${NOISE}
        void main(){
          float a = atan(vP.z, vP.x);
          float rays = snoise(vec3(cos(a) * 3.0, sin(a) * 3.0, vP.y * 0.25 + uTime * 0.18)) * 0.5 + 0.5;
          rays = pow(rays, 3.0);
          float ends = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float soft = pow(vEdge, 1.6);
          float alpha = rays * ends * soft * 0.22 * uAlpha;
          gl_FragColor = vec4(vec3(0.62, 0.92, 1.0) * alpha, alpha);
        }
      `,
    });

    /* dust motes caught in the shaft */
    const dustN = 900;
    const dustGeo = new THREE.BufferGeometry();
    const dp = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = -2 + Math.random() * 7.4;
      const r = Math.sqrt(Math.random()) * (0.55 + (1 - (y + 2) / 7.4) * 0.8);
      dp.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uPixel; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime * 0.05 + 2.0, 7.4) - 2.0;
          p.x += sin(uTime * 0.3 + position.y * 3.0) * 0.04;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = 0.5 + 0.5 * sin(uTime * 2.0 + position.x * 40.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(uPixel * 4.0 / -mv.z, 18.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r) * vA * uAlpha * 0.6; gl_FragColor = vec4(vec3(0.8, 0.95, 1.0) * a, a); }
      `,
    });

    /* the arena: 40×40 instanced tiles + agent lights */
    const tileGeo = new THREE.BoxGeometry(CELL * 0.9, 0.012, CELL * 0.9);
    const tileCol = new Float32Array(N * 3);
    const tileState = new Float32Array(N * 2);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = tileGeo.index;
    ig.setAttribute("position", tileGeo.getAttribute("position"));
    ig.setAttribute("normal", tileGeo.getAttribute("normal"));
    const offs = new Float32Array(N * 2);
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        offs[(y * W + x) * 2] = (x + 0.5) * CELL - ARENA_SIZE / 2;
        offs[(y * W + x) * 2 + 1] = (y + 0.5) * CELL - ARENA_SIZE / 2;
      }
    ig.setAttribute("aOff", new THREE.InstancedBufferAttribute(offs, 2));
    const colAttr = new THREE.InstancedBufferAttribute(tileCol, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    const stAttr = new THREE.InstancedBufferAttribute(tileState, 2);
    stAttr.setUsage(THREE.DynamicDrawUsage);
    ig.setAttribute("aCol", colAttr);
    ig.setAttribute("aState", stAttr);
    ig.instanceCount = N;
    ig.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    const tileMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uFrost: { value: 0 }, uHot: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec2 aOff; attribute vec3 aCol; attribute vec2 aState;
        uniform float uTime;
        varying vec3 vCol; varying vec2 vState; varying vec2 vXZ; varying float vTop;
        void main(){
          vec3 p = position;
          float owned = step(0.001, aCol.r + aCol.g + aCol.b);
          p.y *= 1.0 + owned * 2.0 + aState.x * 5.0;
          p.y += owned * 0.006;
          p.xz += aOff;
          vCol = aCol; vState = aState; vXZ = aOff; vTop = step(0.5, normal.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAlpha, uFrost, uHot;
        varying vec3 vCol; varying vec2 vState; varying vec2 vXZ; varying float vTop;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          float owned = step(0.001, vCol.r + vCol.g + vCol.b);
          vec3 neutral = vec3(0.05, 0.08, 0.10);
          vec3 col = mix(neutral, vCol * 0.9, owned) * (0.55 + 0.45 * vTop);
          // contested this tick: white hatched shimmer
          float hatch = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.25 + uTime * 6.0));
          col = mix(col, vec3(1.0) * (0.6 + 0.4 * hatch), vState.y * 0.85);
          // flip hold progress glows
          col += vCol * vState.x * 0.8;
          // frost (Freeze lever): spreads from centre, crystalline
          float r = length(vXZ);
          float fr = smoothstep(uFrost, uFrost - 0.35, r) * step(0.001, uFrost);
          float crystal = h(floor(vXZ * 80.0));
          col = mix(col, vec3(0.75, 0.91, 1.0) * (0.55 + crystal * 0.5), fr * 0.9);
          col = mix(col, col * vec3(1.6, 0.7, 0.4), uHot * 0.35);
          gl_FragColor = vec4(col, uAlpha);
        }
      `,
    });

    const agentGeo = new THREE.BufferGeometry();
    agentGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    agentGeo.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    agentGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    const agentMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uAlpha: { value: 0 }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec3 aCol; uniform float uPixel; varying vec3 vCol;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vCol = aCol; gl_Position = projectionMatrix * mv; gl_PointSize = min(uPixel * 26.0 / -mv.z, 60.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying vec3 vCol;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = (smoothstep(0.25, 0.0, r) * 1.5 + exp(-r * r * 6.0) * 0.6) * uAlpha; if (a < 0.004) discard; gl_FragColor = vec4((vCol + 0.35) * a, a); }
      `,
    });

    /* arena dome — the brand mascot silhouette, revolved, with its two eyes */
    const domeGeo = new THREE.LatheGeometry(domeProfile(), 96);
    const domeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying float vF; varying float vH;
        void main(){
          vUv = uv; vH = position.y / 1.55;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelMatrix) * normal);
          vF = 1.0 - abs(dot(n, normalize(cameraPosition - wp.xyz)));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAlpha;
        varying vec2 vUv; varying float vF; varying float vH;
        void main(){
          // logo gradient: brand blue at the base → cyan → signal green crown
          vec3 col = mix(vec3(0.16, 0.55, 0.94), vec3(0.21, 0.75, 0.69), smoothstep(0.0, 0.5, vH));
          col = mix(col, vec3(0.34, 1.0, 0.37), smoothstep(0.45, 1.0, vH));
          float mer = 1.0 - smoothstep(0.0, 0.012, abs(fract(vUv.x * 40.0) - 0.5) - 0.48);
          float par = 1.0 - smoothstep(0.0, 0.02, abs(fract(vUv.y * 14.0) - 0.5) - 0.47);
          float scan = smoothstep(0.03, 0.0, abs(fract(vH - uTime * 0.12) - 0.5) - 0.47);
          float a = (pow(vF, 2.5) * 0.55 + (mer + par) * 0.08 + scan * 0.25) * uAlpha;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    const eyeGeo = new THREE.CircleGeometry(0.07, 32);
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

    /* two keys, two blast radii: concentric shockwaves that never overlap */
    const ringGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const ringMat = (color: string) =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(color) }, uHot: { value: 0 }, uSpeed: { value: 1 }, uForge: { value: 1 }, uBreak: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uAlpha, uHot, uSpeed, uForge, uBreak; uniform vec3 uColor;
          varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main(){
            vec2 q = vUv * 2.0 - 1.0;
            float r = length(q);
            float maxR = 0.96 * uForge;
            float wave = pow(0.5 + 0.5 * cos((r * 5.0 - uTime * uSpeed * 0.9) * 6.28318), 18.0);
            float env = smoothstep(maxR, maxR - 0.25, r) * smoothstep(0.0, 0.08, r);
            float bound = smoothstep(0.008, 0.0, abs(r - maxR)) * 0.7;
            float core = smoothstep(0.07, 0.0, r) * 1.5;
            float shatter = step(uBreak, h(floor(q * 18.0)));
            vec3 c = mix(uColor, vec3(1.0, 0.5, 0.22), uHot);
            float a = (wave * env * 0.8 + bound + core) * uAlpha * shatter;
            gl_FragColor = vec4(c * a, a);
          }
        `,
      });
    const ringC = ringMat("#22C8E8");
    const ringG = ringMat("#E3B341");

    /* chain membrane: on-chain above, off-chain IDLE below */
    const memGeo = new THREE.CircleGeometry(2.7, 128);
    memGeo.rotateX(-Math.PI / 2);
    const memMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uR1: { value: -9 }, uR2: { value: -9 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAlpha, uR1, uR2; varying vec3 vP;
        void main(){
          vec2 g = abs(fract(vP.xz * 4.0) - 0.5);
          float grid = (1.0 - smoothstep(0.0, 0.025, min(g.x, g.y))) * 0.25;
          float r = length(vP.xz);
          float edge = smoothstep(2.7, 1.6, r);
          // ripples where value crosses: deposit at centre-left, withdrawal at centre-right
          float d1 = length(vP.xz - vec2(-0.5, 0.0)); float d2 = length(vP.xz - vec2(0.5, 0.0));
          float rp1 = smoothstep(0.04, 0.0, abs(d1 - uR1)) * smoothstep(1.6, 0.0, uR1) * step(0.0, uR1);
          float rp2 = smoothstep(0.04, 0.0, abs(d2 - uR2)) * smoothstep(1.6, 0.0, uR2) * step(0.0, uR2);
          vec3 col = vec3(0.13, 0.78, 0.91) * (grid + 0.05) * edge + vec3(0.13, 0.78, 0.91) * rp1 * 1.4 + vec3(0.89, 0.70, 0.25) * rp2 * 1.4;
          float a = ((grid + 0.05) * edge + rp1 + rp2) * uAlpha;
          gl_FragColor = vec4(col * uAlpha, a);
        }
      `,
    });
    const LOOPS = 320;
    const loopGeo = new THREE.BufferGeometry();
    const lp = new Float32Array(LOOPS * 3);
    const lseed = new Float32Array(LOOPS * 4);
    for (let i = 0; i < LOOPS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 2.2;
      lseed.set([Math.cos(a) * r, MEMBRANE_Y - 0.15 - Math.random() * 0.5, Math.sin(a) * r, Math.random()], i * 4);
    }
    loopGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    loopGeo.setAttribute("aSeed", new THREE.BufferAttribute(lseed, 4));
    loopGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, MEMBRANE_Y, 0), 3);
    const loopMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed; uniform float uTime, uPixel; varying float vA;
        void main(){
          // each dot is one match loop: entry fee → match → payout, round and round, never touching the chain
          float rr = 0.04 + aSeed.w * 0.08;
          float a = uTime * (1.5 + aSeed.w * 2.0) + aSeed.w * 40.0;
          vec3 p = aSeed.xyz + vec3(cos(a) * rr, 0.0, sin(a) * rr);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = 0.55 + 0.45 * sin(a * 0.5);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(uPixel * 7.0 / -mv.z, 20.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r) * vA * uAlpha; gl_FragColor = vec4(vec3(0.89, 0.70, 0.25) * a * 1.3, a); }
      `,
    });
    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    crossGeo.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array([0.13, 0.78, 0.91, 0.89, 0.7, 0.25]), 3));
    crossGeo.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(2), 1));
    crossGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, MEMBRANE_Y, 0), 4);
    const crossMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPixel: { value: 1 } },
      vertexShader: `attribute vec3 aCol; attribute float aA; uniform float uPixel; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = aCol; vA = aA; gl_Position = projectionMatrix * mv; gl_PointSize = min(uPixel * 40.0 / -mv.z, 90.0); }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = (smoothstep(0.2, 0.0, r) * 2.0 + exp(-r * r * 5.0) * 0.7) * vA; if (a < 0.004) discard; gl_FragColor = vec4((vC + 0.2) * a, a); }`,
    });

    /* the stands: a ring of light around the world */
    const STN = 9000;
    const standGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(STN * 3);
    const sa = new Float32Array(STN);
    for (let i = 0; i < STN; i++) {
      const a = Math.random() * Math.PI * 2;
      const tier = Math.floor(Math.random() * 7); // seating tiers
      const r = R * 1.55 + tier * 0.22 + (Math.random() - 0.5) * 0.05;
      sp.set([Math.cos(a) * r, tier * 0.12 + (Math.random() - 0.5) * 0.04 - 0.4, Math.sin(a) * r], i * 3);
      sa[i] = a;
    }
    standGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    standGeo.setAttribute("aA", new THREE.BufferAttribute(sa, 1));
    standGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 3);
    const standMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uPixel: { value: 1 }, uStands: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aA; uniform float uTime, uPixel; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float wave = pow(0.5 + 0.5 * cos(aA * 3.0 - uTime * 0.8), 6.0);
          vA = 0.35 + wave * 0.9;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(uPixel * (5.0 + wave * 5.0) / -mv.z, 14.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha, uStands; varying float vA;
        void main(){
          float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r) * vA * uAlpha;
          vec3 c = mix(vec3(0.89, 0.70, 0.25) * 1.3, vec3(0.54, 0.40, 0.07), uStands);
          gl_FragColor = vec4(mix(c * a, c, uStands), a);
        }
      `,
    });

    return {
      cavGeo, cavMat, shaftGeo, shaftMat, dustGeo, dustMat, tileGeo, ig, colAttr, stAttr, tileMat, agentGeo, agentMat,
      domeGeo, domeMat, eyeGeo, eyeMat, ringGeo, ringC, ringG, memGeo, memMat, loopGeo, loopMat, crossGeo, crossMat, standGeo, standMat,
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(w).forEach((v) => {
        if (v && typeof (v as { dispose?: () => void }).dispose === "function") (v as { dispose: () => void }).dispose();
      });
    },
    [w],
  );

  const leakFx = useMemo(() => ({ step: 0, at: 0, lastTick: -1 }), []);
  // the mascot's two eyes, placed on the dome crown facing the S5 camera, up-right as in the logo
  const eyes = useMemo(() => {
    const prof = domeProfile();
    const az = Math.atan2(1.7, -2.1);
    return [
      { a: az - 0.28, i: 33 },
      { a: az - 0.62, i: 30 },
    ].map(({ a, i }) => {
      const pr = prof[i];
      const o = new THREE.Object3D();
      const n = new THREE.Vector3(Math.cos(a) * pr.x, pr.y * 0.6, Math.sin(a) * pr.x).normalize();
      o.position.set(Math.cos(a) * pr.x, pr.y, Math.sin(a) * pr.x).addScaledVector(n, 0.012);
      o.lookAt(o.position.clone().add(n));
      return { p: o.position.toArray() as [number, number, number], q: o.quaternion.clone() };
    });
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const j = getJ();
    const motion = (sig.motion ?? 1) > 0;
    const pixel = gl.getPixelRatio() * (state.size.height / 900) * 1.6;
    const stands = sig.stands ?? 0;
    const sd = 1 - stands;

    // cavity: faint core glow seen through the crust in orbit, full heat inside
    w.cavMat.uniforms.uTime.value = motion ? t : 0;
    w.cavMat.uniforms.uHeat.value = 0.35 + win(j, 2.4, 3.05, 6.9, 7.3) * 0.75;
    w.cavMat.uniforms.uAlpha.value = sd;
    w.shaftMat.uniforms.uTime.value = t;
    w.shaftMat.uniforms.uAlpha.value = win(j, 1.4, 2.0, 3.6, 4.2) * sd;
    w.dustMat.uniforms.uTime.value = motion ? t : 0;
    w.dustMat.uniforms.uAlpha.value = win(j, 1.6, 2.1, 4.4, 5.0) * sd;
    w.dustMat.uniforms.uPixel.value = pixel;

    // arena
    const arenaV = win(j, 2.75, 3.1, 6.1, 6.4) * sd;
    const sim = getArena();
    if (arenaV > 0 && motion && !(leakFx.step >= 2 && leakFx.step <= 3)) advanceArena(dt);
    if (arenaV > 0 && sim.tick !== leakFx.lastTick) {
      leakFx.lastTick = sim.tick;
      const col = w.colAttr.array as Float32Array;
      const stt = w.stAttr.array as Float32Array;
      for (let i = 0; i < N; i++) {
        const o = sim.owner[i];
        if (o >= 0) {
          const c = rgb(sim.agents[o].color);
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
        } else col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        stt[i * 2] = sim.flip[i];
        stt[i * 2 + 1] = sim.frozen[i];
      }
      w.colAttr.needsUpdate = w.stAttr.needsUpdate = true;
      const ap = w.agentGeo.getAttribute("position") as THREE.BufferAttribute;
      const ac = w.agentGeo.getAttribute("aCol") as THREE.BufferAttribute;
      sim.agents.forEach((a, i) => {
        ap.setXYZ(i, (a.x / sim.w) * ARENA_SIZE - ARENA_SIZE / 2, ARENA_Y + 0.05, (a.y / sim.h) * ARENA_SIZE - ARENA_SIZE / 2);
        const c = rgb(a.color);
        ac.setXYZ(i, c[0], c[1], c[2]);
      });
      w.agentGeo.setDrawRange(0, sim.agents.length);
      ap.needsUpdate = ac.needsUpdate = true;
    }
    w.tileMat.uniforms.uTime.value = t;
    w.tileMat.uniforms.uAlpha.value = arenaV;
    w.agentMat.uniforms.uAlpha.value = arenaV;
    w.agentMat.uniforms.uPixel.value = pixel;
    // "see what the agent sees": arena dims so the DOM tensor stack reads
    w.tileMat.uniforms.uAlpha.value *= 1 - (sig.tensor ?? 0) * 0.6;

    // dome + eyes
    const domeV = win(j, 2.9, 3.3, 5.0, 5.4) * sd;
    w.domeMat.uniforms.uTime.value = t;
    w.domeMat.uniforms.uAlpha.value = domeV * (0.6 + win(j, 4.0, 4.3, 4.8, 5.1) * 0.6);
    w.eyeMat.opacity = domeV * win(j, 3.6, 4.1, 4.9, 5.2);

    // keys + leak demo (signals.leak = step index 1..5 as the DOM sequence advances, 0 idle)
    const keysV = win(j, 4.85, 5.15, 5.9, 6.2) * sd;
    const step = Math.round(sig.leak ?? 0);
    if (step !== leakFx.step) {
      leakFx.step = step;
      leakFx.at = t;
    }
    const since = t - leakFx.at;
    const hot = step === 1 ? 0.6 + 0.4 * Math.sin(t * 30) : 0;
    const frost = step === 2 || step === 3 ? Math.min(2.2, since * 1.6) : step === 4 ? Math.max(0, 2.2 - since * 2.2) : 0;
    const broken = step === 4 ? clamp01(since * 1.2) : step === 5 ? 1 : 0;
    const forge = step === 5 ? smooth(since / 1.2) : step === 4 ? 0 : 1;
    w.tileMat.uniforms.uFrost.value = frost;
    w.tileMat.uniforms.uHot.value = step === 1 ? 1 : 0;
    for (const m of [w.ringC, w.ringG]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uAlpha.value = keysV;
      m.uniforms.uSpeed.value = frost > 0.1 ? 0 : 1;
      m.uniforms.uForge.value = step === 5 ? forge : 1;
      m.uniforms.uBreak.value = step === 4 ? broken : 0;
    }
    w.ringC.uniforms.uHot.value = hot;

    // membrane: deposit crosses down, hundreds of loops below, one withdrawal up
    const memV = win(j, 5.85, 6.1, 6.9, 7.15) * sd;
    const mp = clamp01(j - 6);
    w.memMat.uniforms.uAlpha.value = memV;
    w.loopMat.uniforms.uAlpha.value = memV * smooth((mp - 0.2) / 0.15);
    w.loopMat.uniforms.uTime.value = motion ? t : 1;
    w.loopMat.uniforms.uPixel.value = pixel;
    w.crossMat.uniforms.uPixel.value = pixel;
    const dep = clamp01((mp - 0.05) / 0.25);
    const wd = clamp01((mp - 0.6) / 0.25);
    const cp = w.crossGeo.getAttribute("position") as THREE.BufferAttribute;
    const ca = w.crossGeo.getAttribute("aA") as THREE.BufferAttribute;
    cp.setXYZ(0, -0.5, MEMBRANE_Y + 1.1 - dep * 1.6, 0);
    cp.setXYZ(1, 0.5, MEMBRANE_Y - 0.5 + wd * 1.6, 0);
    ca.setX(0, memV * (dep > 0 && dep < 1 ? 1 : 0.15));
    ca.setX(1, memV * (wd > 0 && wd < 1 ? 1 : 0.15));
    cp.needsUpdate = ca.needsUpdate = true;
    // crossing moments → ripple radius
    const x1 = (dep - 1.1 / 1.6) * 3;
    const x2 = (wd - 0.5 / 1.6) * 3;
    w.memMat.uniforms.uR1.value = x1 > 0 ? x1 : -9;
    w.memMat.uniforms.uR2.value = x2 > 0 ? x2 : -9;
    sig.chainTouches = (dep > 1.1 / 1.6 ? 1 : 0) + (wd > 0.5 / 1.6 ? 1 : 0);

    // stands ring
    const standV = win(j, 7.7, 8.2, 9.5, 10);
    w.standMat.uniforms.uTime.value = motion ? t : 0;
    w.standMat.uniforms.uAlpha.value = standV;
    w.standMat.uniforms.uPixel.value = pixel;
    w.standMat.uniforms.uStands.value = stands;
    w.standMat.blending = stands > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending;
  });

  return (
    <group>
      <mesh geometry={w.cavGeo} material={w.cavMat} position={CORE_C as unknown as [number, number, number]} renderOrder={-2} />
      <mesh geometry={w.shaftGeo} material={w.shaftMat} position={[0, 1.6, 0]} />
      <points geometry={w.dustGeo} material={w.dustMat} frustumCulled={false} />
      <mesh geometry={w.ig} material={w.tileMat} position={[0, ARENA_Y, 0]} frustumCulled={false} />
      <points geometry={w.agentGeo} material={w.agentMat} frustumCulled={false} />
      <group position={[0, ARENA_Y - 0.01, 0]}>
        <mesh geometry={w.domeGeo} material={w.domeMat} />
        {/* eyes sit up-right on the crown, as in the logo */}
        {eyes.map((e, i) => (
          <mesh key={i} geometry={w.eyeGeo} material={w.eyeMat} position={e.p} quaternion={e.q} scale={[0.7, 1.0, 1]} />
        ))}
      </group>
      <mesh geometry={w.ringGeo} material={w.ringC} position={[-1.5, ARENA_Y + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={w.ringGeo} material={w.ringG} position={[1.5, ARENA_Y + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={w.memGeo} material={w.memMat} position={[0, MEMBRANE_Y, 0]} />
      <points geometry={w.loopGeo} material={w.loopMat} frustumCulled={false} />
      <points geometry={w.crossGeo} material={w.crossMat} frustumCulled={false} />
      <points geometry={w.standGeo} material={w.standMat} frustumCulled={false} />
    </group>
  );
}
