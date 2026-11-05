/**
 * MidEarth opening film — real-time title sequence (raw three.js + postprocessing).
 * Deterministic: render(t) is a pure function of the film clock, so skip/seek is trivial.
 *
 *  0.0  void · one signal pinpoint breathes (node 01)
 *  0.5  eclipse: a dark planet silhouettes against a cold corona, hairline graticule
 *  0.6  twelve region nodes ignite (150ms apart), light arcs knit them together
 *  2.4  streams leave every node, curve toward camera and assemble the dome mascot
 *  4.4  assembly flash (anamorphic streak) · camera settles · DOM logo takes over
 */
import * as THREE from "three";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, VignetteEffect } from "postprocessing";
import { sampleLogo } from "./logoSamples";

import { NODES, T, ignitionTime, sstep } from "./timeline";

const FOV = 30;
const CAM_END_Z = 8.8;
const LOGO_Z = 3.2;
const R = 2;

const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function nodeLocal(i: number, r = R * 1.012) {
  const [la, lo] = NODES[i];
  const a = (la * Math.PI) / 180;
  const b = (lo * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
}

/* ───────────── shaders ───────────── */
const SPHERE_V = /* glsl */ `
varying vec3 vN; varying vec3 vL; varying vec3 vW;
void main(){ vL = position; vN = normalize(normalMatrix*normal); vec4 w = modelViewMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*w; }`;
const SPHERE_F = /* glsl */ `
uniform float uReveal; uniform float uLines; uniform float uTime;
varying vec3 vN; varying vec3 vL; varying vec3 vW;
float grid(float v, float n){ float x = v*n; float g = abs(fract(x-0.5)-0.5)/max(fwidth(x),1e-4); return 1.-min(g,1.); }
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(-vW);
  float fres = pow(1.-max(dot(n,v),0.),3.);
  vec3 L = normalize(vec3(0.55,0.5,-0.65));             // corona light behind, upper right
  float back = pow(max(dot(n,L),0.),2.)*fres;            // eclipse rim
  vec3 p = normalize(vL);
  float lat = asin(clamp(p.y,-1.,1.))/3.14159265;        // -0.5..0.5
  float lon = atan(p.x,p.z)/6.2831853;
  float g = max(grid(lat,12.), grid(lon,24.)*(1.-smoothstep(0.42,0.5,abs(lat))));
  float face = smoothstep(0.0,0.6,dot(n,v));
  vec3 col = vec3(0.004,0.012,0.018);
  col += vec3(0.10,0.55,0.62)*fres*0.22;
  col += vec3(0.55,0.9,1.0)*back*1.4;
  col += vec3(0.25,0.75,0.70)*g*0.10*uLines*(0.35+0.65*face);
  gl_FragColor = vec4(col*uReveal,1.);
}`;

const CORONA_V = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const CORONA_F = /* glsl */ `
uniform float uI; uniform float uTime; varying vec2 vUv;
void main(){
  vec2 p = (vUv-0.5)*2.0;            // plane spans 2.6R
  float r = length(p);
  vec2 dirL = normalize(vec2(0.62,0.55));
  float side = 0.35+0.65*pow(max(dot(normalize(p+1e-5),dirL)*0.5+0.5,0.),2.5);
  float ring = exp(-pow((r-0.79)/0.05,2.))*0.9 + exp(-pow((r-0.79)/0.22,2.))*0.25 + exp(-r*2.2)*0.04;
  float ang = atan(p.y,p.x);
  float rays = 0.75+0.25*sin(ang*23.+uTime*0.25)*sin(ang*7.-uTime*0.18);
  vec3 col = mix(vec3(0.20,0.62,0.95), vec3(0.75,0.95,1.0), side) * ring * side * rays * uI;
  gl_FragColor = vec4(col, 1.);
}`;

const NODE_V = /* glsl */ `
attribute float aIgn; attribute float aIdx;
uniform float uTime; uniform float uPR; uniform float uLaunch;
varying float vI;
void main(){
  float t = uTime - aIgn;
  float on = step(0.0,t);
  float flash = on*(1.0 + 2.2*exp(-t*7.0));
  float breath = aIdx < 0.5 ? (0.55+0.45*sin(uTime*5.2-1.57)) : 1.0;
  breath = mix(breath, 1.0, step(0.6,uTime));
  float spent = 1.0 - 0.55*smoothstep(uLaunch, uLaunch+1.6, uTime);
  float pump = 1.0 + 0.8*exp(-pow((uTime-uLaunch-0.15)/0.35,2.)); // flare as streams leave
  vI = flash*breath*spent*pump;
  vec4 mv = modelViewMatrix*vec4(position,1.);
  gl_PointSize = uPR*(26.0+16.0*exp(-max(t,0.)*5.))*(9.0/-mv.z)*on;
  gl_Position = projectionMatrix*mv;
}`;
const NODE_F = /* glsl */ `
varying float vI;
void main(){
  float d = length(gl_PointCoord-0.5)*2.0;
  float core = exp(-d*d*90.0)*2.2;
  float halo = exp(-d*d*9.0)*0.45;
  vec3 c = vec3(0.0,1.0,0.64)*halo + vec3(0.85,1.0,0.95)*core;
  gl_FragColor = vec4(c*vI, 1.);
}`;

const ARC_V = /* glsl */ `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const ARC_F = /* glsl */ `
uniform float uProg; uniform float uFade; varying float vU;
void main(){
  if (vU > uProg) discard;
  float head = exp(-(uProg-vU)*28.0);
  float a = (0.22 + 1.6*head*step(uProg,0.999)) * uFade;
  gl_FragColor = vec4(vec3(0.25,1.0,0.78)*a + vec3(0.8,1.,0.95)*head*0.6*uFade, 1.);
}`;

const P_V = /* glsl */ `
attribute vec3 aStart; attribute vec2 aUv; attribute vec3 aColor; attribute vec4 aRand; attribute float aNode;
uniform float uTime; uniform float uLaunch; uniform mat3 uRot; uniform vec4 uLogo; uniform float uPR; uniform float uSize; uniform float uOpacity;
varying vec3 vColor; varying float vA;
float expoOut(float x){ return x>=1.0 ? 1.0 : 1.0-pow(2.0,-10.0*x); }
vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float t){ float s=1.-t; return s*s*s*a + 3.*s*s*t*b + 3.*s*t*t*c + t*t*t*d; }
void main(){
  float delay = uLaunch + aNode*0.035 + aRand.x*0.7;
  float dur = 1.15 + aRand.y*0.6;
  float lin = clamp((uTime-delay)/dur, 0.0, 1.0);
  float p = expoOut(lin);
  vec3 s = uRot*aStart;
  vec3 n = normalize(s);
  vec3 tgt = vec3(uLogo.x + (aUv.x-0.5)*uLogo.z, uLogo.y - (aUv.y-0.5)*uLogo.w, ${LOGO_Z.toFixed(2)});
  float ang = aRand.w*6.2831853;
  vec3 c1 = s + n*(0.7+aRand.z*1.1) + vec3(0.,0.,0.9);
  vec3 c2 = tgt + vec3(cos(ang),sin(ang),0.)*(0.25+aRand.z*0.55) + vec3(0.,0.,-0.9-aRand.y*0.6);
  vec3 pos = bez(s,c1,c2,tgt,p);
  float tt = uTime*1.3;
  float settle = pow(1.0-p,1.6);
  pos += vec3(sin(pos.y*3.1+tt+aRand.w*9.), sin(pos.z*2.7+tt*0.9+aRand.x*9.), sin(pos.x*2.9+tt*0.7+aRand.y*9.))*0.16*settle;
  pos += vec3(sin(uTime*2.0+aRand.w*40.), cos(uTime*1.7+aRand.z*40.), 0.)*0.0025; // living stillness
  vec4 mv = modelViewMatrix*vec4(pos,1.);
  gl_Position = projectionMatrix*mv;
  float launched = smoothstep(0.0,0.02,lin);
  gl_PointSize = uSize*uPR*(${(CAM_END_Z - LOGO_Z).toFixed(2)}/-mv.z)*(1.0+1.4*settle)*launched;
  vec3 hot = vec3(0.55,1.0,0.82)*1.5;
  vColor = mix(hot, aColor, smoothstep(0.25,0.92,p));
  vA = launched*uOpacity*(0.55+0.45*smoothstep(0.6,1.0,p))*(1.0-0.45*settle);
}`;
const P_F = /* glsl */ `
varying vec3 vColor; varying float vA;
void main(){
  float d = length(gl_PointCoord-0.5)*2.0;
  if (d>1.0) discard;
  float a = (1.0-d*d); a*=a;
  gl_FragColor = vec4(vColor, a*vA);
}`;

const MOTE_V = /* glsl */ `
attribute float aS; attribute float aPh;
uniform float uTime; uniform float uPR; uniform float uI;
varying float vA;
void main(){
  vec3 p = position + vec3(sin(uTime*0.21+aPh)*0.25, cos(uTime*0.17+aPh*1.3)*0.18, 0.);
  vec4 mv = modelViewMatrix*vec4(p,1.);
  float z = -mv.z;
  gl_PointSize = uPR*aS*(1.0/max(z,0.6))*60.0;
  vA = uI*smoothstep(0.4,1.6,z)*(0.5+0.5*sin(uTime*0.6+aPh*5.));
  gl_Position = projectionMatrix*mv;
}`;
const MOTE_F = /* glsl */ `
varying float vA;
void main(){
  float d = length(gl_PointCoord-0.5)*2.0;
  if (d>1.0) discard;
  float disc = smoothstep(1.0,0.86,d)*(0.55+0.45*smoothstep(0.5,0.95,d)); // out-of-focus bokeh with bright rim
  gl_FragColor = vec4(vec3(0.55,0.85,0.95)*disc*vA, 1.);
}`;

const STREAK_F = /* glsl */ `
uniform float uI; varying vec2 vUv;
void main(){
  vec2 p = vUv-0.5;
  float s = exp(-pow(p.y/0.006,2.))*exp(-abs(p.x)*5.5) + exp(-pow(p.y/0.05,2.))*exp(-abs(p.x)*9.)*0.25;
  float core = exp(-dot(p*vec2(1.,6.),p*vec2(1.,6.))*900.)*1.5;
  gl_FragColor = vec4(vec3(0.55,0.95,0.85)*s*uI + vec3(1.)*core*uI, 1.);
}`;

export type FilmOptions = { canvas: HTMLCanvasElement; logoSlot: HTMLElement; mobile: boolean };
export type Film = { render: (t: number) => void; resize: () => void; dispose: () => void };

export function createFilm({ canvas, logoSlot, mobile }: FilmOptions): Film {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000205, 1);
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const disposables: { dispose: () => void }[] = [];
  const track = <X extends { dispose: () => void }>(x: X) => (disposables.push(x), x);

  const blend = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

  // corona (behind planet)
  const coronaMat = track(new THREE.ShaderMaterial({ vertexShader: CORONA_V, fragmentShader: CORONA_F, uniforms: { uI: { value: 0 }, uTime: { value: 0 } }, ...blend }));
  const corona = new THREE.Mesh(track(new THREE.PlaneGeometry(R * 2.6, R * 2.6)), coronaMat);
  corona.position.z = -0.6;
  corona.scale.setScalar(1.0);
  scene.add(corona);

  // planet
  const globe = new THREE.Group();
  scene.add(globe);
  const sphereMat = track(new THREE.ShaderMaterial({ vertexShader: SPHERE_V, fragmentShader: SPHERE_F, uniforms: { uReveal: { value: 0 }, uLines: { value: 0 }, uTime: { value: 0 } } }));
  globe.add(new THREE.Mesh(track(new THREE.SphereGeometry(R, 96, 64)), sphereMat));

  // nodes
  const nodePos = new Float32Array(NODES.length * 3);
  const nodeIgn = new Float32Array(NODES.length);
  const nodeIdx = new Float32Array(NODES.length);
  const local = NODES.map((_, i) => nodeLocal(i));
  local.forEach((v, i) => {
    v.toArray(nodePos, i * 3);
    nodeIgn[i] = ignitionTime(i);
    nodeIdx[i] = i;
  });
  const nodeGeo = track(new THREE.BufferGeometry());
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute("aIgn", new THREE.BufferAttribute(nodeIgn, 1));
  nodeGeo.setAttribute("aIdx", new THREE.BufferAttribute(nodeIdx, 1));
  const nodeMat = track(
    new THREE.ShaderMaterial({ vertexShader: NODE_V, fragmentShader: NODE_F, uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uLaunch: { value: T.launch } }, ...blend, depthTest: true }),
  );
  globe.add(new THREE.Points(nodeGeo, nodeMat));

  // arcs: every new node links to its nearest lit predecessor, plus long-haul links
  const pairs: [number, number, number][] = [];
  for (let i = 1; i < NODES.length; i++) {
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = local[i].distanceTo(local[j]);
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    pairs.push([best, i, nodeIgn[i]]);
  }
  pairs.push([1, 9, 1.9], [4, 11, 2.05], [3, 8, 2.2], [6, 5, 2.3]);
  const arcs = pairs.map(([a, b, start]) => {
    const A = local[a].clone().normalize();
    const B = local[b].clone().normalize();
    const omega = Math.acos(Math.min(1, Math.max(-1, A.dot(B))));
    const N = 72;
    const pos = new Float32Array((N + 1) * 3);
    const u = new Float32Array(N + 1);
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const sa = Math.sin((1 - t) * omega) / Math.sin(omega);
      const sb = Math.sin(t * omega) / Math.sin(omega);
      const p = A.clone().multiplyScalar(sa).add(B.clone().multiplyScalar(sb));
      p.multiplyScalar(R * (1.012 + 0.16 * omega * Math.sin(Math.PI * t)));
      p.toArray(pos, k * 3);
      u[k] = t;
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aU", new THREE.BufferAttribute(u, 1));
    const m = track(new THREE.ShaderMaterial({ vertexShader: ARC_V, fragmentShader: ARC_F, uniforms: { uProg: { value: 0 }, uFade: { value: 1 } }, ...blend }));
    globe.add(new THREE.Line(g, m));
    return { m, start, dur: 0.35 + omega * 0.35 };
  });

  // particles
  const COUNT = mobile ? 12000 : 40000;
  const logo = sampleLogo(COUNT);
  const n = logo.count;
  const aStart = new Float32Array(n * 3);
  const aRand = new Float32Array(n * 4);
  const aNode = new Float32Array(n);
  const nodeAng = local.map((v) => Math.atan2(v.y, v.x));
  for (let i = 0; i < n; i++) {
    const u = logo.uv[i * 2] - 0.5;
    const v = -(logo.uv[i * 2 + 1] - 0.5) * (200 / 240);
    const r = Math.hypot(u, v);
    let k = 0;
    if (r > 0.16 || Math.random() < 0.1) {
      const a = Math.atan2(v, u) + (Math.random() - 0.5) * 1.1;
      let bd = Infinity;
      for (let j = 1; j < NODES.length; j++) {
        let d = Math.abs(a - nodeAng[j]);
        d = Math.min(d, Math.PI * 2 - d);
        if (d < bd) {
          bd = d;
          k = j;
        }
      }
    }
    local[k].toArray(aStart, i * 3);
    aNode[i] = k;
    aRand[i * 4] = Math.random();
    aRand[i * 4 + 1] = Math.random();
    aRand[i * 4 + 2] = Math.random();
    aRand[i * 4 + 3] = Math.random();
  }
  const pGeo = track(new THREE.BufferGeometry());
  pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  pGeo.setAttribute("aStart", new THREE.BufferAttribute(aStart, 3));
  pGeo.setAttribute("aUv", new THREE.BufferAttribute(logo.uv.subarray(0, n * 2), 2));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(logo.color.subarray(0, n * 3), 3));
  pGeo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 4));
  pGeo.setAttribute("aNode", new THREE.BufferAttribute(aNode, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const pMat = track(
    new THREE.ShaderMaterial({
      vertexShader: P_V,
      fragmentShader: P_F,
      uniforms: {
        uTime: { value: 0 },
        uLaunch: { value: T.launch },
        uRot: { value: new THREE.Matrix3() },
        uLogo: { value: new THREE.Vector4(0, 0, 1, 1) },
        uPR: { value: pr },
        uSize: { value: 2 },
        uOpacity: { value: 1 },
      },
      ...blend,
    }),
  );
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  scene.add(particles);

  // foreground bokeh motes — volumetric depth during the dolly
  const MOTES = mobile ? 40 : 110;
  const mPos = new Float32Array(MOTES * 3);
  const mS = new Float32Array(MOTES);
  const mPh = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 1.6 + Math.random() * 3.2;
    mPos[i * 3] = Math.cos(a) * rr * 1.4;
    mPos[i * 3 + 1] = Math.sin(a) * rr * 0.8;
    mPos[i * 3 + 2] = 3 + Math.random() * 6;
    mS[i] = 0.25 + Math.random() * 0.9;
    mPh[i] = Math.random() * 10;
  }
  const moteGeo = track(new THREE.BufferGeometry());
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  moteGeo.setAttribute("aS", new THREE.BufferAttribute(mS, 1));
  moteGeo.setAttribute("aPh", new THREE.BufferAttribute(mPh, 1));
  const moteMat = track(new THREE.ShaderMaterial({ vertexShader: MOTE_V, fragmentShader: MOTE_F, uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uI: { value: 0 } }, ...blend }));
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // anamorphic streak at the assembly flash
  const streakMat = track(new THREE.ShaderMaterial({ vertexShader: CORONA_V, fragmentShader: STREAK_F, uniforms: { uI: { value: 0 } }, ...blend, depthTest: false }));
  const streak = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), streakMat);
  streak.renderOrder = 10;
  scene.add(streak);

  // post: bloom on light sources only (high threshold), vignette, film noise
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: mobile ? 0 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.18, intensity: 1.0, radius: 0.72 });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.72 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.SCREEN, premultiply: true });
  noise.blendMode.opacity.value = 0.18;
  composer.addPass(new EffectPass(camera, bloom, vignette, noise));

  const rot = new THREE.Matrix4();
  const rot3 = new THREE.Matrix3();

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const r = logoSlot.getBoundingClientRect();
    const d = CAM_END_Z - LOGO_Z;
    const upp = (2 * d * Math.tan(((FOV / 2) * Math.PI) / 180)) / h;
    const lw = r.width * upp;
    const lh = r.height * upp;
    const cx = (r.left + r.width / 2 - w / 2) * upp;
    const cy = -(r.top + r.height / 2 - h / 2) * upp;
    pMat.uniforms.uLogo.value.set(cx, cy, lw, lh);
    const area = r.width * r.height * 0.69;
    pMat.uniforms.uSize.value = Math.min(4, Math.max(1.3, Math.sqrt((4 * area) / n)));
    streak.position.set(cx, cy, LOGO_Z + 0.05);
    streak.scale.set(lw * 6, lw * 1.6, 1);
  };
  resize();

  const render = (t: number) => {
    // camera: slow orbital dolly that settles dead-centre at 4.8s (logo alignment)
    const e = easeOutCubic(t / 4.8);
    const drift = 1 - e;
    camera.position.set(1.05 * drift + Math.sin(t * 0.7) * 0.02 * drift, 0.42 * drift, 12.6 - (12.6 - CAM_END_Z) * e);
    camera.lookAt(0, -0.08 * drift, 0);

    globe.rotation.y = -0.35 + t * 0.045;
    globe.rotation.x = 0.12;
    globe.updateMatrixWorld();
    rot.extractRotation(globe.matrixWorld);
    rot3.setFromMatrix4(rot);

    const reveal = sstep(0.35, 1.7, t) * (1 - 0.6 * sstep(2.8, 4.6, t));
    sphereMat.uniforms.uReveal.value = reveal;
    sphereMat.uniforms.uLines.value = sstep(0.7, 2.0, t);
    coronaMat.uniforms.uI.value = sstep(0.3, 1.9, t) * (1 - 0.55 * sstep(3.0, 4.8, t)) * 0.55;
    coronaMat.uniforms.uTime.value = t;
    nodeMat.uniforms.uTime.value = t;
    for (const a of arcs) {
      a.m.uniforms.uProg.value = sstep(a.start, a.start + a.dur, t) * 1.0001;
      a.m.uniforms.uFade.value = 1 - 0.8 * sstep(2.6, 4.2, t);
    }
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uRot.value.copy(rot3);
    pMat.uniforms.uOpacity.value = 1 - sstep(T.solid + 0.15, T.solid + 0.9, t) * 0.85;
    moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uI.value = sstep(0.8, 2.2, t) * (1 - sstep(4.0, 5.0, t)) * 0.12;
    const f = t - T.flash;
    streakMat.uniforms.uI.value = f > 0 ? Math.exp(-f * 3.2) * Math.min(1, f * 12) * 1.2 : 0;
    bloom.intensity = 0.95 + 0.9 * Math.exp(-Math.pow((t - T.flash - 0.05) / 0.25, 2));
    composer.render();
  };

  const dispose = () => {
    composer.dispose();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return { render, resize, dispose };
}
