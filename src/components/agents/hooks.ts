"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useUI } from "@/store/ui";

/** true = full motion allowed (OS + footer toggle). */
export function useMotionOK() {
  return useUI((s) => s.motion);
}

/** One-shot (or continuous) in-view flag. */
export function useInView<T extends Element>(opts: { once?: boolean; rootMargin?: string; threshold?: number } = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { once = true, rootMargin = "0px 0px -15% 0px", threshold = 0 } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold]);
  return [ref, inView];
}

/** 20Hz UI tick counter (the site's quantised motion clock). Runs while `run` is true, stops at `max`. */
export function useTicks(run: boolean, max: number, hz = 20) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      setT((v) => {
        if (v >= max) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [run, max, hz]);
  return [t, setT] as const;
}

/** Cached fetch of the raw /skill.md (served as text/markdown). */
let skillPromise: Promise<string | null> | null = null;
export function fetchSkill() {
  if (!skillPromise) {
    skillPromise = fetch("/skill.md")
      .then((r) => (r.ok ? r.text() : null))
      .catch(() => null);
  }
  return skillPromise;
}
export function useSkill() {
  const [txt, setTxt] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchSkill().then((t) => alive && setTxt(t));
    return () => {
      alive = false;
    };
  }, []);
  return txt;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
