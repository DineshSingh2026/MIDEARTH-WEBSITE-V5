"use client";
/**
 * GlassPane — a real pane of glass between the stands and the field.
 * Raw WebGL (one quad, no three.js): samples the live sim <canvas> behind it as a texture and renders
 * soft-focus refraction with chromatic dispersion, float-glass waviness, condensation droplets,
 * moving reflections of the daylight room, a bevelled edge, and — when `frost` > 0 — frost that
 * crystallises inward from the frame. Falls back to CSS blur when WebGL is unavailable.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useUI } from "@/store/ui";

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
const FRAG = `
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uTime; uniform float uFrost; uniform vec2 uPtr;
uniform float uHas; uniform float uBlur; uniform float uMotion; uniform float uLight;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
vec3 samp(vec2 uv){ return texture2D(uTex, clamp(vec2(uv.x, 1.-uv.y), 0.002, 0.998)).rgb; }
vec3 soft(vec2 uv, float r){
  vec3 acc=vec3(0.);
  for(int i=0;i<14;i++){ float fi=float(i); float a=fi*2.39996; float rr=sqrt((fi+.5)/14.)*r;
    vec2 o=vec2(cos(a),sin(a))*rr; o.x*=uRes.y/uRes.x; acc+=samp(uv+o); }
  return acc/14.;
}
void main(){
  vec2 uv=vUv; vec2 asp=vec2(uRes.x/uRes.y,1.);
  float t=uTime*uMotion;
  // float-glass waviness (normal from fbm height)
  vec2 q=uv*asp*2.6+vec2(t*.015,0.);
  float h0=fbm(q), hx=fbm(q+vec2(.012,0.)), hy=fbm(q+vec2(0.,.012));
  vec2 n=vec2(hx-h0,hy-h0)*7.;
  // condensation droplets (cell scatter), each a tiny lens
  vec2 dg=uv*asp*26.; vec2 di=floor(dg); vec2 df=fract(dg)-.5; float dr=hash(di);
  vec2 dc=(vec2(hash(di+3.1),hash(di+7.7))-.5)*.5; vec2 dv=df-dc; float drad=.07+dr*.16;
  float dropOn=step(.78-uFrost*.2,dr); float drop=dropOn*smoothstep(drad,drad*.55,length(dv)); vec2 dn=dv/max(drad,.001);
  // frost mask — grows inward from the frame along a noisy, crystalline front
  vec2 e=min(uv,1.-uv); float edge=min(e.x*asp.x,e.y);
  float fr=fbm(uv*asp*5.)*.6+fbm(uv*asp*19.)*.4;
  float reach=uFrost*.46;
  float field=edge+(fr-.5)*.3;
  float fm=(1.-smoothstep(reach-.05, reach, field))*step(.002,uFrost);
  float ridge=pow(1.-abs(fbm(uv*asp*13.+3.)*2.-1.),7.);
  float fern=pow(1.-abs(fbm(uv*asp*42.+9.)*2.-1.),10.);
  // refraction + dispersion through soft focus
  float r=uBlur+fm*.026;
  vec2 off=n*.005+dn*drop*.018+vec2(ridge,fern)*fm*.006;
  vec3 col=vec3(soft(uv+off,r).r, soft(uv+off*1.18,r).g, soft(uv+off*1.36,r).b);
  if(uHas<.5) col=vec3(.01,.03,.04);
  col*=vec3(.95,1.,.985);
  // reflections of the stands: daylight room gradient, two travelling streaks, pointer specular, fresnel rim
  float d1=uv.x*1.1+uv.y*.55-fract(t*.025)*2.6+.2;
  float streak=smoothstep(0.,.07,d1)*smoothstep(.2,.07,d1)*.13+smoothstep(.24,.26,d1)*smoothstep(.3,.26,d1)*.08;
  float spec=pow(max(0.,1.-length((uv-(uPtr*.5+.5))*asp)*1.25),5.)*.14;
  float fres=pow(1.-min(edge*5.,1.),3.)*.22;
  vec3 room=mix(vec3(1.,.99,.97),vec3(.86,.93,.96),uv.y);
  col+=room*(streak+spec+fres+uLight*.035)*(1.-fm*.6);
  // droplet: dark rim + bright catchlight
  col*=1.-dropOn*smoothstep(drad*.55,drad,length(dv))*smoothstep(drad*1.1,drad,length(dv))*.35;
  col+=drop*smoothstep(.3,0.,length(dn-vec2(-.35,.4)))*.55;
  // frost body: icy white, crystalline ridges, fern feathering, sparkle
  vec3 ice=vec3(.86,.95,1.);
  vec3 fc=mix(col,ice,.62)+ice*(ridge*.35+fern*.25);
  float sp=step(.996,hash(floor(uv*uRes*.5)+floor(t*5.)))*fm;
  col=mix(col,fc,fm)+sp*.9;
  // the growing front glints
  float front=smoothstep(.022,0.,abs(field-reach+.02))*step(.002,uFrost)*(1.-smoothstep(.95,1.,uFrost)*.6);
  col+=ice*front*.55;
  // bevel: bright inner lip + darker inset
  col+=smoothstep(.005,0.,edge)*.4;
  col*=1.-smoothstep(.02,.005,edge)*.12;
  gl_FragColor=vec4(col,1.);
}`;

export default function GlassPane({
  source,
  frost = 0,
  blur = 0.012,
  className = "",
  children,
}: {
  /** element containing the sim <canvas> to look through */
  source: RefObject<HTMLElement | null>;
  frost?: number;
  blur?: number;
  className?: string;
  children?: ReactNode;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const motion = useUI((s) => s.motion);
  const mode = useUI((s) => s.mode);
  const [gl, setGl] = useState<boolean | null>(null);
  const live = useRef({ frost, target: frost, motion, light: mode === "stands" ? 1 : 0, ptr: [0, 0] });
  live.current.target = frost;
  live.current.motion = motion;
  live.current.light = mode === "stands" ? 1 : 0;

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext("webgl", { premultipliedAlpha: false, antialias: false }) as WebGLRenderingContext | null;
    if (!g) {
      setGl(false);
      return;
    }
    const sh = (type: number, src: string) => {
      const s = g.createShader(type)!;
      g.shaderSource(s, src);
      g.compileShader(s);
      return s;
    };
    const prog = g.createProgram()!;
    g.attachShader(prog, sh(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
      setGl(false);
      return;
    }
    g.useProgram(prog);
    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(prog, "p");
    g.enableVertexAttribArray(loc);
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    const tex = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    const U = (n: string) => g.getUniformLocation(prog, n);
    const u = { res: U("uRes"), time: U("uTime"), frost: U("uFrost"), ptr: U("uPtr"), has: U("uHas"), blur: U("uBlur"), motion: U("uMotion"), light: U("uLight") };
    setGl(true);

    let raf = 0;
    let timer = 0;
    let visible = true;
    let last = performance.now();
    const t0 = last;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      live.current.ptr = [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)];
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    function draw(now: number) {
      raf = 0;
      if (!c || !g) return;
      const L = live.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const W = Math.max(1, Math.round(c.clientWidth * dpr));
      const H = Math.max(1, Math.round(c.clientHeight * dpr));
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      g.viewport(0, 0, W, H);
      // frost crystallises over ~2.4s; thaws faster
      L.frost = L.motion ? L.frost + (L.target - L.frost) * Math.min(1, dt * (L.target > L.frost ? 0.9 : 2.5)) : L.target;
      const srcCanvas = source.current?.querySelector("canvas");
      let has = 0;
      if (srcCanvas && srcCanvas.width > 1) {
        try {
          g.bindTexture(g.TEXTURE_2D, tex);
          g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, srcCanvas);
          has = 1;
        } catch {
          has = 0;
        }
      }
      g.uniform2f(u.res, W, H);
      g.uniform1f(u.time, (now - t0) / 1000);
      g.uniform1f(u.frost, L.frost);
      g.uniform2f(u.ptr, L.ptr[0], L.ptr[1]);
      g.uniform1f(u.has, has);
      g.uniform1f(u.blur, blur);
      g.uniform1f(u.motion, L.motion ? 1 : 0);
      g.uniform1f(u.light, L.light);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      // reduced motion: keep redrawing slowly so the static sim frame & frost state stay in sync
      if (!visible) return;
      if (L.motion) raf = requestAnimationFrame(draw);
      else timer = window.setTimeout(() => (raf = requestAnimationFrame(draw)), 250);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      g.deleteTexture(tex);
      g.deleteBuffer(buf);
      g.deleteProgram(prog);
    };
  }, [source, blur]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* fallback / pre-GL: the sim itself, softened with CSS */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: gl ? 0 : 1, filter: `blur(${10 + frost * 8}px) saturate(1.1)`, transform: "scale(1.06)" }}
      >
        {children}
      </div>
      <canvas ref={cv} aria-hidden className="absolute inset-0 h-full w-full" style={{ opacity: gl ? 1 : 0 }} />
      {gl === false && frost > 0 && (
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(220,240,255,0.75))]" style={{ opacity: frost }} />
      )}
    </div>
  );
}
