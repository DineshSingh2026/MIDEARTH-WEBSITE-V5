"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScene, frameState } from "@/three/registry";
import { useUI } from "@/store/ui";
import Hero from "./Hero";
import Manifesto from "./Manifesto";
import StrataSection from "./StrataSection";
import CoreSection from "./CoreSection";
import HomeLater from "@/components/home/later";

gsap.registerPlugin(ScrollTrigger);

/** Representative composed frame per section for reduced motion (no camera flight, jump cuts only). */
const STILLS = [0.0, 1.85, 2.5, 3.5, 4.5, 5.5, 6.5, 7.95, 8.5];

/**
 * Master ScrollTrigger for the whole page. Every `[data-home-section=N]` (1..9, including the
 * sections rendered by <HomeLater/>) is an anchor: when its top reaches the viewport top, j = N-1.
 * j is piecewise-linear in scroll between anchors and written to frameState.signals.j each update;
 * the 3D scene and the DOM sections read it on the ticker. S9 flips the glass to "stands".
 */
export default function HomeExperience() {
  useScene("home");
  const root = useRef<HTMLDivElement>(null);
  const motion = useUI((s) => s.motion);

  useEffect(() => {
    const sig = frameState.signals;
    sig.motion = motion ? 1 : 0;
    const anchors: { y: number; n: number }[] = [];
    let maxScroll = 1;
    const measure = () => {
      anchors.length = 0;
      document.querySelectorAll<HTMLElement>("[data-home-section]").forEach((el) => {
        const n = Number(el.dataset.homeSection);
        if (n >= 1 && n <= 9) anchors.push({ y: el.getBoundingClientRect().top + window.scrollY, n });
      });
      anchors.sort((a, b) => a.n - b.n);
      maxScroll = Math.max(1, ScrollTrigger.maxScroll(window));
      sig.mobile = window.innerWidth < 768 ? 1 : 0;
    };
    const compute = (y: number) => {
      if (!anchors.length) return 0;
      let i = 0;
      while (i < anchors.length - 1 && y >= anchors[i + 1].y) i++;
      const a = anchors[i];
      const nextY = i < anchors.length - 1 ? anchors[i + 1].y : maxScroll;
      const nextJ = i < anchors.length - 1 ? anchors[i + 1].n - 1 : a.n;
      const f = Math.min(1, Math.max(0, (y - a.y) / Math.max(1, nextY - a.y)));
      return a.n - 1 + f * (nextJ - (a.n - 1));
    };
    let standsOn = false;
    const apply = (y: number) => {
      const raw = compute(y);
      const j = useUI.getState().motion ? raw : STILLS[Math.min(8, Math.floor(raw))];
      sig.j = j;
      frameState.scroll = y / maxScroll;
      // the glass: S9 is the human side
      const ui = useUI.getState();
      if (!standsOn && raw >= 7.85) {
        standsOn = true;
        ui.setMode("stands", { animate: true });
      } else if (standsOn && raw < 7.7) {
        standsOn = false;
        ui.setMode("field", { animate: true });
      }
    };
    measure();
    const st = ScrollTrigger.create({
      trigger: root.current!,
      start: 0,
      end: "max",
      onRefresh: () => {
        measure();
        apply(window.scrollY);
      },
      onUpdate: (self) => apply(self.scroll()),
    });
    apply(window.scrollY);
    // later sections may mount after us
    let to: ReturnType<typeof setTimeout> | undefined;
    let lastH = document.body.scrollHeight;
    const mo = new ResizeObserver(() => {
      if (document.body.scrollHeight === lastH) return;
      lastH = document.body.scrollHeight;
      clearTimeout(to);
      to = setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    mo.observe(document.body);
    return () => {
      clearTimeout(to);
      st.kill();
      mo.disconnect();
      sig.j = 0;
      if (standsOn) useUI.getState().setMode("field", { animate: false });
    };
  }, [motion]);

  return (
    <div ref={root} className="relative">
      <Hero />
      <Manifesto />
      <StrataSection />
      <CoreSection />
      <HomeLater />
    </div>
  );
}
