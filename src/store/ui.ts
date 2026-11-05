"use client";
import { create } from "zustand";

export type Mode = "field" | "stands";

type UIState = {
  mode: Mode;
  /** true once user explicitly chose a mode (overrides route defaults until next route default) */
  modeLocked: boolean;
  /** glass transition in flight: target mode */
  glassTarget: Mode | null;
  motion: boolean; // false = reduced motion (OS or toggle)
  motionPref: "auto" | "on" | "off";
  sound: boolean;
  introDone: boolean;
  introReplay: number;
  menuOpen: boolean;
  setMode: (m: Mode, opts?: { animate?: boolean; lock?: boolean }) => void;
  commitMode: (m: Mode) => void;
  setMotionPref: (p: "auto" | "on" | "off") => void;
  setSystemReduced: (r: boolean) => void;
  setSound: (s: boolean) => void;
  setIntroDone: (d: boolean) => void;
  replayIntro: () => void;
  setMenuOpen: (o: boolean) => void;
};

let systemReduced = false;
const resolveMotion = (p: "auto" | "on" | "off") => (p === "auto" ? !systemReduced : p === "on");

const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export const useUI = create<UIState>((set, get) => ({
  mode: "field",
  modeLocked: false,
  glassTarget: null,
  motion: true,
  motionPref: "auto",
  sound: false,
  introDone: true,
  introReplay: 0,
  menuOpen: false,
  setMode: (m, opts) => {
    const { mode, motion, glassTarget } = get();
    if (opts?.lock) safeSet("me-mode", m);
    if (m === mode && !glassTarget) {
      if (opts?.lock) set({ modeLocked: true });
      return;
    }
    if (opts?.animate !== false && motion) {
      set({ glassTarget: m, modeLocked: opts?.lock ? true : get().modeLocked });
    } else {
      get().commitMode(m);
      if (opts?.lock) set({ modeLocked: true });
    }
  },
  commitMode: (m) => {
    document.documentElement.dataset.mode = m;
    set({ mode: m, glassTarget: null });
  },
  setMotionPref: (p) => {
    safeSet("me-motion", p);
    const motion = resolveMotion(p);
    document.documentElement.dataset.motion = motion ? "on" : "off";
    set({ motionPref: p, motion });
  },
  setSystemReduced: (r) => {
    systemReduced = r;
    const motion = resolveMotion(get().motionPref);
    document.documentElement.dataset.motion = motion ? "on" : "off";
    set({ motion });
  },
  setSound: (s) => {
    safeSet("me-sound", s ? "1" : "0");
    set({ sound: s });
  },
  setIntroDone: (d) => set({ introDone: d }),
  replayIntro: () => {
    try {
      sessionStorage.removeItem("me-intro");
    } catch {}
    set((s) => ({ introDone: false, introReplay: s.introReplay + 1 }));
    window.scrollTo(0, 0);
  },
  setMenuOpen: (o) => set({ menuOpen: o }),
}));

/** Route → default mode. */
export const routeMode = (_path: string): Mode | null => "field";
export const routeModeLegacy = (path: string): Mode | null => {
  if (path.startsWith("/humans") || path.startsWith("/live") || path.startsWith("/vision") || path.startsWith("/partners")) return "stands";
  if (path.startsWith("/agents") || path.startsWith("/idle-for-agents") || path.startsWith("/games") || path.startsWith("/labs")) return "field";
  if (path === "/") return "field";
  return null;
};
