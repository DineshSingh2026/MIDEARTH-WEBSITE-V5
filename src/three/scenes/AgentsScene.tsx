"use client";
/**
 * /agents — Endpoint constellation. A living 3D star map: every real endpoint (AGENTS.reference)
 * is a star, clustered by auth scope; edges trace call order and carry light pulses in sequence.
 * The stars for the section in view glow (frameState.signals.agentsSection, set by the page).
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { frameState } from "../registry";
import { useUI } from "@/store/ui";
import { EDGES, NODES, SIGNAL_KEY, sectionNodeIdx } from "@/components/agents/constellation";

// Seeded RNG (deterministic layout)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUSTER: [number, number, number][] = [
  [-2.7, 1.0, -0.4], // No key
  [0.5, -0.3, -1.2], // Gameplay key
  [2.9, 1.25, 0.2], // Financial key
  [2.3, -1.75, 0.9], // Either key
];
const GROUP_TONE = ["--paper-dim", "--agent", "--value", "--paper"];

const cssColor = (v: string, fb: string) => {
  const s = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return new THREE.Color(s || fb);
};

const nodeVert = /* glsl */ `
  attribute vec3 aColor; attribute float aGlow; attribute float aSeed;
  uniform float uTime; uniform float uPx; uniform float uMotion;
  varying vec3 vColor; varying float vGlow; varying float vTw;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.85 + 0.15*sin(uTime*1.7 + aSeed*40.0)*uMotion;
    vTw = tw; vColor = aColor; vGlow = aGlow;
    gl_PointSize = (10.0 + aGlow*34.0) * tw * uPx * (8.0 / -mv.z);
  }`;
const nodeFrag = /* glsl */ `
  uniform float uLight; uniform float uTime;
  varying vec3 vColor; varying float vGlow; varying float vTw;
  void main(){
    vec2 p = gl_PointCoord - 0.5; float d = length(p);
    if(d>0.5) discard;
    float core = smoothstep(0.13, 0.0, d);
    float halo = pow(smoothstep(0.5, 0.0, d), 3.0) * (0.25 + vGlow*0.9);
    float ring = smoothstep(0.012, 0.0, abs(d - 0.36 - 0.03*sin(uTime*2.0))) * vGlow;
    // cross-flare: star spikes on lit nodes
    float spike = (smoothstep(0.035,0.0,abs(p.x)) + smoothstep(0.035,0.0,abs(p.y))) * smoothstep(0.5,0.0,d) * vGlow * 0.7;
    float a = core + halo + ring*0.8 + spike;
    vec3 col = mix(vColor, vec3(1.0), core*0.6*(1.0-uLight));
    gl_FragColor = vec4(col, clamp(a,0.0,1.0) * (0.45 + 0.55*max(vGlow, 0.35)) * vTw);
  }`;

const edgeVert = /* glsl */ `
  attribute float aT; attribute float aDepth; attribute float aLit; attribute float aSpine;
  varying float vT; varying float vDepth; varying float vLit; varying float vSpine;
  void main(){ vT=aT; vDepth=aDepth; vLit=aLit; vSpine=aSpine; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const edgeFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uCol; uniform vec3 uHot; uniform float uMotion;
  varying float vT; varying float vDepth; varying float vLit; varying float vSpine;
  void main(){
    // a pulse leaves each chain's first node and hops edge-by-edge in call order
    float cycle = fract(uTime*0.16);
    float head = cycle*7.0 - vDepth;          // 0..1 while this edge is the active hop
    float pulse = (head>0.0 && head<1.0) ? smoothstep(0.22,0.0,abs(vT-head)) : 0.0;
    pulse *= uMotion;
    float base = 0.10 + vLit*0.35 + vSpine*0.12;
    vec3 col = mix(uCol, uHot, clamp(pulse + vLit*0.4,0.0,1.0));
    gl_FragColor = vec4(col, base + pulse*(0.6+vLit*0.4));
  }`;

const starVert = /* glsl */ `
  attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uMotion; varying float vA;
  void main(){
    vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
    vA = 0.35 + 0.65*(0.5+0.5*sin(uTime*(0.6+aSeed*1.4)*uMotion + aSeed*60.0));
    gl_PointSize = (1.2 + aSeed*2.2) * uPx * (10.0 / -mv.z);
  }`;
const starFrag = /* glsl */ `
  uniform vec3 uCol; uniform float uAlpha; varying float vA;
  void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(uCol, smoothstep(0.5,0.0,d)*vA*uAlpha); }`;

export default function AgentsScene() {
  const mode = useUI((s) => s.mode);
  const motion = useUI((s) => s.motion);
  const { size, gl } = useThree();
  const root = useRef<THREE.Group>(null);
  const field = useRef<THREE.Group>(null);
  const glow = useRef(new Float32Array(NODES.length));

  // ── layout ──
  const positions = useMemo(() => {
    const r = rng(40 * 40);
    const counts = [0, 0, 0, 0];
    const totals = [0, 0, 0, 0];
    NODES.forEach((n) => totals[n.gi]++);
    return NODES.map((n) => {
      const k = counts[n.gi]++;
      const N = totals[n.gi];
      const rad = 0.45 + Math.sqrt(N) * 0.32;
      const y = 1 - (2 * (k + 0.5)) / N;
      const rr = Math.sqrt(1 - y * y);
      const th = k * 2.399963 + n.gi;
      const c = CLUSTER[n.gi];
      return new THREE.Vector3(
        c[0] + Math.cos(th) * rr * rad + (r() - 0.5) * 0.25,
        c[1] + y * rad * 0.8 + (r() - 0.5) * 0.25,
        c[2] + Math.sin(th) * rr * rad + (r() - 0.5) * 0.25,
      );
    });
  }, []);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(NODES.length * 3);
    positions.forEach((v, i) => v.toArray(p, i * 3));
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(NODES.length * 3), 3));
    g.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(NODES.length), 1));
    const r = rng(7);
    g.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from(NODES, () => r()), 1));
    return g;
  }, [positions]);

  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const SEG = 16; // subdivide each edge into a gentle arc so pulses can travel
    const pos: number[] = [];
    const t: number[] = [];
    const depth: number[] = [];
    const spine: number[] = [];
    const ends: number[] = [];
    EDGES.forEach(([a, b, d, sp]) => {
      const A = positions[a];
      const B = positions[b];
      const mid = A.clone().add(B).multiplyScalar(0.5);
      mid.z += 0.35 + A.distanceTo(B) * 0.12;
      mid.y += 0.15;
      const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
      const pts = curve.getPoints(SEG);
      for (let i = 0; i < SEG; i++) {
        pos.push(...pts[i].toArray(), ...pts[i + 1].toArray());
        t.push(i / SEG, (i + 1) / SEG);
        depth.push(d, d);
        spine.push(sp ? 1 : 0, sp ? 1 : 0);
        ends.push(a, b, a, b);
      }
    });
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
    g.setAttribute("aDepth", new THREE.Float32BufferAttribute(depth, 1));
    g.setAttribute("aSpine", new THREE.Float32BufferAttribute(spine, 1));
    g.setAttribute("aLit", new THREE.Float32BufferAttribute(new Float32Array(t.length), 1));
    g.userData.ends = ends;
    return g;
  }, [positions]);

  const STARS = frameState.tier === 0 ? 900 : frameState.tier === 1 ? 1800 : 3200;
  const starGeo = useMemo(() => {
    const r = rng(1600);
    const p = new Float32Array(STARS * 3);
    const s = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rad = 9 + r() * 30;
      const q = Math.sqrt(1 - u * u);
      p.set([Math.cos(th) * q * rad, u * rad * 0.7, Math.sin(th) * q * rad - 10], i * 3);
      s[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    return g;
  }, [STARS]);

  const uniforms = useMemo(
    () => ({
      node: { uTime: { value: 0 }, uPx: { value: 1 }, uLight: { value: 0 }, uMotion: { value: 1 } },
      edge: { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }, uMotion: { value: 1 } },
      star: { uTime: { value: 0 }, uPx: { value: 1 }, uMotion: { value: 1 }, uCol: { value: new THREE.Color() }, uAlpha: { value: 0.7 } },
    }),
    [],
  );

  const mats = useMemo(() => {
    const mk = (vertexShader: string, fragmentShader: string, u: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { node: mk(nodeVert, nodeFrag, uniforms.node), edge: mk(edgeVert, edgeFrag, uniforms.edge), star: mk(starVert, starFrag, uniforms.star) };
  }, [uniforms]);

  // ── palette follows Field / Stands tokens ──
  useEffect(() => {
    const light = mode === "stands";
    const blend = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    Object.values(mats).forEach((m) => {
      m.blending = blend;
      m.needsUpdate = true;
    });
    const col = nodeGeo.getAttribute("aColor") as THREE.BufferAttribute;
    const reg = cssColor("--signal", "#00ffa3");
    NODES.forEach((n, i) => {
      const c = n.id === "POST /gateway/register" ? reg : cssColor(GROUP_TONE[n.gi], "#8da0a9");
      col.setXYZ(i, c.r, c.g, c.b);
    });
    col.needsUpdate = true;
    uniforms.node.uLight.value = light ? 1 : 0;
    uniforms.edge.uCol.value.copy(cssColor("--paper-dim", "#8da0a9"));
    uniforms.edge.uHot.value.copy(cssColor("--signal", "#00ffa3"));
    uniforms.star.uCol.value.copy(cssColor("--paper", "#dfe9ec"));
    uniforms.star.uAlpha.value = light ? 0.35 : 0.75;
  }, [mode, mats, nodeGeo, uniforms]);

  useEffect(
    () => () => {
      nodeGeo.dispose();
      edgeGeo.dispose();
      starGeo.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [nodeGeo, edgeGeo, starGeo, mats],
  );

  const wide = size.width >= 1024;
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const m = motion ? 1 : 0;
    const px = gl.getPixelRatio();
    uniforms.node.uTime.value = t;
    uniforms.node.uPx.value = px;
    uniforms.node.uMotion.value = m;
    uniforms.edge.uTime.value = motion ? t : 2.2;
    uniforms.edge.uMotion.value = m;
    uniforms.star.uTime.value = t;
    uniforms.star.uPx.value = px;
    uniforms.star.uMotion.value = m;

    // glow targets
    const sec = frameState.signals[SIGNAL_KEY] ?? 0;
    const lit = new Set(sectionNodeIdx(sec));
    const allLit = lit.size === NODES.length;
    const g = glow.current;
    const k = motion ? 1 - Math.exp(-dt * 4) : 1;
    const ga = nodeGeo.getAttribute("aGlow") as THREE.BufferAttribute;
    for (let i = 0; i < NODES.length; i++) {
      const target = lit.has(i) ? (allLit ? 0.55 : 1) : 0;
      g[i] += (target - g[i]) * k;
      ga.setX(i, g[i]);
    }
    ga.needsUpdate = true;
    const la = edgeGeo.getAttribute("aLit") as THREE.BufferAttribute;
    const ends = edgeGeo.userData.ends as number[];
    for (let v = 0; v < la.count; v++) la.setX(v, Math.min(g[ends[v * 2]], g[ends[v * 2 + 1]]));
    la.needsUpdate = true;

    // living drift: slow yaw + scroll-driven roll + pointer parallax
    if (root.current) {
      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      const doc = typeof document !== "undefined" ? document.documentElement.scrollHeight - window.innerHeight : 1;
      const sp = doc > 0 ? scrollY / doc : 0;
      const yaw = motion ? t * 0.035 + sp * 1.4 : 0.35;
      root.current.rotation.y += (yaw - root.current.rotation.y) * (motion ? 0.06 : 1);
      const pitch = motion ? frameState.pointer.y * 0.12 + Math.sin(t * 0.2) * 0.04 : 0.08;
      root.current.rotation.x += (pitch - root.current.rotation.x) * (motion ? 0.05 : 1);
      root.current.position.x = wide ? 1.6 : 0;
      root.current.position.y = wide ? 0 : -0.6;
      root.current.scale.setScalar(wide ? 1 : 0.62);
    }
    if (field.current && motion) {
      field.current.rotation.y = t * 0.006 + frameState.pointer.x * 0.03;
      field.current.rotation.x = frameState.pointer.y * 0.02;
    }
  });

  return (
    <>
      <group ref={field}>
        <points geometry={starGeo} material={mats.star} />
      </group>
      <group ref={root}>
        <lineSegments geometry={edgeGeo} material={mats.edge} />
        <points geometry={nodeGeo} material={mats.node} />
      </group>
    </>
  );
}
