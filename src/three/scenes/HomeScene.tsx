"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { BloomEffect, VignetteEffect } from "postprocessing";
import * as THREE from "three";
import { frameState } from "../registry";
import { useUI } from "@/store/ui";
import { KEYS, damp, getJ, sig, win } from "../home/journey";
import { Planet } from "../home/Planet";
import { Regions } from "../home/Regions";
import { Strata } from "../home/Strata";
import { Core } from "../home/Core";

const VOID = new THREE.Color("#000205");
const PAPER = new THREE.Color("#FBFDFC");

/**
 * THE DESCENT. Camera rides one CatmullRom spline sampled by j (frameState.signals.j, written by the
 * page's master ScrollTrigger). Nothing here re-renders React per frame.
 */
function CameraRig() {
  const { camera, scene, size } = useThree();
  const rig = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal", 0.5);
    const tgt = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.target)), false, "centripetal", 0.5);
    return { pos, tgt, p: new THREE.Vector3(), t: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(), js: 0, px: 0, py: 0, bg: new THREE.Color(), st: 0, init: false };
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const j = getJ();
    const motion = (sig.motion ?? 1) > 0;
    if (!rig.init || !motion) {
      rig.js = j;
      rig.init = true;
    } else rig.js = damp(rig.js, j, 5, dt);

    // j → spline parameter (keyframes are uniformly spaced along u)
    const n = KEYS.length;
    let i = 0;
    while (i < n - 2 && rig.js > KEYS[i + 1].j) i++;
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    const f = THREE.MathUtils.clamp((rig.js - k0.j) / (k1.j - k0.j), 0, 1);
    const ease = f * f * (3 - 2 * f); // power-ish in/out between stations
    const u = (i + ease) / (n - 1);
    rig.pos.getPoint(u, rig.p);
    rig.tgt.getPoint(u, rig.t);
    const shift = THREE.MathUtils.lerp(k0.shift, k1.shift, ease);

    // frame the focal object beside the text column on wide screens only
    const aspect = size.width / size.height;
    const wide = THREE.MathUtils.clamp((aspect - 0.9) / 0.7, 0, 1);
    rig.fwd.subVectors(rig.t, rig.p).normalize();
    rig.right.crossVectors(rig.fwd, rig.up).normalize();
    const s = -shift * wide;
    rig.p.addScaledVector(rig.right, s);
    rig.t.addScaledVector(rig.right, s);

    // pointer parallax (scaled to distance so close-ups stay steady)
    const dist = rig.p.distanceTo(rig.t);
    rig.px = damp(rig.px, motion ? frameState.pointer.x : 0, 2.5, dt);
    rig.py = damp(rig.py, motion ? frameState.pointer.y : 0, 2.5, dt);
    const par = dist * 0.035;
    rig.p.addScaledVector(rig.right, rig.px * par);
    rig.p.y += rig.py * par * 0.7;

    camera.position.copy(rig.p);
    camera.lookAt(rig.t);
    const pc = camera as THREE.PerspectiveCamera;
    const fov = aspect < 1 ? 58 : 40;
    if (pc.fov !== fov) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
    // lens: focus on the target; open the aperture during the dive (strata + core)
    sig.focus = dist;
    sig.aperture = 0.25 + win(j, 1.7, 2.05, 4.2, 4.8) * 1.1;

    // daylight on the human side of the glass
    const mode = useUI.getState().mode;
    rig.st = damp(rig.st, mode === "stands" ? 1 : 0, 6, dt);
    sig.stands = rig.st;
    rig.bg.copy(VOID).lerp(PAPER, rig.st);
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(rig.bg);
  });

  useEffect(
    () => () => {
      scene.background = null;
    },
    [scene],
  );
  return null;
}

function Post() {
  const bloom = useRef<BloomEffect>(null);
  const vig = useRef<VignetteEffect>(null);
  const [tier, setTier] = useState(frameState.tier);
  useFrame(() => {
    if (frameState.tier !== tier) setTier(frameState.tier);
    const st = sig.stands ?? 0;
    if (bloom.current) bloom.current.intensity = 0.95 * (1 - st);
    if (vig.current) vig.current.darkness = 0.62 * (1 - st);
  });
  if (tier === 0 || sig.mobile) return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.42} luminanceSmoothing={0.2} intensity={0.95} radius={0.72} />
      <Vignette ref={vig} offset={0.28} darkness={0.62} />
    </EffectComposer>
  );
}

export default function HomeScene() {
  return (
    <>
      <CameraRig />
      <Planet />
      <Regions />
      <Strata />
      <Core />
      <Post />
    </>
  );
}
