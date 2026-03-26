"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import NavbarWithChildren from "@/block/navbar-with-children";

export default function HeroSectionWithMeshGradient() {
  return (
    <div className="relative w-full translate-z-0 bg-white dark:bg-neutral-950">
      <NavbarWithChildren />
      <Hero />
    </div>
  );
}

const Hero = () => {
  return (
    <section className="bg-gray-100 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-40 lg:py-52">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-5">
          <div className="col-span-1 lg:col-span-3">
            <a
              href="#"
              className="text-sm text-neutral-500 dark:text-neutral-400"
            >
              Read our series A $20M Funding Round &rarr;
            </a>
            <h1 className="mt-4 text-3xl font-display font-medium tracking-tight text-neutral-900 md:text-5xl lg:text-6xl dark:text-white">
              Your business, running itself.
            </h1>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <p className="text-lg font-medium text-neutral-700 md:text-2xl lg:text-xl dark:text-neutral-300">
              Opus replaces your booking tool, front desk, and payment system — with one platform that gets smarter every day.
            </p>
            <div className="relative z-10 mt-6 hidden shrink-0 items-center gap-3 md:flex">
              <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-[0px_0px_10px_0px_rgba(255,255,255,0.2)_inset] ring ring-white/20 ring-offset-2 ring-offset-blue-600 transition-all duration-200 ring-inset hover:shadow-[0px_0px_20px_0px_rgba(255,255,255,0.4)_inset] hover:ring-white/40 active:scale-98">
                Get started free
              </button>
              <button className="rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-200 hover:text-black active:scale-98 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white">
                Book a demo
              </button>
            </div>
          </div>
        </div>
        <MeshGradient>
          <Image
            src="/hero.png"
            alt="Hero"
            width={1920}
            height={1080}
            className="mx-auto h-full w-full max-w-[90%] rounded-lg object-cover object-left-top md:max-w-[85%]"
          />
        </MeshGradient>
      </div>
    </section>
  );
};
const Logo = () => {
  return (
    <a href="/" className="flex items-center gap-2">
      <span className="text-lg font-medium tracking-tight text-black dark:text-white">
        something ai
      </span>
    </a>
  );
};

const products = [
  {
    title: "Analytics",
    description: "Track your audience and conversions",
    href: "#",
  },
  {
    title: "Campaigns",
    description: "Create and manage ad campaigns",
    href: "#",
  },
  {
    title: "Insights",
    description: "Deep-dive into performance metrics",
    href: "#",
  },
  {
    title: "Integrations",
    description: "Connect with your favorite tools",
    href: "#",
  },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        {/* Left - Logo */}
        <div className="relative z-10 flex shrink-0">
          <Logo />
        </div>

        {/* Center - Nav Links (absolutely centered) */}
        <div className="absolute inset-x-0 hidden justify-center md:flex">
          <div className="flex items-center gap-1">
            <FeaturesDropdown />
            <a
              href="#"
              className="rounded-md px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#"
              className="rounded-md px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Blog
            </a>
          </div>
        </div>

        {/* Right - Buttons */}
        <div className="relative z-10 hidden shrink-0 items-center gap-3 md:flex">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-100 hover:text-black active:scale-98 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white">
            Sign in
          </button>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-[0px_0px_10px_0px_rgba(255,255,255,0.2)_inset] ring ring-white/20 ring-offset-2 ring-offset-blue-600 transition-all duration-200 ring-inset hover:shadow-[0px_0px_20px_0px_rgba(255,255,255,0.4)_inset] hover:ring-white/40 active:scale-98 dark:ring-offset-neutral-950">
            Get started
          </button>
        </div>

        {/* Mobile - Hamburger */}
        <button
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-neutral-100 md:hidden dark:hover:bg-neutral-800"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="flex w-4 flex-col gap-1">
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.2 }}
              className="block h-0.5 w-full bg-black dark:bg-white"
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="block h-0.5 w-full bg-black dark:bg-white"
            />
            <motion.span
              animate={
                mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }
              }
              transition={{ duration: 0.2 }}
              className="block h-0.5 w-full bg-black dark:bg-white"
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-neutral-200 md:hidden dark:border-neutral-800"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <MobileFeaturesDropdown />
              <a
                href="#"
                className="rounded-md px-3 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                Pricing
              </a>
              <a
                href="#"
                className="rounded-md px-3 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                Blog
              </a>
              <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <button className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-100 active:scale-98 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white">
                  Sign in
                </button>
                <button className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white shadow-[0px_0px_10px_0px_rgba(255,255,255,0.2)_inset] ring ring-white/20 ring-offset-2 ring-offset-blue-600 transition-all duration-200 ring-inset hover:shadow-[0px_0px_20px_0px_rgba(255,255,255,0.4)_inset] hover:ring-white/40 active:scale-98 dark:ring-offset-neutral-950">
                  Get started
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function FeaturesDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="flex items-center gap-1 rounded-md px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        Features
        <ChevronDown isOpen={isOpen} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-2"
          >
            <div className="w-48 rounded-xl bg-white p-2 shadow-sm ring-1 shadow-black/10 ring-black/10 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-white/5 dark:ring-white/5">
              {products.map((product) => (
                <a
                  key={product.title}
                  href={product.href}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="text-sm font-medium text-black dark:text-white">
                    {product.title}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {product.description}
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileFeaturesDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        Features
        <ChevronDown isOpen={isOpen} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 py-1 pl-3">
              {products.map((product) => (
                <a
                  key={product.title}
                  href={product.href}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="text-sm font-medium text-black dark:text-white">
                    {product.title}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {product.description}
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronDown({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

// ─── Stripe-style Mesh Gradient Shader ───────────────────────────────────────

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;

  //
  // 3D Simplex Noise (Ashima Arts — Ian McEwan, Stefan Gustavson)
  //
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
    return blend * opacity + base * (1.0 - opacity);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    float time = u_time * 0.12;

    // Low-frequency noise space — large, sweeping shapes
    vec2 nCoord = vec2(uv.x * aspect, uv.y) * 0.35;

    // Base color: muted deep purple
    vec3 color = vec3(0.28, 0.15, 0.62);

    // Layer 1 — Soft teal (large, slow-drifting wave)
    float n1 = snoise(vec3(
      nCoord.x * 1.2 + time * 0.4,
      nCoord.y * 1.8,
      time * 0.25 + 5.0
    ));
    n1 = smoothstep(0.18, 0.65, n1 * 0.5 + 0.5);
    color = blendNormal(color, vec3(0.18, 0.65, 0.60), pow(n1, 4.0));

    // Layer 2 — Dusty rose (broad, gentle)
    float n2 = snoise(vec3(
      nCoord.x * 1.4 + time * 0.5,
      nCoord.y * 2.0,
      time * 0.30 + 18.0
    ));
    n2 = smoothstep(0.20, 0.72, n2 * 0.5 + 0.5);
    color = blendNormal(color, vec3(0.72, 0.32, 0.50), pow(n2, 4.0));

    // Layer 3 — Muted blue (wide sweep)
    float n3 = snoise(vec3(
      nCoord.x * 1.0 - time * 0.3,
      nCoord.y * 1.6,
      time * 0.20 + 32.0
    ));
    n3 = smoothstep(0.22, 0.80, n3 * 0.5 + 0.5);
    color = blendNormal(color, vec3(0.25, 0.35, 0.68), pow(n3, 4.0));

    // Subtle top darkening for depth
    color.g -= pow(uv.y + 0.2 * uv.x, 6.0) * 0.08;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function MeshGradient({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const createShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const startTime = performance.now();
    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [createShader]);

  return (
    <div className={cn("relative mx-auto my-12 h-72 w-full max-w-7xl py-4 sm:h-120 md:my-20 md:h-120 md:py-20 lg:h-[800px]", containerClassName)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full rounded-3xl"
        style={{ display: "block" }}
      />
      {/* SVG noise overlay */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full rounded-3xl opacity-[0.35] dark:opacity-[0.20]">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      <div
        className={cn(
          "relative z-20 h-full w-full overflow-hidden rounded-lg",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
