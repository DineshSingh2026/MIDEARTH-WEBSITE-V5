"use client";
/**
 * A curved holo screen above the far tiers. Minimal mono text from the LIVE feed (next lock + seats of the
 * featured open pool) plus the sim's match clock and top three. Redrawn at most twice a second, only on change.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { roundRect } from "../geom";
import type { Director } from "../director";
import type { WatchPalette } from "../palette";

const W = 1024;
const H = 400;
const R = 12.4;
const LEN = 0.36;
const CENTER = Math.PI - 0.3;
const HEIGHT = R * LEN * (H / W);

function fontFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim();
  return v ? `${v}, ui-monospace, monospace` : "ui-monospace, SFMono-Regular, Menlo, monospace";
}
const clock = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export default function Jumbotron({ director, palette, y = 4.75 }: { director: Director; palette: WatchPalette; y?: number }) {
  const res = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
    const geo = new THREE.CylinderGeometry(R, R, HEIGHT, 48, 1, true, CENTER - LEN / 2, LEN);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) });
    return { cv, tex, geo, mat, font: fontFamily() };
  }, []);
  useEffect(
    () => () => {
      res.tex.dispose();
      res.geo.dispose();
      res.mat.dispose();
    },
    [res],
  );

  const last = useRef({ key: "", t: -1 });
  const top = useMemo(() => new Int16Array(3), []);

  useFrame(() => {
    const d = director;
    const now = performance.now();
    if (now - last.current.t < 500) return;
    last.current.t = now;
    const sim = d.sim;
    const f = d.feed;
    // top three without allocating
    top[0] = top[1] = top[2] = -1;
    for (const a of sim.agents) {
      for (let k = 0; k < 3; k++) {
        const cur = top[k];
        if (cur < 0 || a.tiles > sim.agents[cur].tiles) {
          for (let j = 2; j > k; j--) top[j] = top[j - 1];
          top[k] = a.id;
          break;
        }
      }
    }
    const settled = sim.ended;
    const key = `${f.version}|${Math.floor(sim.timeSec)}|${settled ? 1 : 0}|${top[0]}${top[1]}${top[2]}|${palette.key}`;
    if (key === last.current.key) return;
    last.current.key = key;
    draw(res.cv.getContext("2d")!, d, palette, res.font, top, settled);
    res.tex.needsUpdate = true;
  });

  return <mesh geometry={res.geo} material={res.mat} position={[0, y, 0]} renderOrder={11} />;
}

function draw(g: CanvasRenderingContext2D, d: Director, p: WatchPalette, font: string, top: Int16Array, settled: boolean) {
  const f = d.feed;
  const sim = d.sim;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  // frame
  g.strokeStyle = p.agent;
  g.globalAlpha = 0.55;
  g.lineWidth = 3;
  roundRect(g, 6, 6, W - 12, H - 12, 26);
  g.stroke();
  g.globalAlpha = 0.08;
  g.fillStyle = p.agent;
  g.fill();
  g.globalAlpha = 1;
  g.textBaseline = "alphabetic";

  // header row
  const tone = f.status === "live" ? p.signal : f.status === "snapshot" ? p.value : p.dim;
  g.fillStyle = tone;
  g.beginPath();
  g.arc(44, 54, 7, 0, Math.PI * 2);
  g.fill();
  g.font = `500 22px ${font}`;
  g.fillStyle = p.paper;
  g.globalAlpha = 0.8;
  g.fillText(f.status === "live" ? "ARENA LIVE" : f.status === "snapshot" ? "ARENA SNAPSHOT" : "CONNECTING", 62, 62);
  g.textAlign = "right";
  g.fillText("TERRITORY CONTROL", W - 40, 62);
  g.textAlign = "left";
  g.globalAlpha = 1;

  // the live line: NEXT LOCK 04:12 · 37/100
  g.font = `500 64px ${font}`;
  g.fillStyle = p.paper;
  const big = f.seatText ? `${f.lockText} · ${f.seatText}` : f.lockText;
  g.fillText(big, 40, 150, W - 80);
  // seat bar
  g.fillStyle = p.dim;
  g.globalAlpha = 0.25;
  g.fillRect(40, 176, W - 80, 6);
  g.globalAlpha = 1;
  g.fillStyle = p.signal;
  g.fillRect(40, 176, (W - 80) * Math.max(0, Math.min(1, f.seatFill)), 6);

  // match clock + top three (sim)
  g.font = `500 22px ${font}`;
  g.fillStyle = p.dim;
  g.fillText(settled ? "MATCH SETTLED" : `MATCH ${clock(sim.timeSec)} / ${clock(sim.matchSec)}`, 40, 232);
  g.textAlign = "right";
  g.fillText(`TILES ${sim.claimed}/${sim.w * sim.h}`, W - 40, 232);
  g.textAlign = "left";
  const N = sim.w * sim.h;
  for (let k = 0; k < 3; k++) {
    const id = top[k];
    if (id < 0) continue;
    const a = sim.agents[id];
    const y = 282 + k * 38;
    g.fillStyle = a.color;
    g.fillRect(40, y - 18, 14, 14);
    g.fillStyle = k === 0 ? p.paper : p.dim;
    g.font = `${k === 0 ? 600 : 500} 24px ${font}`;
    const name = (f.names[id] || `AGENT ${String(id + 1).padStart(2, "0")}`).toUpperCase();
    g.fillText(`${k + 1}  ${name}`, 70, y - 3, 520);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(620, y - 14, 300, 6);
    g.fillStyle = a.color;
    g.fillRect(620, y - 14, 300 * Math.min(1, (a.tiles / N) * 3), 6);
    g.fillStyle = p.dim;
    g.textAlign = "right";
    g.fillText(String(a.tiles), W - 40, y - 3);
    g.textAlign = "left";
  }
}
