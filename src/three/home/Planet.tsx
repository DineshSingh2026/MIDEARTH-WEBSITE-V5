"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frameState } from "../registry";
import { NOISE, POINT_DOF_VERT, POINT_FRAG_SHAPE } from "./glsl";
import { R, getJ, win, sig } from "./journey";

const MAX = 60000;
const CAP = 0.62; // crack cap half-width (normalised to R)
const CELL = (CAP * 2) / 40; // 40×40 grid lines across the polar cap

/**
 * The particle planet: tangent-flow (noise-advected) crust, latitude contours, fresnel rim,
 * 40×40 grid cracks on the polar cap that open into the descent shaft. Plus atmospheric scattering shell.
 */
export function Planet() {
  const pts = useRef<THREE.Points>(null);
  const { gl } = useThree();

  const geo = useMemo(() => {
    const pos = new Float32Array(MAX * 3);
    const rnd = new Float32Array(MAX * 4);
    const grid = new Float32Array(MAX * 2); // x: distance to crack line (cells), y: kind (1 = crack seam point)
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < MAX; i++) {
      let x: number, y: number, z: number;
      const seam = rand() < 0.08;
      if (seam) {
        // seam points lie exactly on the 40×40 grid lines of the north cap
        const k = Math.round((rand() * 2 - 1) * 20) * CELL;
        const t = (rand() * 2 - 1) * CAP;
        const alongU = rand() < 0.5;
        const u = alongU ? k : t;
        const v = alongU ? t : k;
        const yy = Math.sqrt(Math.max(0.0001, 1 - u * u - v * v));
        x = u;
        z = v;
        y = yy;
      } else {
        const zz = rand() * 2 - 1;
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(1 - zz * zz);
        x = rr * Math.cos(a);
        y = zz;
        z = rr * Math.sin(a);
      }
      pos[i * 3] = x * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = z * R;
      rnd[i * 4] = rand();
      rnd[i * 4 + 1] = rand();
      rnd[i * 4 + 2] = rand();
      rnd[i * 4 + 3] = rand();
      let d = 1;
      if (y > 0 && Math.abs(x) < CAP && Math.abs(z) < CAP) {
        const du = Math.abs(x / CELL - Math.round(x / CELL));
        const dv = Math.abs(z / CELL - Math.round(z / CELL));
        d = Math.min(du, dv);
      }
      grid[i * 2] = seam ? 0 : d;
      grid[i * 2 + 1] = seam ? 1 : 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    g.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.3);
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uCrack: { value: 0 },
          uOpen: { value: 0 },
          uFocus: { value: 17 },
          uAperture: { value: 0.6 },
          uPixel: { value: 1 },
          uInside: { value: 0 },
          uStands: { value: 0 },
          uAlpha: { value: 1 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime, uCrack, uOpen, uFocus, uAperture, uPixel, uInside, uStands, uAlpha;
          attribute vec4 aRand;
          attribute vec2 aGrid;
          varying float vAlpha, vBlur;
          varying vec3 vCol;
          ${NOISE}
          void main(){
            vec3 n = normalize(position);
            // tangent flow field: particles stream across the crust like weather, looping with a fade
            vec3 q = n * 1.7 + vec3(0.0, uTime * 0.035, uTime * 0.02);
            vec3 f = vec3(snoise(q), snoise(q + 17.1), snoise(q + 31.7));
            f -= n * dot(f, n);
            float ph = fract(uTime * 0.07 * (0.5 + aRand.x) + aRand.y);
            float seam = aGrid.y;
            vec3 p = position + (1.0 - seam) * (f * (ph - 0.5) * 0.9 * aRand.z + n * (aRand.w - 0.5) * 0.16);
            float flowA = mix(sin(ph * 3.14159), 1.0, seam);

            // 40×40 grid cracks on the polar cap
            float cap = smoothstep(0.5, 0.62, n.y);
            float onLine = 1.0 - smoothstep(0.0, 0.07, aGrid.x);
            float crack = cap * onLine * uCrack;
            p += n * crack * 0.05;
            // open the shaft: cap points slide outward along the grid, dropping into the mantle
            float rxz = length(p.xz);
            float hole = 1.75;
            float inHole = cap * (1.0 - smoothstep(hole, hole + 0.6, rxz));
            p.xz *= 1.0 + uOpen * inHole * (hole + 0.35 - rxz) / max(rxz, 0.15);
            p.y -= uOpen * inHole * 0.25;

            vec4 wp = modelMatrix * vec4(p, 1.0);
            vec4 mv = viewMatrix * wp;
            ${POINT_DOF_VERT}
            vec3 nW = normalize(mat3(modelMatrix) * n);
            vec3 V = normalize(cameraPosition - wp.xyz);
            float facing = dot(nW, V);
            float rim = pow(1.0 - abs(facing), 2.4);
            float lat = asin(clamp(n.y, -1.0, 1.0));
            float band = pow(abs(sin(lat * 14.0)), 60.0);

            vec3 base = mix(vec3(0.10, 0.20, 0.26), vec3(0.33, 0.43, 0.48), aRand.z);
            vec3 col = base + vec3(0.05, 0.55, 0.62) * rim * 1.4 + vec3(0.0, 0.5, 0.32) * band * 0.9;
            col = mix(col, vec3(0.0, 1.0, 0.64) * 2.2, crack);
            // ink on daylight
            col = mix(col, vec3(0.18, 0.26, 0.29), uStands);

            float back = mix(smoothstep(-0.35, 0.25, facing) * 0.85 + 0.15, 1.0, uInside);
            float a = (0.32 + rim * 0.9 + band * 0.6) * back * flowA;
            a = mix(a, a * (1.0 - seam), 1.0) + crack * 1.2;
            a *= 1.0 - uOpen * inHole * 0.7;
            vAlpha = a * uAlpha;
            vCol = col;
            gl_Position = projectionMatrix * mv;
            float size = (seam > 0.5 ? 2.2 : 1.4 + aRand.w * 1.6) * (1.0 + vBlur * 3.0);
            gl_PointSize = min(size * uPixel * 6.0 / -mv.z, 42.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vAlpha, vBlur;
          varying vec3 vCol;
          void main(){
            ${POINT_FRAG_SHAPE}
            float a = shape * vAlpha / (1.0 + vBlur * 5.0);
            if (a < 0.004) discard;
            gl_FragColor = vec4(vCol * a, a);
          }
        `,
      }),
    [],
  );

  const atmo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uAlpha: { value: 1 }, uLight: { value: new THREE.Vector3(-0.6, 0.55, 0.6).normalize() } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main(){
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vV = normalize(cameraPosition - wp.xyz);
            vW = normalize(position);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uAlpha; uniform vec3 uLight;
          varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main(){
            float i = pow(clamp(0.72 + dot(vN, vV), 0.0, 1.0), 4.0);
            // single-scattering tint: rayleigh-ish blue rim, green forward lobe on the lit limb
            float lit = clamp(dot(vW, uLight) * 0.5 + 0.5, 0.0, 1.0);
            vec3 col = mix(vec3(0.05, 0.34, 0.62), vec3(0.0, 0.95, 0.62), pow(lit, 3.0)) * (0.35 + lit);
            gl_FragColor = vec4(col * i * uAlpha, 1.0);
          }
        `,
      }),
    [],
  );
  const atmoGeo = useMemo(() => new THREE.SphereGeometry(R * 1.14, 64, 48), []);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      atmo.dispose();
      atmoGeo.dispose();
    },
    [geo, mat, atmo, atmoGeo],
  );

  const blendIsNormal = useRef(false);
  useFrame((state, dt) => {
    const j = getJ();
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixel.value = gl.getPixelRatio() * (state.size.height / 900) * 1.6;
    u.uCrack.value = win(j, 1.25, 1.7, 7.0, 7.6);
    u.uOpen.value = win(j, 1.7, 2.05, 6.9, 7.4);
    const camD = state.camera.position.length();
    u.uInside.value = THREE.MathUtils.clamp((R * 1.25 - camD) / (R * 0.4), 0, 1);
    u.uFocus.value = sig.focus ?? 17;
    u.uAperture.value = sig.aperture ?? 0.6;
    const st = sig.stands ?? 0;
    u.uStands.value = st;
    // inside the cavity the crust is far away and behind the molten wall; keep it faint
    u.uAlpha.value = 1 - win(j, 3.0, 3.3, 6.9, 7.2) * 0.85;
    const wantNormal = st > 0.5;
    if (wantNormal !== blendIsNormal.current) {
      blendIsNormal.current = wantNormal;
      mat.blending = wantNormal ? THREE.NormalBlending : THREE.AdditiveBlending;
      atmo.visible = !wantNormal;
    }
    atmo.uniforms.uAlpha.value = (1 - u.uInside.value) * (1 - st);
    // perf tier → particle budget
    const budget = frameState.tier === 0 ? 15000 : frameState.tier === 1 ? 32000 : MAX;
    geo.setDrawRange(0, sig.mobile ? Math.min(budget, 15000) : budget);
    // slow axial spin only while in orbit (descent point is the pole, so spin never moves it)
    if (pts.current) pts.current.rotation.y += dt * 0.025 * (1 - win(j, 1.0, 1.6, 7.0, 7.8));
  });

  return (
    <group>
      <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />
      <mesh geometry={atmoGeo} material={atmo} renderOrder={-1} />
    </group>
  );
}
