/**
 * Tiny WebAudio synth — no audio files. Hum, ticks, glass chime, air whoosh.
 * Every call is a no-op if audio is unavailable / suspended by autoplay policy.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

export function hum(duration: number) {
  const c = ac();
  if (!c || !master) return () => {};
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 1.6);
  g.gain.setValueAtTime(0.16, t + duration - 1.2);
  g.gain.linearRampToValueAtTime(0, t + duration);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(120, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + duration * 0.7);
  lp.Q.value = 2;
  lp.connect(g).connect(master);
  const oscs = [55, 55.4, 82.4, 110.2].map((f, i) => {
    const o = c.createOscillator();
    o.type = i === 3 ? "triangle" : "sine";
    o.frequency.value = f;
    o.connect(lp);
    o.start(t);
    o.stop(t + duration + 0.1);
    return o;
  });
  return () => {
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setTargetAtTime(0, c.currentTime, 0.08);
      oscs.forEach((o) => o.stop(c.currentTime + 0.4));
    } catch {}
  };
}

export function tick(pitch = 1) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = 2400 * pitch;
  g.gain.setValueAtTime(0.035, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.04);
}

/** Inharmonic partials of a struck glass plate. */
export function chime(base = 880, level = 0.08) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  [1, 2.756, 5.404, 8.933].forEach((r, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = base * r;
    const lv = level / (1 + i * 1.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / (1 + i * 0.7));
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 2.4);
  });
}

export function whoosh(duration = 0.7) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const len = Math.ceil(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + duration * 0.55);
  bp.frequency.exponentialRampToValueAtTime(900, t + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + duration * 0.5);
  g.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
}
