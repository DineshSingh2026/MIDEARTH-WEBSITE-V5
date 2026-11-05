/**
 * Raw WebGL2 glass-pane edge renderer (one fullscreen triangle, no three.js).
 * Draws what the DOM cannot: RGB-split leading edge, specular line, caustic
 * shimmer, faint lens dirt — composited as light (premultiplied, alpha 0 = additive)
 * on dark tones and as ink on daylight tones.
 */
import type { Sweep } from "./geometry";

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uDpr; uniform vec2 uDir; uniform float uS; uniform float uHalf;
uniform float uTime; uniform float uToneA; uniform float uToneB; uniform float uAmp;
out vec4 o;
float g(float x,float w){ return exp(-x*x/(w*w)); }
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y*uDpr - gl_FragCoord.y)/uDpr;
  float x = dot(p,uDir) - uS;                 // + = ahead of the pane centre
  float y = dot(p,vec2(-uDir.y,uDir.x));      // along the edge
  float u = x/uHalf;
  float inside = smoothstep(1.015,0.985,abs(u));
  float tone = mix(uToneA,uToneB,smoothstep(-0.25,0.25,u));

  // glass body: thickness gradient + caustic shimmer + lens dirt
  float thick = pow(1.-abs(u),1.6);
  float c1 = vnoise(vec2(y*0.012 + uTime*0.35, x*0.03 - uTime*0.6));
  float c2 = vnoise(vec2(y*0.03 - uTime*0.5, x*0.05 + uTime*0.4));
  float caustic = pow(smoothstep(0.55,1.0,1.-abs(c1-c2)*2.2),3.0);
  float dirt = smoothstep(0.62,0.95,vnoise(p*0.022))*0.5 + smoothstep(0.8,1.,vnoise(p*0.07+7.))*0.5;
  float body = inside*(0.028 + 0.05*thick + 0.11*caustic*thick + 0.035*dirt);

  // leading edge: chromatic split (R lags, B leads)
  float le = x - uHalf;
  vec3 fringe = vec3(g(le+3.2,1.5), g(le,1.3), g(le-3.2,1.5))*1.1 + vec3(0.25,0.55,0.7)*g(le,14.)*0.18;
  // inner bevel just behind the leading edge
  float bevel = g(le+9.,3.)*0.22;
  // trailing edge rim
  float te = x + uHalf;
  float trail = g(te,1.1)*0.55 + g(te,10.)*0.05;
  // specular sheet line — travels along the edge, brightest in the middle third
  float sp = x + uHalf*0.58;
  float run = 0.5 + 0.5*sin(y*0.004 - uTime*2.4);
  float spec = (g(sp,0.8)*0.9 + g(sp,5.)*0.16)*(0.45+0.55*run*run);
  float spec2 = g(x - uHalf*0.18, 0.6)*0.18*(0.5+0.5*sin(y*0.009+uTime*1.3));

  float lum = body + bevel + trail + spec + spec2;
  // DARK tone: pure light, additive (alpha 0)
  vec3 lightCol = vec3(0.86,0.95,1.0)*lum + fringe;
  vec4 dark = vec4(lightCol, 0.0);
  // DAYLIGHT tone: ink shadow under the speculars + coloured fringes as pigment
  float ink = clamp((trail + spec*0.8 + bevel)*0.45 + body*0.6, 0., 1.);
  vec3 pig = vec3(0.95,0.35,0.12)*fringe.r + vec3(0.1,0.75,0.55)*fringe.g + vec3(0.12,0.38,1.0)*fringe.b;
  float pa = clamp(max(fringe.r,max(fringe.g,fringe.b))*0.55,0.,1.);
  vec4 day = vec4(pig*pa*0.9 + vec3(0.02,0.06,0.08)*ink, clamp(ink+pa,0.,1.));
  o = mix(dark, day, tone) * uAmp;
}`;

export class GlassRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buf: WebGLBuffer;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;

  static create(canvas: HTMLCanvasElement): GlassRenderer | null {
    try {
      const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
      if (!gl) return null;
      return new GlassRenderer(canvas, gl);
    } catch {
      return null;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
  ) {
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "glass shader");
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "p");
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "glass link");
    this.prog = prog;
    this.vao = gl.createVertexArray()!;
    this.buf = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["uRes", "uDpr", "uDir", "uS", "uHalf", "uTime", "uToneA", "uToneB", "uAmp"]) this.loc[k] = gl.getUniformLocation(prog, k);
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(sw: Sweep, s: number, time: number, toneBehind: number, toneAhead: number, amp = 1) {
    const { gl, loc } = this;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(loc.uRes, this.cssW, this.cssH);
    gl.uniform1f(loc.uDpr, this.dpr);
    gl.uniform2f(loc.uDir, sw.dir.x, sw.dir.y);
    gl.uniform1f(loc.uS, s);
    gl.uniform1f(loc.uHalf, sw.half);
    gl.uniform1f(loc.uTime, time);
    gl.uniform1f(loc.uToneA, toneBehind);
    gl.uniform1f(loc.uToneB, toneAhead);
    gl.uniform1f(loc.uAmp, amp);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  clear() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  dispose() {
    const { gl } = this;
    gl.deleteBuffer(this.buf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
