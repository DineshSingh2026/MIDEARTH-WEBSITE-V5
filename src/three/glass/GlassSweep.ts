/**
 * GlassSweep — the physical pane. Composes:
 *  1. a backdrop-filter "body" band (real blur/saturation of whatever is behind = fake refraction)
 *  2. a thick-edge strip at the leading edge (stronger blur + brightness = lens bevel)
 *  3. the WebGL edge shader canvas (RGB split, specular, caustics, dirt)
 * All three are driven from the same geometry each frame.
 */
import { band, edgeAt, makeSweep, poly, type Sweep } from "./geometry";
import { GlassRenderer } from "./GlassRenderer";

export class GlassSweep {
  readonly root: HTMLDivElement;
  private body: HTMLDivElement;
  private edge: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private gl: GlassRenderer | null;
  sweep: Sweep;

  constructor(
    host: HTMLElement,
    private opts: { angle?: number; reverse?: boolean } = {},
  ) {
    const root = document.createElement("div");
    root.setAttribute("aria-hidden", "true");
    root.style.cssText = "position:absolute;inset:0;pointer-events:none;contain:strict;";
    const mk = (css: string) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;will-change:clip-path;${css}`;
      root.appendChild(d);
      return d;
    };
    this.body = mk(
      "backdrop-filter:blur(10px) saturate(1.45) brightness(1.06);-webkit-backdrop-filter:blur(10px) saturate(1.45) brightness(1.06);background:linear-gradient(115deg,rgba(191,233,255,0.035),rgba(255,255,255,0.0) 40%,rgba(191,233,255,0.05));",
    );
    this.edge = mk("backdrop-filter:blur(22px) brightness(1.18) saturate(1.7);-webkit-backdrop-filter:blur(22px) brightness(1.18) saturate(1.7);");
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    root.appendChild(this.canvas);
    host.appendChild(root);
    this.root = root;
    this.gl = GlassRenderer.create(this.canvas);
    this.sweep = makeSweep(window.innerWidth, window.innerHeight, opts.angle, opts.reverse);
    this.resize();
  }

  setReverse(reverse: boolean) {
    this.opts.reverse = reverse;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.sweep = makeSweep(w, h, this.opts.angle, this.opts.reverse);
    this.gl?.resize(w, h);
  }

  /** e = eased progress 0..1. Returns the pane centre-line projection `s`. */
  frame(e: number, time: number, toneBehind: number, toneAhead: number) {
    const sw = this.sweep;
    const s = edgeAt(sw, e);
    this.body.style.clipPath = poly(band(sw, s, -sw.half, sw.half));
    this.edge.style.clipPath = poly(band(sw, s, sw.half - 26, sw.half));
    this.gl?.render(sw, s, time, toneBehind, toneAhead, 1);
    return s;
  }

  hide() {
    this.body.style.clipPath = poly([]);
    this.edge.style.clipPath = poly([]);
    this.gl?.clear();
  }

  dispose() {
    this.gl?.dispose();
    this.gl = null;
    this.root.remove();
  }
}
