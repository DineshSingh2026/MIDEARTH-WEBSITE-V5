"use client";
import type { ReactNode } from "react";
import { Mascot } from "@/components/brand/Mascot";
import { useUI } from "@/store/ui";

/**
 * Bespoke per-step micro-illustrations. Pure SVG + SMIL; animations are only mounted when motion is on,
 * so reduced motion gets the composed static frame. Colours are tokens, so each side reads in its own palette.
 */

const W = 280;
const H = 132;

function Frame({ caption, children }: { caption: string; children: (m: boolean) => ReactNode }) {
  const m = useUI((s) => s.motion);
  return (
    <figure className="mt-8">
      <div className="border border-[var(--rule)] bg-[color-mix(in_oklab,var(--deck)_70%,transparent)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={caption}>
          {children(m)}
        </svg>
      </div>
      <figcaption className="mono mt-2 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--paper-dim)]">{caption}</figcaption>
    </figure>
  );
}

const A = (p: { attr: string; values: string; dur: string; begin?: string; m: boolean }) =>
  p.m ? <animate attributeName={p.attr} values={p.values} dur={p.dur} begin={p.begin ?? "0s"} repeatCount="indefinite" /> : null;

const Mover = ({ path, dur, begin = "0s", m }: { path: string; dur: string; begin?: string; m: boolean }) =>
  m ? <animateMotion path={path} dur={dur} begin={begin} repeatCount="indefinite" rotate="0" /> : null;

const Bot = ({ kind, x, y, size, m }: { kind: "exec" | "play" | "track" | "funds"; x: number; y: number; size: number; m: boolean }) => (
  <g transform={`translate(${x} ${y})`}>
    <g>
      {m && <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.6s" repeatCount="indefinite" />}
      <Mascot kind={kind} size={size} />
    </g>
  </g>
);

const Key = ({ color }: { color: string }) => (
  <g stroke={color} strokeWidth="1.6" fill="none">
    <circle cx="0" cy="0" r="5" />
    <path d="M5 0h13M14 0v4M17 0v3" />
  </g>
);

const mono = { fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.12em" } as const;

/* ───────────────────────────── FIELD ───────────────────────────── */

export function AgentIllo({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <Frame caption="One call in · three credentials out">
          {(m) => (
            <>
              <Bot kind="exec" x={16} y={36} size={52} m={m} />
              <path d="M84 66 H150" stroke="var(--paper-dim)" strokeDasharray="3 4" />
              <rect x="150" y="40" width="34" height="52" fill="none" stroke="var(--signal)" />
              <text x="167" y="104" textAnchor="middle" fill="var(--paper-dim)" style={mono}>REGISTER</text>
              {[
                ["var(--agent)", 30, "0s"],
                ["var(--value)", 66, "0.5s"],
                ["var(--signal)", 102, "1s"],
              ].map(([c, ty, b]) => (
                <g key={String(ty)}>
                  <g transform={`translate(232 ${Number(ty) - 4})`}>
                    {m && <animateTransform attributeName="transform" type="translate" values={`184 66;232 ${Number(ty) - 4};232 ${Number(ty) - 4}`} keyTimes="0;0.4;1" dur="3s" begin={String(b)} repeatCount="indefinite" />}
                    <Key color={String(c)} />
                  </g>
                </g>
              ))}
              <circle r="2.5" fill="var(--signal)">
                <Mover path="M84 66 H150" dur="1.5s" m={m} />
              </circle>
            </>
          )}
        </Frame>
      );
    case 1:
      return (
        <Frame caption="Own wallet → one-time address → IDLE credit">
          {(m) => (
            <>
              <rect x="18" y="44" width="56" height="40" rx="3" fill="none" stroke="var(--paper-dim)" />
              <text x="46" y="100" textAnchor="middle" fill="var(--paper-dim)" style={mono}>WALLET</text>
              <line x1="140" y1="18" x2="140" y2="114" stroke="var(--agent)" strokeDasharray="2 3" />
              <text x="140" y="12" textAnchor="middle" fill="var(--agent)" style={mono}>SOLANA</text>
              <rect x="200" y="40" width="58" height="48" fill="none" stroke="var(--value)" />
              <text x="229" y="68" textAnchor="middle" fill="var(--value)" style={{ ...mono, fontSize: 10 }}>IDLE</text>
              {["0s", "0.7s", "1.4s"].map((b) => (
                <circle key={b} r="4" fill="var(--value)" cx={m ? 0 : 110} cy={m ? 0 : 64}>
                  <Mover path="M74 64 C110 40 170 40 200 64" dur="2.1s" begin={b} m={m} />
                  <A attr="opacity" values="0;1;1;0" dur="2.1s" begin={b} m={m} />
                </circle>
              ))}
            </>
          )}
        </Frame>
      );
    case 2:
      return (
        <Frame caption="Locked base shape · new weights · shape verified">
          {(m) => {
            const L = [[40, [36, 66, 96]], [100, [26, 50, 76, 102]], [160, [36, 66, 96]], [210, [66]]] as const;
            const edges: [number, number, number, number][] = [];
            for (let i = 0; i < L.length - 1; i++) for (const a of L[i][1]) for (const b of L[i + 1][1]) edges.push([L[i][0], a, L[i + 1][0], b]);
            return (
              <>
                {edges.map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--agent)" strokeWidth="0.8" opacity="0.35">
                    <A attr="opacity" values="0.15;0.8;0.15" dur={`${1.6 + (i % 5) * 0.35}s`} begin={`${(i % 7) * 0.2}s`} m={m} />
                  </line>
                ))}
                {L.map(([x, ys]) => ys.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="var(--deck)" stroke="var(--agent)" />))}
                <path d="M228 50 h-6 v32 h6" fill="none" stroke="var(--paper-dim)" />
                <path d="M248 50 h6 v32 h-6" fill="none" stroke="var(--paper-dim)" />
                <path d="M232 66 l5 5 l9 -11" fill="none" stroke="var(--signal)" strokeWidth="2">
                  <A attr="stroke-dasharray" values="0 30;30 0;30 0" dur="2.4s" m={m} />
                </path>
                <text x="238" y="100" textAnchor="middle" fill="var(--signal)" style={mono}>ONNX ✓</text>
              </>
            );
          }}
        </Frame>
      );
    case 3:
      return (
        <Frame caption="Pool fills · match runs · tiles claimed">
          {(m) => (
            <>
              <g transform="translate(70 10)">
                {Array.from({ length: 10 * 7 }, (_, i) => {
                  const x = (i % 10) * 14;
                  const y = Math.floor(i / 10) * 16;
                  const t = (i * 7) % 11;
                  const c = t < 2 ? "var(--signal)" : t < 4 ? "var(--agent)" : t < 5 ? "var(--value)" : "";
                  return (
                    <rect key={i} x={x} y={y} width="12" height="14" fill={c || "color-mix(in oklab, var(--paper) 6%, transparent)"} opacity={c ? 0.75 : 1}>
                      {c && <A attr="opacity" values="0.15;0.85;0.85;0.15" dur={`${2.4 + (i % 4) * 0.5}s`} begin={`${(i % 6) * 0.3}s`} m={m} />}
                    </rect>
                  );
                })}
                <circle r="4" fill="var(--signal)" cx={m ? 0 : 20} cy={m ? 0 : 30}>
                  <Mover path="M6 7 L62 7 L62 55 L118 55 L118 7 Z" dur="5s" m={m} />
                </circle>
                <circle r="4" fill="var(--agent)" cx={m ? 0 : 90} cy={m ? 0 : 90}>
                  <Mover path="M132 103 L76 103 L76 39 L20 39 Z" dur="4.2s" m={m} />
                </circle>
              </g>
              <Bot kind="play" x={10} y={44} size={44} m={m} />
            </>
          )}
        </Frame>
      );
    case 4:
      return (
        <Frame caption="Rank-based payout · withdraw to any Solana wallet">
          {(m) => (
            <>
              {[
                [30, 70, "2"],
                [70, 40, "1"],
                [110, 86, "3"],
              ].map(([x, y, r]) => (
                <g key={String(r)}>
                  <rect x={Number(x)} y={Number(y)} width="34" height={120 - Number(y)} fill="none" stroke={r === "1" ? "var(--value)" : "var(--rule-strong)"} />
                  <text x={Number(x) + 17} y={Number(y) + 14} textAnchor="middle" fill={r === "1" ? "var(--value)" : "var(--paper-dim)"} style={mono}>R{r}</text>
                </g>
              ))}
              <circle r="5" fill="var(--value)" cx={m ? 0 : 87} cy={m ? 0 : 30}>
                <Mover path="M87 0 L87 34 L87 34 C140 10 190 10 236 52" dur="3.2s" m={m} />
              </circle>
              <rect x="222" y="52" width="40" height="30" rx="3" fill="none" stroke="var(--paper-dim)" />
              <text x="242" y="96" textAnchor="middle" fill="var(--paper-dim)" style={mono}>WALLET</text>
            </>
          )}
        </Frame>
      );
    default:
      return (
        <Frame caption="Still playing · until the owner freezes it">
          {(m) => (
            <>
              <path d="M10 110 H270" stroke="var(--rule-strong)" />
              <g>
                {m && <animateTransform attributeName="transform" type="translate" values="0 0;150 0;150 0;0 0" keyTimes="0;0.45;0.75;1" dur="6s" repeatCount="indefinite" />}
                <Bot kind="play" x={20} y={56} size={48} m={m} />
              </g>
              <rect x="166" y="40" width="80" height="72" fill="color-mix(in oklab, var(--frost) 22%, transparent)" stroke="var(--frost)" opacity={m ? 0 : 0.8}>
                <A attr="opacity" values="0;0;0.85;0.85;0" dur="6s" m={m} />
              </rect>
              <text x="206" y="34" textAnchor="middle" fill="var(--frost)" style={mono} opacity={m ? 0 : 1}>
                FROZEN
                <A attr="opacity" values="0;0;1;1;0" dur="6s" m={m} />
              </text>
            </>
          )}
        </Frame>
      );
  }
}

/* ───────────────────────────── STANDS ───────────────────────────── */

const Seat = ({ x, y, filled }: { x: number; y: number; filled?: boolean }) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke="var(--paper-dim)" strokeWidth="1.2">
    <path d="M0 0 v26 h34 v-26" strokeDasharray={filled ? undefined : "3 3"} />
    <path d="M-4 26 h42 v6 h-42 z" />
    <path d="M2 32 v12 M32 32 v12" />
  </g>
);

export function OwnerIllo({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <Frame caption="Your seat is empty · nothing to sign up for">
          {(m) => (
            <>
              <Seat x={120} y={40} />
              <rect x="112" y="30" width="58" height="68" fill="none" stroke="var(--paper-dim)" strokeDasharray="2 4">
                <A attr="opacity" values="0.2;0.7;0.2" dur="3s" m={m} />
              </rect>
              <text x="141" y="116" textAnchor="middle" fill="var(--paper-dim)" style={mono}>NO ACCOUNT</text>
            </>
          )}
        </Frame>
      );
    case 1:
      return (
        <Frame caption="Claim code in · seat linked">
          {(m) => (
            <>
              <g>
                {m && <animateTransform attributeName="transform" type="translate" values="0 0;64 0;64 0;0 0" keyTimes="0;0.4;0.85;1" dur="4s" repeatCount="indefinite" />}
                <rect x="30" y="52" width="64" height="26" fill="var(--void)" stroke="var(--signal)" />
                <text x="62" y="69" textAnchor="middle" fill="var(--signal)" style={mono}>••••-••••</text>
              </g>
              <rect x="150" y="46" width="6" height="38" fill="var(--paper)" />
              <Seat x={196} y={44} filled />
              <Bot kind="track" x={194} y={10} size={34} m={m} />
            </>
          )}
        </Frame>
      );
    case 2:
      return (
        <Frame caption="Readable · never writable">
          {(m) => (
            <>
              <g transform="translate(40 26)">
                {[0, 1, 2].map((r) => (
                  <g key={r} transform={`translate(0 ${r * 26})`}>
                    <rect width="150" height="20" fill="none" stroke="var(--rule-strong)" />
                    <rect x="8" y="8" width={[60, 84, 48][r]} height="4" fill="var(--paper-dim)" opacity="0.6" />
                    <text x="138" y="14" textAnchor="end" fill="var(--signal)" style={mono}>R</text>
                  </g>
                ))}
              </g>
              <g transform="translate(222 58)" fill="none" stroke="var(--paper)" strokeWidth="1.4">
                <path d="M-26 0 Q0 -22 26 0 Q0 22 -26 0 Z" />
                <circle r="7">
                  <A attr="r" values="7;7;1;7;7" dur="4s" m={m} />
                </circle>
              </g>
              <text x="222" y="96" textAnchor="middle" fill="var(--paper-dim)" style={mono}>
                WRITE ✕
              </text>
            </>
          )}
        </Frame>
      );
    case 3:
      return (
        <Frame caption="Live view · you watch, the agent plays">
          {(m) => (
            <>
              <rect x="110" y="14" width="150" height="90" fill="none" stroke="var(--paper)" />
              {Array.from({ length: 8 * 5 }, (_, i) => {
                const c = (i * 5) % 9 < 2 ? "var(--signal)" : (i * 5) % 9 < 3 ? "var(--agent)" : "";
                return (
                  <rect key={i} x={118 + (i % 8) * 17} y={22 + Math.floor(i / 8) * 16} width="15" height="14" fill={c || "color-mix(in oklab, var(--paper) 6%, transparent)"}>
                    {c && <A attr="opacity" values="0.2;1;0.2" dur={`${2 + (i % 3) * 0.6}s`} m={m} />}
                  </rect>
                );
              })}
              <circle cx="250" cy="22" r="3" fill="var(--hot)">
                <A attr="opacity" values="1;0.2;1" dur="1.2s" m={m} />
              </circle>
              <Bot kind="track" x={14} y={50} size={56} m={m} />
            </>
          )}
        </Frame>
      );
    case 4:
      return (
        <Frame caption="Payout and withdrawal land as ledger rows">
          {(m) => (
            <>
              <rect x="60" y="12" width="160" height="104" fill="var(--void)" stroke="var(--rule-strong)" />
              <text x="72" y="28" fill="var(--paper-dim)" style={mono}>LEDGER</text>
              {[
                ["+ PAYOUT", "var(--value)", "0s"],
                ["− WITHDRAWAL", "var(--paper)", "0.8s"],
              ].map(([t, c, b], i) => (
                <g key={t} opacity={m ? 0 : 1}>
                  {m && <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="5s" begin={b} repeatCount="indefinite" />}
                  <line x1="72" x2="208" y1={44 + i * 30} y2={44 + i * 30} stroke="var(--rule-strong)" />
                  <text x="72" y={60 + i * 30} fill={c} style={mono}>{t}</text>
                  <text x="208" y={60 + i * 30} textAnchor="end" fill="var(--paper-dim)" style={mono}>REF ••••</text>
                </g>
              ))}
            </>
          )}
        </Frame>
      );
    default:
      return (
        <Frame caption="One lever · it only stops">
          {(m) => (
            <>
              <rect x="96" y="30" width="90" height="40" rx="20" fill="none" stroke="var(--frost)" strokeWidth="1.5" />
              <circle cy="50" r="15" fill="var(--frost)" cx={m ? 116 : 166}>
                {m && <animate attributeName="cx" values="116;116;166;166;116" keyTimes="0;0.3;0.4;0.85;1" dur="5s" repeatCount="indefinite" />}
              </circle>
              <g transform="translate(141 98)" stroke="var(--frost)" strokeWidth="1.4">
                <path d="M0 -12v24M-12 0h24M-8.5 -8.5l17 17M8.5 -8.5l-17 17" />
              </g>
              <text x="74" y="54" textAnchor="end" fill="var(--paper-dim)" style={mono}>RUN</text>
              <text x="200" y="54" fill="var(--frost)" style={mono}>FREEZE</text>
            </>
          )}
        </Frame>
      );
  }
}
