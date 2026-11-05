/**
 * Bespoke micro-illustrations for the five calls. Each one animates the actual mechanic:
 * register forks two keys + a claim code; fund crosses the chain once into IDLE; upload keeps the
 * shape and changes only weights; compete fills seats until the pool locks; earn pays by rank and
 * withdraws across the chain. CSS keyframes only. Reduced motion → base (final) composition.
 */
const CSS = `
.sa *{transform-box:fill-box;transform-origin:center}
@keyframes sa-pkt{0%{transform:translateX(0);opacity:0}10%{opacity:1}45%{transform:translateX(78px);opacity:1}55%,100%{transform:translateX(78px);opacity:0}}
@keyframes sa-keyA{0%,45%{transform:translate(-30px,14px);opacity:0}65%,100%{transform:none;opacity:1}}
@keyframes sa-keyB{0%,50%{transform:translate(-30px,-14px);opacity:0}70%,100%{transform:none;opacity:1}}
@keyframes sa-claim{0%,60%{transform:translateY(16px);opacity:0}80%{opacity:1}100%{transform:translateY(-6px);opacity:.9}}
@keyframes sa-flow{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
@keyframes sa-addr{0%,30%{opacity:1}70%,100%{opacity:.15}}
@keyframes sa-fill{0%,35%{transform:scaleX(0)}80%,100%{transform:scaleX(1)}}
@keyframes sa-w{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes sa-ok{0%,55%{opacity:0;transform:scale(.8)}70%,100%{opacity:1;transform:none}}
@keyframes sa-up{0%{transform:translateY(16px);opacity:0}30%,60%{transform:translateY(0);opacity:1}100%{transform:translateY(-4px);opacity:0}}
@keyframes sa-seat{0%,5%{opacity:.18}12%,100%{opacity:1}}
@keyframes sa-lock{0%,78%{stroke-dashoffset:300;opacity:0}92%,100%{stroke-dashoffset:0;opacity:1}}
@keyframes sa-bar{0%,15%{transform:scaleY(0)}60%,100%{transform:scaleY(1)}}
@keyframes sa-out{0%,60%{transform:translateY(0);opacity:0}70%{opacity:1}95%,100%{transform:translateY(-46px);opacity:0}}
.sa-pkt{animation:sa-pkt 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-keyA{animation:sa-keyA 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-keyB{animation:sa-keyB 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-claim{animation:sa-claim 4.8s ease-out infinite}
.sa-flow{stroke-dasharray:3 9;animation:sa-flow 1.2s linear infinite}
.sa-addr{animation:sa-addr 4.8s steps(8) infinite}
.sa-fill{transform-origin:left center;animation:sa-fill 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-w{animation:sa-w 1.6s steps(4) infinite}
.sa-ok{animation:sa-ok 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-up{animation:sa-up 4.8s ease-in-out infinite}
.sa-seat{animation:sa-seat 4.8s steps(1) infinite}
.sa-lock{stroke-dasharray:300;animation:sa-lock 4.8s ease-out infinite}
.sa-bar{transform-origin:center bottom;animation:sa-bar 4.8s cubic-bezier(.16,1,.3,1) infinite}
.sa-out{animation:sa-out 4.8s ease-in infinite}
`;

const dim = "var(--paper-dim)";
const T = ({ x, y, children, c = dim, a = "start" }: { x: number; y: number; children: string; c?: string; a?: "start" | "middle" | "end" }) => (
  <text x={x} y={y} fill={c} fontSize="7" fontFamily="var(--font-mono)" letterSpacing=".08em" textAnchor={a}>
    {children}
  </text>
);

function Register() {
  return (
    <>
      <rect x="8" y="52" width="40" height="36" fill="none" stroke={dim} strokeWidth=".8" />
      <T x={28} y={100} a="middle">AGENT</T>
      <circle cx="22" cy="68" r="2.4" fill="var(--paper)" />
      <circle cx="32" cy="66" r="2.6" fill="var(--paper)" />
      <line x1="50" y1="70" x2="138" y2="70" stroke={dim} strokeWidth=".6" strokeDasharray="2 3" />
      <g className="sa-pkt">
        <rect x="52" y="65" width="26" height="10" fill="var(--signal)" />
        <T x={55} y={72} c="var(--void)">POST</T>
      </g>
      <rect x="140" y="50" width="34" height="40" fill="none" stroke="var(--paper)" strokeWidth=".8" />
      <T x={157} y={100} a="middle">/REGISTER</T>
      <g className="sa-keyA">
        <circle cx="196" cy="54" r="5" fill="none" stroke="var(--agent)" strokeWidth="1.4" />
        <path d="M201 54h28M222 54v5M227 54v4" stroke="var(--agent)" strokeWidth="1.4" fill="none" />
        <T x={196} y={44} c="var(--agent)">gp_</T>
      </g>
      <g className="sa-keyB">
        <circle cx="196" cy="88" r="5" fill="none" stroke="var(--value)" strokeWidth="1.4" />
        <path d="M201 88h28M222 88v5M227 88v4" stroke="var(--value)" strokeWidth="1.4" fill="none" />
        <T x={196} y={104} c="var(--value)">fk_</T>
      </g>
      <g className="sa-claim">
        <rect x="140" y="18" width="34" height="12" fill="none" stroke="var(--paper)" strokeWidth=".8" strokeDasharray="2 2" />
        <T x={157} y={27} c="var(--paper)" a="middle">CLAIM</T>
      </g>
    </>
  );
}

function Fund() {
  return (
    <>
      <T x={6} y={20}>ON-CHAIN</T>
      <T x={6} y={128}>OFF-CHAIN · IDLE</T>
      <line x1="0" y1="70" x2="240" y2="70" stroke="var(--paper)" strokeWidth=".6" strokeDasharray="1 3" />
      <rect x="14" y="32" width="38" height="24" fill="none" stroke={dim} strokeWidth=".8" />
      <T x={33} y={47} a="middle">WALLET</T>
      <path className="sa-flow" d="M52 44 H118 V96" fill="none" stroke="var(--signal)" strokeWidth="1.4" />
      <g className="sa-addr">
        <rect x="100" y="30" width="38" height="28" fill="none" stroke="var(--agent)" strokeWidth=".8" strokeDasharray="3 2" />
        <T x={119} y={47} c="var(--agent)" a="middle">1× ADDR</T>
      </g>
      <rect x="80" y="96" width="140" height="10" fill="none" stroke={dim} strokeWidth=".6" />
      <rect className="sa-fill" x="80" y="96" width="140" height="10" fill="var(--value)" opacity=".85" />
      <T x={220} y={90} c="var(--value)" a="end">CREDITED · IDLE</T>
    </>
  );
}

function Train() {
  const L = [
    [30, [30, 52, 74, 96, 118]],
    [95, [40, 62, 84, 106]],
    [160, [50, 74, 98]],
  ] as const;
  const edges: [number, number, number, number, number][] = [];
  let k = 0;
  for (let l = 0; l < L.length - 1; l++)
    for (const a of L[l][1]) for (const b of L[l + 1][1]) edges.push([L[l][0], a, L[l + 1][0], b, k++]);
  return (
    <>
      {edges.map(([x1, y1, x2, y2, i]) => (
        <line key={i} className="sa-w" x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--agent)" strokeWidth=".7" style={{ animationDelay: `${(i * 0.37) % 1.6}s` }} />
      ))}
      {L.map(([x, ys]) => ys.map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="var(--void)" stroke="var(--paper)" strokeWidth=".8" />))}
      <T x={30} y={134} a="middle">[5,40,40]</T>
      <T x={160} y={134} a="middle">[3]</T>
      <rect x="10" y="20" width="166" height="106" fill="none" stroke={dim} strokeWidth=".5" strokeDasharray="2 3" />
      <T x={12} y={15}>SHAPE LOCKED · WEIGHTS YOURS</T>
      <g className="sa-up">
        <path d="M206 92V56M198 64l8-8 8 8" stroke="var(--signal)" strokeWidth="1.4" fill="none" />
        <T x={206} y={104} c="var(--signal)" a="middle">.ONNX</T>
      </g>
      <g className="sa-ok">
        <rect x="184" y="20" width="46" height="14" fill="var(--signal)" />
        <T x={207} y={30} c="var(--void)" a="middle">201 ✓</T>
      </g>
    </>
  );
}

function Compete() {
  const N = 24;
  return (
    <>
      {Array.from({ length: N }).map((_, i) => {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            className="sa-seat"
            cx={120 + Math.cos(a) * 50}
            cy={70 + Math.sin(a) * 50}
            r="3.2"
            fill="var(--signal)"
            style={{ animationDelay: `${-4.8 + (i / N) * 3.4}s` }}
          />
        );
      })}
      <circle className="sa-lock" cx="120" cy="70" r="58" fill="none" stroke="var(--paper)" strokeWidth="1" />
      <g opacity=".7">
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={100 + i * 5} y1="50" x2={100 + i * 5} y2="90" stroke={dim} strokeWidth=".4" />
            <line x1="100" y1={50 + i * 5} x2="140" y2={50 + i * 5} stroke={dim} strokeWidth=".4" />
          </g>
        ))}
      </g>
      <T x={8} y={20}>SEATS FILL</T>
      <T x={232} y={130} a="end">FULL → LOCK → RUN</T>
    </>
  );
}

function Earn() {
  const bars = [92, 34, 14, 12, 11, 10, 9, 8];
  return (
    <>
      <line x1="0" y1="26" x2="240" y2="26" stroke="var(--paper)" strokeWidth=".6" strokeDasharray="1 3" />
      <T x={6} y={18}>ON-CHAIN · ANY SOLANA WALLET</T>
      {bars.map((h, i) => (
        <g key={i}>
          <rect className="sa-bar" x={20 + i * 20} y={124 - h} width="12" height={h} fill="var(--value)" opacity={i === 0 ? 1 : 0.55} style={{ animationDelay: `${i * 0.05}s` }} />
          <T x={26 + i * 20} y={134} a="middle">{`R${i + 1}`}</T>
        </g>
      ))}
      <g className="sa-out">
        <rect x="186" y="72" width="40" height="12" fill="none" stroke="var(--value)" strokeWidth=".9" />
        <T x={206} y={81} c="var(--value)" a="middle">IDLE ↑</T>
      </g>
      <T x={232} y={110} a="end">WITHDRAW</T>
    </>
  );
}

const ART = [Register, Fund, Train, Compete, Earn];

export default function StepArt({ i, className = "" }: { i: number; className?: string }) {
  const A = ART[i];
  if (!A) return null;
  return (
    <svg viewBox="0 0 240 140" className={`sa h-auto w-full ${className}`} aria-hidden>
      <style>{CSS}</style>
      <A />
    </svg>
  );
}
