"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { arenaEvents } from "@/lib/arena/client";
import { HOME } from "@/content/copy/home";
import { FACTS } from "@/content/facts";
import { R, CORE_C, getJ, win, sig, clamp01 } from "./journey";

/** Twelve regions = the 12 vertices of an icosahedron on the crust. */
function regionPositions() {
  const g = new THREE.IcosahedronGeometry(R * 1.005, 0);
  const p = g.getAttribute("position");
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    if (!out.some((o) => o.distanceTo(v) < 0.01)) out.push(v);
  }
  g.dispose();
  return out.slice(0, FACTS.regions);
}

const ARCS = 64;
const SEG = 40;
const ARC_LIFE = 2.6;

const glowVert = /* glsl */ `
  attribute vec3 aCol; attribute float aSize; attribute float aGlow;
  uniform float uPixel;
  varying vec3 vCol; varying float vGlow;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vCol = aCol; vGlow = aGlow;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uPixel * (0.6 + aGlow) / -mv.z, 120.0);
  }
`;
const glowFrag = /* glsl */ `
  uniform float uAlpha;
  varying vec3 vCol; varying float vGlow;
  void main(){
    vec2 pc = gl_PointCoord * 2.0 - 1.0;
    float r = length(pc);
    float core = smoothstep(0.16, 0.0, r);
    float halo = exp(-r * r * 7.0) * 0.55;
    float ring = smoothstep(0.03, 0.0, abs(r - 0.62)) * 0.35;
    float a = (core * 1.6 + halo + ring) * vGlow * uAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vCol * a, a);
  }
`;

function glowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPixel: { value: 1 }, uAlpha: { value: 1 } },
    vertexShader: glowVert,
    fragmentShader: glowFrag,
  });
}

const CYAN = new THREE.Color("#22C8E8");
const GREEN = new THREE.Color("#00FFA3");
const GOLD = new THREE.Color("#E3B341");
const DIM = new THREE.Color("#8DA0A9");

/**
 * Region nodes + agent-light arcs. Arcs launch from a node and dive into the core:
 * cyan for every new agent chat message, green per seat filled in a pool, plus an ambient baseline.
 */
export function Regions() {
  const { gl } = useThree();
  const nodes = useMemo(regionPositions, []);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(nodes.length * 3);
    nodes.forEach((v, i) => v.toArray(pos, i * 3));
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const col = new Float32Array(nodes.length * 3);
    nodes.forEach((_, i) => GREEN.toArray(col, i * 3));
    g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(nodes.length).fill(70), 1));
    g.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(nodes.length).fill(0.6), 1));
    return g;
  }, [nodes]);
  const nodeMat = useMemo(glowMaterial, []);

  // arc pool: line segments, per-vertex t along the curve + per-arc start time
  const arc = useMemo(() => {
    const vCount = ARCS * SEG * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
    const tAttr = new Float32Array(vCount);
    for (let a = 0; a < ARCS; a++)
      for (let s = 0; s < SEG; s++) {
        tAttr[(a * SEG + s) * 2] = s / SEG;
        tAttr[(a * SEG + s) * 2 + 1] = (s + 1) / SEG;
      }
    g.setAttribute("aT", new THREE.BufferAttribute(tAttr, 1));
    g.setAttribute("aStart", new THREE.BufferAttribute(new Float32Array(vCount).fill(-99), 1));
    g.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 2);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aT; attribute float aStart; attribute vec3 aCol;
        uniform float uTime;
        varying float vA; varying vec3 vCol;
        void main(){
          float head = (uTime - aStart) / ${ARC_LIFE.toFixed(2)} * 1.35;
          float d = head - aT;
          vA = smoothstep(0.0, 0.02, d) * (1.0 - smoothstep(0.0, 0.32, d)) * step(aT, 1.0);
          vCol = aCol;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying float vA; varying vec3 vCol;
        void main(){ float a = vA * uAlpha; if (a < 0.003) discard; gl_FragColor = vec4(vCol * a * 1.6, a); }
      `,
    });
    // heads
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARCS * 3), 3));
    hg.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array(ARCS * 3), 3));
    hg.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(ARCS).fill(26), 1));
    hg.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(ARCS), 1));
    hg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 2);
    return { g, m, hg, hm: glowMaterial(), starts: new Float32Array(ARCS).fill(-99), ctrl: new Float32Array(ARCS * 12), next: 0 };
  }, []);

  // vision nodes (S8): seven lights on the hemisphere facing the S8 camera, coloured by status
  const vision = useMemo(() => {
    const n = HOME.vision.nodes.length;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const facing = new THREE.Vector3(-6.5, 5.5, 13).normalize();
    const right = new THREE.Vector3().crossVectors(facing, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, facing).normalize();
    const v = new THREE.Vector3();
    HOME.vision.nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const rr = 0.42 + (i % 2) * 0.16;
      v.copy(facing).addScaledVector(right, Math.cos(a) * rr).addScaledVector(up, Math.sin(a) * rr * 0.8).normalize().multiplyScalar(R * 1.01);
      v.toArray(pos, i * 3);
      (node.status === "LIVE" ? GREEN : node.status === "EARLY" ? CYAN : (node.status as string) === "NEXT" ? GOLD : DIM).toArray(col, i * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n).fill(90), 1));
    g.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(n), 1));
    // links: a closed constellation, each link a great-circle arc on the crust
    const lp: number[] = [];
    const a0 = new THREE.Vector3();
    const a1 = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      a0.fromArray(pos, i * 3);
      a1.fromArray(pos, ((i + 1) % n) * 3);
      for (let s = 0; s < 16; s++) {
        const p0 = a0.clone().lerp(a1, s / 16).normalize().multiplyScalar(R * 1.01);
        const p1 = a0.clone().lerp(a1, (s + 1) / 16).normalize().multiplyScalar(R * 1.01);
        lp.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lp), 3));
    const lm = new THREE.LineBasicMaterial({ color: "#DFE9EC", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    return { g, m: glowMaterial(), lg, lm, n };
  }, []);

  useEffect(() => {
    return () => {
      nodeGeo.dispose();
      nodeMat.dispose();
      arc.g.dispose();
      arc.m.dispose();
      arc.hg.dispose();
      arc.hm.dispose();
      vision.g.dispose();
      vision.m.dispose();
      vision.lg.dispose();
      vision.lm.dispose();
    };
  }, [nodeGeo, nodeMat, arc, vision]);

  // spawn: write one arc's control points + start time into the pool (no allocation)
  const pulses = useMemo(() => new Float32Array(nodes.length), [nodes]);
  const spawn = useMemo(() => {
    const tmp = new THREE.Vector3();
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3(CORE_C[0], CORE_C[1], CORE_C[2]);
    const pos = arc.g.getAttribute("position") as THREE.BufferAttribute;
    const st = arc.g.getAttribute("aStart") as THREE.BufferAttribute;
    const cl = arc.g.getAttribute("aCol") as THREE.BufferAttribute;
    const bez = (t: number, out: THREE.Vector3) => {
      const u = 1 - t;
      out
        .copy(p0)
        .multiplyScalar(u * u * u)
        .addScaledVector(p1, 3 * u * u * t)
        .addScaledVector(p2, 3 * u * t * t)
        .addScaledVector(p3, t * t * t);
      return out;
    };
    return (node: number, color: THREE.Color, now: number) => {
      const a = arc.next;
      arc.next = (arc.next + 1) % ARCS;
      p0.copy(nodes[node % nodes.length]);
      tmp.set(Math.sin(now * 13.1 + a), Math.cos(now * 7.3 + a * 1.7), Math.sin(a * 2.3)).multiplyScalar(1.4);
      p1.copy(p0).multiplyScalar(1.55).add(tmp);
      p2.copy(p0).multiplyScalar(0.55);
      for (let s = 0; s < SEG; s++) {
        bez(s / SEG, tmp);
        const i = (a * SEG + s) * 2;
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        bez((s + 1) / SEG, tmp);
        pos.setXYZ(i + 1, tmp.x, tmp.y, tmp.z);
        st.setX(i, now);
        st.setX(i + 1, now);
        cl.setXYZ(i, color.r, color.g, color.b);
        cl.setXYZ(i + 1, color.r, color.g, color.b);
      }
      p0.toArray(arc.ctrl, a * 12);
      p1.toArray(arc.ctrl, a * 12 + 3);
      p2.toArray(arc.ctrl, a * 12 + 6);
      p3.toArray(arc.ctrl, a * 12 + 9);
      arc.starts[a] = now;
      (arc.hg.getAttribute("aCol") as THREE.BufferAttribute).setXYZ(a, color.r, color.g, color.b);
      pulses[node % nodes.length] = 1;
      pos.needsUpdate = st.needsUpdate = cl.needsUpdate = true;
    };
  }, [arc, nodes, pulses]);

  // live events → arcs
  const queue = useMemo(() => ({ items: [] as { node: number; c: THREE.Color }[] }), []);
  useEffect(
    () =>
      arenaEvents.on((e) => {
        if (e.type === "chat") {
          let h = 0;
          for (let i = 0; i < e.msg.agent_id.length; i++) h = (h * 31 + e.msg.agent_id.charCodeAt(i)) | 0;
          queue.items.push({ node: Math.abs(h), c: CYAN });
        } else {
          for (let i = 0; i < Math.min(6, e.delta); i++) queue.items.push({ node: Math.floor(Math.random() * 12), c: GREEN });
        }
      }),
    [queue],
  );

  const st = useMemo(() => ({ nextAmbient: 1, nextQueue: 0, b0: new THREE.Vector3(), b1: new THREE.Vector3(), b2: new THREE.Vector3(), b3: new THREE.Vector3() }), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const j = getJ();
    const motion = (sig.motion ?? 1) > 0;
    const pixel = gl.getPixelRatio() * (state.size.height / 900) * 1.6;
    const orbit = win(j, -1, 0, 1.35, 1.9) + win(j, 6.8, 7.4, 9.5, 10) * 0.8;
    const standsDim = 1 - (sig.stands ?? 0);

    // node pulses
    const glow = nodeGeo.getAttribute("aGlow") as THREE.BufferAttribute;
    for (let i = 0; i < nodes.length; i++) {
      pulses[i] = Math.max(0, pulses[i] - dt * 0.9);
      glow.setX(i, 0.45 + 0.15 * Math.sin(t * 1.6 + i * 1.3) + pulses[i] * 1.2);
    }
    glow.needsUpdate = true;
    nodeMat.uniforms.uPixel.value = pixel;
    nodeMat.uniforms.uAlpha.value = orbit * standsDim;

    // spawn
    if (motion && orbit > 0.05) {
      if (t > st.nextAmbient) {
        spawn(Math.floor(Math.random() * nodes.length), CYAN, t);
        st.nextAmbient = t + 0.7 + Math.random() * 1.1;
      }
      if (queue.items.length && t > st.nextQueue) {
        const it = queue.items.shift()!;
        spawn(it.node, it.c, t);
        st.nextQueue = t + 0.18;
      }
    } else if (queue.items.length > 24) queue.items.length = 0;
    arc.m.uniforms.uTime.value = t;
    arc.m.uniforms.uAlpha.value = orbit * standsDim;

    // heads follow the bezier
    const hp = arc.hg.getAttribute("position") as THREE.BufferAttribute;
    const hglow = arc.hg.getAttribute("aGlow") as THREE.BufferAttribute;
    for (let a = 0; a < ARCS; a++) {
      const k = ((t - arc.starts[a]) / ARC_LIFE) * 1.35;
      if (k < 0 || k > 1) {
        hglow.setX(a, 0);
        continue;
      }
      st.b0.fromArray(arc.ctrl, a * 12);
      st.b1.fromArray(arc.ctrl, a * 12 + 3);
      st.b2.fromArray(arc.ctrl, a * 12 + 6);
      st.b3.fromArray(arc.ctrl, a * 12 + 9);
      const u = 1 - k;
      st.b0.multiplyScalar(u * u * u).addScaledVector(st.b1, 3 * u * u * k).addScaledVector(st.b2, 3 * u * k * k).addScaledVector(st.b3, k * k * k);
      hp.setXYZ(a, st.b0.x, st.b0.y, st.b0.z);
      hglow.setX(a, (1 - k) * 0.9 + 0.2);
    }
    hp.needsUpdate = hglow.needsUpdate = true;
    arc.hm.uniforms.uPixel.value = pixel;
    arc.hm.uniforms.uAlpha.value = orbit * standsDim;

    // vision nodes light one by one through S8
    const vp = clamp01((j - 7.05) / 0.7);
    const vg = vision.g.getAttribute("aGlow") as THREE.BufferAttribute;
    for (let i = 0; i < vision.n; i++) {
      const on = clamp01(vp * vision.n - i);
      vg.setX(i, on * (0.9 + 0.2 * Math.sin(t * 2 + i)));
    }
    vg.needsUpdate = true;
    const vis = win(j, 6.9, 7.2, 8.2, 8.6);
    vision.m.uniforms.uPixel.value = pixel;
    vision.m.uniforms.uAlpha.value = vis * standsDim;
    vision.lm.opacity = vis * vp * 0.35 * standsDim;
  });

  return (
    <group>
      <points geometry={nodeGeo} material={nodeMat} frustumCulled={false} />
      <lineSegments geometry={arc.g} material={arc.m} frustumCulled={false} />
      <points geometry={arc.hg} material={arc.hm} frustumCulled={false} />
      <points geometry={vision.g} material={vision.m} frustumCulled={false} />
      <lineSegments geometry={vision.lg} material={vision.lm} frustumCulled={false} />
    </group>
  );
}
