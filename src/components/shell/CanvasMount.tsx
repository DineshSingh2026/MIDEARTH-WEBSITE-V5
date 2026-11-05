"use client";
import dynamic from "next/dynamic";

/** Lazy-loads three.js + the persistent canvas after first paint (text-first LCP). */
const CanvasHost = dynamic(() => import("@/three/CanvasHost"), { ssr: false });

export default function CanvasMount() {
  return <CanvasHost />;
}
