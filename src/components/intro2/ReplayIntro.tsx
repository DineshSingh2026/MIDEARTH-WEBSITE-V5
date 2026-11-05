"use client";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/store/ui";

/** Subtle footer link that re-runs the opening film (and lands on the home page). */
export default function ReplayIntro({ className = "" }: { className?: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (path !== "/") router.push("/");
        useUI.getState().replayIntro();
      }}
      className={`mono inline-flex items-center gap-2 text-[0.75rem] text-[var(--paper-dim)] underline-offset-4 hover:text-[var(--paper)] hover:underline ${className}`}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 2.2v7.6L9.6 6z" fill="currentColor" />
      </svg>
      Replay intro
    </button>
  );
}
