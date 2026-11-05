"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { routeMode, useUI } from "@/store/ui";
import { useArenaFeed } from "@/lib/arena/client";

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis | null = null;

export default function Providers({ children }: { children: ReactNode }) {
  const path = usePathname();
  const motion = useUI((s) => s.motion);
  useArenaFeed();

  // OS reduced motion + persisted prefs
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ui = useUI.getState();
    let pref: "auto" | "on" | "off" = "auto";
    try {
      pref = (localStorage.getItem("me-motion") as typeof pref) || "auto";
      if (localStorage.getItem("me-sound") === "1") ui.setSound(true);
    } catch {}
    ui.setSystemReduced(mq.matches);
    ui.setMotionPref(pref);
    const on = () => useUI.getState().setSystemReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Route default mode (Field / Stands) — glass transition between them
  useEffect(() => {
    const def = routeMode(path);
    if (def) useUI.getState().setMode(def, { animate: useUI.getState().introDone });
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [path]);

  // Lenis smooth scroll synced to GSAP ticker (off under reduced motion)
  useEffect(() => {
    if (!motion) return;
    const l = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis = l;
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      lenis = null;
    };
  }, [motion]);

  return <>{children}</>;
}
