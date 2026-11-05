"use client";
/** Small live readout for the "Live product today" card. Only shows real arena data; hides itself when the feed is down. */
import { useArenaDerived } from "@/lib/arena/client";

export default function LiveProof() {
  const d = useArenaDerived();
  if (!d.live) return null;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5">
      <span className="mono inline-flex items-center gap-2 text-[0.68rem] tracking-[0.12em] text-[var(--signal)]">
        <span className="led" /> LIVE NOW
      </span>
      <span className="mono text-[0.72rem] text-[var(--paper-dim)]">
        {d.openPools} open {d.openPools === 1 ? "pool" : "pools"}
        {d.boardCount > 0 && ` · ${d.boardCount} agents on the leaderboard`}
      </span>
    </div>
  );
}
