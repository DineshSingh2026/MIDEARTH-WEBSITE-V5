"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FACTS } from "@/content/facts";
import { POINT_DOF_VERT, POINT_FRAG_SHAPE } from "./glsl";
import { STRATA_Y, getJ, sig, strataLocal, win, clamp01, smooth } from "./journey";

/* ───────── shared helpers ───────── */
const C = {
  cyan: new THREE.Color("#22C8E8"),
  gold: new THREE.Color("#E3B341"),
  green: new THREE.Color("#00FFA3"),
  paper: new THREE.Color("#DFE9EC"),
  dim: new THREE.Color("#3B4A52"),
};

function lineMat(color: THREE.Color) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
}
function segs(arr: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
  return g;
}
function circle(r: number, n = 96, y = 0, out: number[] = []) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    out.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
  }
  return out;
}
/** key glyph (bow + shaft + teeth) lying in the slab plane, pointing +x */
function keyGlyph() {
  const a: number[] = [];
  circle(0.055, 32, 0, a).forEach((v, i) => {
    if (i % 3 === 0) a[i] = v - 0.11;
  });
  a.push(-0.055, 0, 0, 0.16, 0, 0, 0.16, 0, 0, 0.16, 0, 0.05, 0.11, 0, 0, 0.11, 0, 0.035);
  return segs(a);
}

/** Points with DoF + per-point colour/alpha in attributes; uniforms uAlpha/uPixel. */
function pointsMat() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uAlpha: { value: 0 }, uPixel: { value: 1 }, uFocus: { value: 1 }, uAperture: { value: 0.6 }, uSize: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aCA; attribute float aS;
      uniform float uPixel, uFocus, uAperture, uSize;
      varying vec4 vCA; varying float vBlur;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        ${POINT_DOF_VERT}
        vCA = aCA;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aS * uSize * uPixel * (1.0 + vBlur * 3.0) / -mv.z, 64.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAlpha; varying vec4 vCA; varying float vBlur;
      void main(){
        ${POINT_FRAG_SHAPE}
        float a = shape * vCA.a * uAlpha / (1.0 + vBlur * 5.0);
        if (a < 0.003) discard;
        gl_FragColor = vec4(vCA.rgb * a, a);
      }
    `,
  });
}
function pointsGeo(n: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aCA", new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute("aS", new THREE.BufferAttribute(new Float32Array(n).fill(4), 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
  return g;
}

/* ───────── the five strata ───────── */
const FUND_N = 700;
const SEATS_MAX = 200;
const NET = [5, 8, 8, 3]; // obs channels in → hidden → 3 continuous actions out
const EARN_N = 520;

export function Strata() {
  const { gl } = useThree();

  const w = useMemo(() => {
    // slab discs: a ring of sediment particles + hairline rings (one per call)
    const slabN = 2600;
    const slab = pointsGeo(slabN * 5);
    {
      const p = slab.getAttribute("position") as THREE.BufferAttribute;
      const ca = slab.getAttribute("aCA") as THREE.BufferAttribute;
      const s = slab.getAttribute("aS") as THREE.BufferAttribute;
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      for (let k = 0; k < 5; k++)
        for (let i = 0; i < slabN; i++) {
          const idx = k * slabN + i;
          const r = 0.55 + Math.pow(rnd(), 0.7) * 1.25;
          const a = rnd() * Math.PI * 2;
          p.setXYZ(idx, Math.cos(a) * r, STRATA_Y[k] + (rnd() - 0.5) * 0.05, Math.sin(a) * r);
          const c = k === 1 || k === 4 ? C.gold : k === 3 ? C.green : C.cyan;
          const m = 0.18 + rnd() * 0.25;
          ca.setXYZW(idx, c.r * m + 0.08, c.g * m + 0.1, c.b * m + 0.12, 0.35 + rnd() * 0.5);
          s.setX(idx, 2 + rnd() * 3);
        }
    }
    const ringsArr: number[] = [];
    STRATA_Y.forEach((y) => {
      circle(0.5, 128, y, ringsArr);
      circle(1.85, 160, y, ringsArr);
    });
    const rings = segs(ringsArr);

    // 01 Register — keys forge and split; claim-code token drifts up
    const key = keyGlyph();
    const token = segs([-0.03, 0, -0.03, 0.03, 0, -0.03, 0.03, 0, -0.03, 0.03, 0, 0.03, 0.03, 0, 0.03, -0.03, 0, 0.03, -0.03, 0, 0.03, -0.03, 0, -0.03, -0.015, 0, 0, 0.015, 0, 0]);

    // 02 Fund — spiral stream into a one-time deposit address
    const fund = pointsGeo(FUND_N);
    const fundSeed = new Float32Array(FUND_N * 2);
    for (let i = 0; i < FUND_N; i++) {
      fundSeed[i * 2] = Math.random();
      fundSeed[i * 2 + 1] = Math.random();
    }
    const addrArr: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      addrArr.push(Math.cos(a0) * 0.08, 0, Math.sin(a0) * 0.08, Math.cos(a1) * 0.08, 0, Math.sin(a1) * 0.08);
    }
    const addr = segs(addrArr);

    // 03 Train — locked ONNX wireframe: shape fixed, weights shuffle
    const nodePos: THREE.Vector3[][] = NET.map((n, l) =>
      Array.from({ length: n }, (_, i) => new THREE.Vector3(-0.27 + l * 0.18, 0, (i - (n - 1) / 2) * 0.055)),
    );
    const eArr: number[] = [];
    const eIdx: number[] = [];
    let e = 0;
    for (let l = 0; l < NET.length - 1; l++)
      for (const a of nodePos[l])
        for (const b of nodePos[l + 1]) {
          eArr.push(a.x, 0, a.z, b.x, 0, b.z);
          eIdx.push(e, e);
          e++;
        }
    const edges = segs(eArr);
    edges.setAttribute("aE", new THREE.BufferAttribute(new Float32Array(eIdx), 1));
    const edgeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uAlpha: { value: 0 }, uSeed: { value: 0 } },
      vertexShader: `attribute float aE; uniform float uSeed; varying float vW;
        float h(float n){ return fract(sin(n * 12.9898 + uSeed * 78.233) * 43758.5453); }
        void main(){ vW = pow(h(aE), 2.2); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uAlpha; varying float vW;
        void main(){ float a = (0.08 + vW * 0.9) * uAlpha; gl_FragColor = vec4(vec3(0.13, 0.78, 0.91) * a * 1.4, a); }`,
    });
    const netNodes = pointsGeo(NET.reduce((a, b) => a + b, 0));
    {
      const p = netNodes.getAttribute("position") as THREE.BufferAttribute;
      const ca = netNodes.getAttribute("aCA") as THREE.BufferAttribute;
      let i = 0;
      nodePos.forEach((layer, l) =>
        layer.forEach((v) => {
          p.setXYZ(i, v.x, 0, v.z);
          const c = l === 0 ? C.paper : l === NET.length - 1 ? C.green : C.cyan;
          ca.setXYZW(i, c.r, c.g, c.b, 1);
          (netNodes.getAttribute("aS") as THREE.BufferAttribute).setX(i, 9);
          i++;
        }),
      );
    }
    const frame = segs([-0.33, 0, -0.27, 0.33, 0, -0.27, 0.33, 0, -0.27, 0.33, 0, 0.27, 0.33, 0, 0.27, -0.33, 0, 0.27, -0.33, 0, 0.27, -0.33, 0, -0.27]);

    // 04 Compete — pool ring, one dot per seat
    const seats = pointsGeo(SEATS_MAX);
    const lock = segs(circle(0.36, 128));

    // 05 Earn — rank ladder by FACTS.payoutCurve, gold flowing in proportion
    const L = 0.62;
    const ranks: { z: number; len: number; pct: number }[] = [];
    let z = -0.26;
    for (const b of FACTS.payoutCurve) {
      const n = b.to - b.from + 1;
      for (let r = 0; r < n; r++) {
        ranks.push({ z, len: Math.max(0.004, (b.pct / n / 0.4) * L), pct: b.pct / n });
        z += n > 1 ? 0.3 / 178 : 0.06;
      }
    }
    const ladderArr: number[] = [];
    ranks.forEach((r) => ladderArr.push(-0.3, 0, r.z, -0.3 + r.len, 0, r.z));
    ladderArr.push(-0.31, 0, -0.29, -0.31, 0, z);
    const ladder = segs(ladderArr);
    const earn = pointsGeo(EARN_N);
    // allocate particles to rungs by payout share (cumulative)
    const earnTarget = new Float32Array(EARN_N * 2);
    {
      const cum: number[] = [];
      let acc = 0;
      ranks.forEach((r) => cum.push((acc += r.pct)));
      for (let i = 0; i < EARN_N; i++) {
        const u = (i / EARN_N) * acc;
        const ri = cum.findIndex((c) => c >= u);
        const r = ranks[Math.max(0, ri)];
        earnTarget[i * 2] = -0.3 + Math.random() * r.len;
        earnTarget[i * 2 + 1] = r.z;
      }
    }

    return {
      slab,
      slabMat: pointsMat(),
      rings,
      ringsMat: lineMat(C.dim),
      key,
      keyCyan: lineMat(C.cyan),
      keyGold: lineMat(C.gold),
      token,
      tokenMat: lineMat(C.green),
      fund,
      fundMat: pointsMat(),
      fundSeed,
      addr,
      addrMat: lineMat(C.gold),
      edges,
      edgeMat,
      netNodes,
      netMat: pointsMat(),
      frame,
      frameMat: lineMat(C.green),
      seats,
      seatsMat: pointsMat(),
      lock,
      lockMat: lineMat(C.green),
      ladder,
      ladderMat: lineMat(C.gold),
      earn,
      earnMat: pointsMat(),
      earnTarget,
      tmpC: new THREE.Color(),
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

  const refs = useMemo(
    () => ({
      kc: new THREE.LineSegments(w.key, w.keyCyan),
      kg: new THREE.LineSegments(w.key, w.keyGold),
      tok: new THREE.LineSegments(w.token, w.tokenMat),
      addr: new THREE.LineSegments(w.addr, w.addrMat),
      lock: new THREE.LineSegments(w.lock, w.lockMat),
    }),
    [w],
  );

  useFrame((state) => {
    const j = getJ();
    const t = state.clock.elapsedTime;
    const pixel = gl.getPixelRatio() * (state.size.height / 900) * 1.6;
    const focus = sig.focus ?? 1;
    const ap = sig.aperture ?? 0.6;
    const all = win(j, 1.75, 2.0, 3.0, 3.25);
    const motion = (sig.motion ?? 1) > 0;
    const stands = 1 - (sig.stands ?? 0);

    for (const m of [w.slabMat, w.fundMat, w.netMat, w.seatsMat, w.earnMat]) {
      m.uniforms.uPixel.value = pixel;
      m.uniforms.uFocus.value = focus;
      m.uniforms.uAperture.value = ap;
    }
    w.slabMat.uniforms.uAlpha.value = all * stands;
    w.ringsMat.opacity = all * 0.6 * stands;

    const vis = (k: number) => {
      const p = strataLocal(j, k);
      return { p, v: win(p, -0.7, -0.15, 1.05, 1.5) * stands };
    };

    /* 01 Register */
    {
      const { p, v } = vis(0);
      const y = STRATA_Y[0] + 0.02;
      const split = smooth((p - 0.15) / 0.45);
      const forge = 1 - split;
      const fl = forge * (0.6 + 0.4 * Math.sin(t * 22));
      refs.kc.position.set(-split * 0.22, y, -0.02 - split * 0.05);
      refs.kg.position.set(split * 0.22, y, 0.02 + split * 0.05);
      refs.kc.rotation.y = split * 0.5;
      refs.kg.rotation.y = Math.PI - split * 0.5;
      w.keyCyan.opacity = v * (0.75 + fl * 0.5);
      w.keyGold.opacity = v * (0.75 + fl * 0.5);
      const rise = clamp01((p - 0.45) / 0.55);
      refs.tok.position.set(0, y + rise * 0.55, 0.04);
      refs.tok.rotation.y = t * 0.8;
      w.tokenMat.opacity = v * smooth(rise * 4) * (1 - smooth((rise - 0.8) / 0.2));
    }
    /* 02 Fund */
    {
      const { p, v } = vis(1);
      const y = STRATA_Y[1] + 0.02;
      const dissolve = smooth((p - 0.6) / 0.3);
      const pos = w.fund.getAttribute("position") as THREE.BufferAttribute;
      const ca = w.fund.getAttribute("aCA") as THREE.BufferAttribute;
      if (v > 0) {
        for (let i = 0; i < FUND_N; i++) {
          const s0 = w.fundSeed[i * 2];
          const s1 = w.fundSeed[i * 2 + 1];
          const s = ((motion ? t * 0.22 : 0.5) + s0) % 1;
          const r = 0.08 + (1 - s) * (0.85 + s1 * 0.3);
          const a = s1 * Math.PI * 2 + s * 4.2;
          pos.setXYZ(i, Math.cos(a) * r, y + (1 - s) * 0.12 * Math.sin(s1 * 40), Math.sin(a) * r);
          // asset light (cyan) becomes IDLE credit (gold) as it reaches the address
          w.tmpC.copy(C.cyan).lerp(C.gold, smooth((s - 0.55) / 0.4));
          ca.setXYZW(i, w.tmpC.r, w.tmpC.g, w.tmpC.b, Math.sin(s * Math.PI) * (1 - dissolve));
        }
        pos.needsUpdate = ca.needsUpdate = true;
      }
      w.fundMat.uniforms.uAlpha.value = v;
      w.fundMat.uniforms.uSize.value = 0.9;
      refs.addr.position.set(0, y, 0);
      refs.addr.scale.setScalar(1 + dissolve * 2.4);
      refs.addr.rotation.y = t * 0.3;
      w.addrMat.opacity = v * (1 - dissolve) * (0.8 + 0.2 * Math.sin(t * 6));
    }
    /* 03 Train */
    {
      const { p, v } = vis(2);
      w.edgeMat.uniforms.uAlpha.value = v;
      if (motion) w.edgeMat.uniforms.uSeed.value = Math.floor(t * 5) % 97; // weights shuffle at 5Hz, topology never moves
      w.netMat.uniforms.uAlpha.value = v;
      w.netMat.uniforms.uSize.value = 1.0;
      w.frameMat.opacity = v * smooth((p - 0.5) / 0.2) * 0.9;
    }
    /* 04 Compete */
    {
      const { p, v } = vis(3);
      const y = STRATA_Y[3] + 0.02;
      const max = Math.min(SEATS_MAX, Math.max(1, Math.round(sig.poolMax || FACTS.poolCapacity)));
      const filled = Math.min(max, Math.max(0, Math.round(sig.poolFilled ?? 0)));
      const lit = Math.floor(filled * clamp01(p / 0.6));
      const pos = w.seats.getAttribute("position") as THREE.BufferAttribute;
      const ca = w.seats.getAttribute("aCA") as THREE.BufferAttribute;
      const sz = w.seats.getAttribute("aS") as THREE.BufferAttribute;
      const lockP = smooth((p - 0.7) / 0.2);
      for (let i = 0; i < SEATS_MAX; i++) {
        if (i >= max) {
          ca.setW(i, 0);
          continue;
        }
        const a = (i / max) * Math.PI * 2 - Math.PI / 2;
        const r = 0.3 - lockP * 0.02;
        pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
        const on = i < lit;
        const c = on ? C.green : C.dim;
        ca.setXYZW(i, c.r, c.g, c.b, on ? 1 : 0.55);
        sz.setX(i, on ? 7 : 4);
      }
      pos.needsUpdate = ca.needsUpdate = sz.needsUpdate = true;
      w.seatsMat.uniforms.uAlpha.value = v;
      refs.lock.position.set(0, y, 0);
      refs.lock.scale.setScalar(1.6 - lockP * 0.6);
      w.lockMat.opacity = v * lockP;
    }
    /* 05 Earn */
    {
      const { p, v } = vis(4);
      const y = STRATA_Y[4] + 0.02;
      w.ladderMat.opacity = v * 0.85;
      const pos = w.earn.getAttribute("position") as THREE.BufferAttribute;
      const ca = w.earn.getAttribute("aCA") as THREE.BufferAttribute;
      if (v > 0) {
        const flow = clamp01(p / 0.75);
        for (let i = 0; i < EARN_N; i++) {
          // each grain leaves the prize pool (top-right) and lands on its rung; arrival order = payout order
          const k = smooth(clamp01(flow * 1.6 - (i / EARN_N) * 0.6));
          const sx = 0.32;
          const sz = -0.3;
          const tx = w.earnTarget[i * 2];
          const tz = w.earnTarget[i * 2 + 1];
          pos.setXYZ(i, sx + (tx - sx) * k, y + Math.sin(k * Math.PI) * 0.12, sz + (tz - sz) * k);
          ca.setXYZW(i, C.gold.r, C.gold.g, C.gold.b, 0.85);
        }
        pos.needsUpdate = ca.needsUpdate = true;
      }
      w.earnMat.uniforms.uAlpha.value = v;
      w.earnMat.uniforms.uSize.value = 0.7;
    }
  });

  return (
    <group>
      <points geometry={w.slab} material={w.slabMat} frustumCulled={false} />
      <lineSegments geometry={w.rings} material={w.ringsMat} frustumCulled={false} />
      <primitive object={refs.kc} />
      <primitive object={refs.kg} />
      <primitive object={refs.tok} />
      <points geometry={w.fund} material={w.fundMat} frustumCulled={false} />
      <primitive object={refs.addr} />
      <group position={[0, STRATA_Y[2] + 0.02, 0]}>
        <lineSegments geometry={w.edges} material={w.edgeMat} />
        <points geometry={w.netNodes} material={w.netMat} frustumCulled={false} />
        <lineSegments geometry={w.frame} material={w.frameMat} />
      </group>
      <points geometry={w.seats} material={w.seatsMat} frustumCulled={false} />
      <primitive object={refs.lock} />
      <group position={[0, STRATA_Y[4] + 0.02, 0]}>
        <lineSegments geometry={w.ladder} material={w.ladderMat} />
      </group>
      <points geometry={w.earn} material={w.earnMat} frustumCulled={false} />
    </group>
  );
}
