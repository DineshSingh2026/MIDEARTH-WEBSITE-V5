import type { ReactNode } from "react";

/** Minimal JSON syntax colouring. Key values are coloured by blast radius: gp_ cyan, fk_ gold. */
export function jsonLine(line: string, k: number): ReactNode {
  const parts: ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(null|true|false)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    if (m[1] && m[2]) {
      parts.push(
        <span key={i++} className="text-[var(--paper-dim)]">
          {m[1]}
        </span>,
        m[2],
      );
    } else if (m[1]) {
      const v = m[1];
      const c = /^"gp_/.test(v) ? "var(--agent)" : /^"fk_/.test(v) ? "var(--value)" : /^"</.test(v) || /\.\.\.|…/.test(v) ? "var(--paper-dim)" : "var(--signal)";
      parts.push(
        <span key={i++} style={{ color: c }}>
          {v}
        </span>,
      );
    } else if (m[3]) {
      parts.push(
        <span key={i++} className="text-[var(--value)]">
          {m[3]}
        </span>,
      );
    } else if (m[4]) {
      parts.push(
        <span key={i++} className="text-[var(--hot)]">
          {m[4]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <span key={k}>{parts}</span>;
}

export function JsonBlock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <pre className={`mono overflow-x-auto whitespace-pre text-[0.78rem] leading-[1.7] ${className}`}>
      <code>
        {text.split("\n").map((l, i) => (
          <span key={i} className="block">
            {jsonLine(l, i)}
          </span>
        ))}
      </code>
    </pre>
  );
}
