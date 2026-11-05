"use client";
/**
 * VisionScene — 1,600 points (= the 40×40 arena grid) that re-form for each /vision chapter.
 * frameState.signals.visionChapter (set by an IntersectionObserver on the page):
 *  0 hero / 1 arena / 11 closing: planet shell · 2 context: pool rings · 3 predictions: three lanes
 *  4 a2a: the 40×40 grid · 5 debates: two facing trees · 6 social: clusters · 7 rankings: columns
 *  8 rent: shelves · 9 platform: core + six orbits · 10 economic: four strata.
 * Ink on paper in Stands mode, additive light in Field mode. Reduced motion: snaps, no drift.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUI } from "@/store/ui";
import { frameState } from "../registry";

const N = 1600;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formations(): Float32Array[] {
  const r = rng(5);
  const make = (f: (i: number, out: number[]) => void) => {
    const a = new Float32Array(N * 3);
    const o = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      f(i, o);
      a[i * 3] = o[0];
      a[i * 3 + 1] = o[1];
      a[i * 3 + 2] = o[2];
    }
    return a;
  };
  const sphere = make((i, o) => {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    o[0] = Math.cos(th) * rad * 3.2;
    o[1] = y * 3.2;
    o[2] = Math.sin(th) * rad * 3.2;
  });
  const pool = make((i, o) => {
    const ring = i % 8;
    const rr = 0.5 + ring * 0.42;
    const th = (i / N) * Math.PI * 2 * 8 + ring;
    o[0] = Math.cos(th) * rr;
    o[1] = (r() - 0.5) * 0.08 + Math.sin(th * 3) * 0.05;
    o[2] = Math.sin(th) * rr;
  });
  const lanes = make((i, o) => {
    const lane = i % 3;
    const x = ((Math.floor(i / 3) / (N / 3)) - 0.5) * 9;
    o[0] = x;
    o[1] = (lane - 1) * 1.5 + Math.sin(x * 1.3 + lane * 2) * 0.25 + Math.sin(x * 3.1 + lane) * 0.08;
    o[2] = 0;
  });
  const grid = make((i, o) => {
    const gx = i % 40;
    const gy = Math.floor(i / 40);
    o[0] = (gx - 19.5) * 0.15;
    o[1] = 0;
    o[2] = (gy - 19.5) * 0.15;
  });
  const trees = make((i, o) => {
    const side = i % 2 ? 1 : -1;
    const d = r();
    const spread = d * 2.4;
    o[0] = side * (3.8 - d * 3.4);
    o[1] = (r() - 0.5) * spread;
    o[2] = (r() - 0.5) * spread * 0.5;
  });
  const centres = Array.from({ length: 9 }, () => [(r() - 0.5) * 7, (r() - 0.5) * 3.6, (r() - 0.5) * 2]);
  const social = make((i, o) => {
    const c = centres[i % centres.length];
    const rr = Math.pow(r(), 1.6) * 0.75;
    const th = r() * Math.PI * 2;
    const ph = Math.acos(2 * r() - 1);
    o[0] = c[0] + rr * Math.sin(ph) * Math.cos(th);
    o[1] = c[1] + rr * Math.cos(ph);
    o[2] = c[2] + rr * Math.sin(ph) * Math.sin(th);
  });
  const columns = make((i, o) => {
    const col = i % 12;
    const hgt = 3.4 * Math.pow(0.84, col);
    o[0] = (col - 5.5) * 0.6;
    o[1] = -1.8 + r() * hgt;
    o[2] = (r() - 0.5) * 0.3;
  });
  const shelves = make((i, o) => {
    const row = i % 4;
    o[0] = (r() - 0.5) * 8;
    o[1] = (row - 1.5) * 1.1 + (r() - 0.5) * 0.04;
    o[2] = (r() - 0.5) * 0.8;
  });
  const orbit = make((i, o) => {
    if (i < 400) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      const rr = 0.7 * Math.cbrt(r());
      o[0] = rr * Math.sin(ph) * Math.cos(th);
      o[1] = rr * Math.cos(ph);
      o[2] = rr * Math.sin(ph) * Math.sin(th);
    } else {
      const k = i % 6;
      const th = (i / N) * Math.PI * 2 * 6;
      const rr = 2.2 + k * 0.03;
      const tilt = (k / 6) * Math.PI;
      const x = Math.cos(th) * rr;
      const z = Math.sin(th) * rr;
      o[0] = x;
      o[1] = z * Math.sin(tilt) * 0.5;
      o[2] = z * Math.cos(tilt);
    }
  });
  const strata = make((i, o) => {
    const s = i % 4;
    o[0] = (r() - 0.5) * 8;
    o[1] = 1.5 - s * 1;
    o[2] = (r() - 0.5) * 3;
  });
  // 0..11
  return [sphere, sphere, pool, lanes, grid, trees, social, columns, shelves, orbit, strata, sphere];
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.9)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const TINT_FIELD = ["#8DA0A9", "#8DA0A9", "#00FFA3", "#E3B341", "#00FFA3", "#22C8E8", "#22C8E8", "#E3B341", "#22C8E8", "#00FFA3", "#E3B341", "#8DA0A9"];
const TINT_STANDS = ["#4E5A5E", "#4E5A5E", "#067A4B", "#8A6613", "#067A4B", "#0B6E85", "#0B6E85", "#8A6613", "#0B6E85", "#067A4B", "#8A6613", "#4E5A5E"];

export default function VisionScene() {
  const motion = useUI((s) => s.motion);
  const ink = useUI((s) => s.mode) === "stands";
  const forms = useMemo(formations, []);
  const tex = useMemo(dotTexture, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(forms[0]), 3));
    return g;
  }, [forms]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const tint = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const ch = Math.max(0, Math.min(11, Math.round(frameState.signals.visionChapter ?? 0)));
    const target = forms[ch];
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const k = motion ? 1 - Math.pow(0.04, Math.min(dt, 0.05)) : 1;
    for (let i = 0; i < arr.length; i++) {
      // staggered arrival: each point eases at its own rate so formations "pour" into place
      const kk = motion ? k * (0.55 + ((i * 2654435761) % 997) / 997 * 0.9) : 1;
      arr[i] += (target[i] - arr[i]) * Math.min(1, kk);
    }
    pos.needsUpdate = true;
    if (mat.current) {
      tint.set((ink ? TINT_STANDS : TINT_FIELD)[ch]);
      mat.current.color.lerp(tint, motion ? 0.04 : 1);
    }
    const g = group.current;
    if (g) {
      const t = state.clock.elapsedTime;
      if (motion) {
        g.rotation.y += dt * 0.04;
        g.rotation.x += ((ch === 4 ? 0.55 : 0.12) + frameState.pointer.y * 0.05 - g.rotation.x) * 0.03;
        g.position.x += (frameState.pointer.x * 0.15 - g.position.x) * 0.03;
        g.position.y = Math.sin(t * 0.2) * 0.05;
      } else {
        g.rotation.set(ch === 4 ? 0.55 : 0.12, 0.4, 0);
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, -3]}>
      <points geometry={geo}>
        <pointsMaterial
          ref={mat}
          map={tex}
          size={ink ? 0.05 : 0.055}
          sizeAttenuation
          transparent
          depthWrite={false}
          opacity={ink ? 0.32 : 0.55}
          blending={ink ? THREE.NormalBlending : THREE.AdditiveBlending}
          color={ink ? "#4E5A5E" : "#8DA0A9"}
        />
      </points>
    </group>
  );
}
