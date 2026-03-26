"use client";
import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import React, { useEffect, useRef } from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Container className="flex min-h-screen items-center py-10 md:py-20">
            <div className="grid w-full grid-cols-1 items-center justify-center gap-10 px-4 md:grid-cols-2 md:px-8 lg:gap-40">
                <div className="flex w-full items-center justify-center lg:justify-end">
                    {children}
                </div>
                <AuthIllustration />
            </div>
        </Container>
    );
}

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M0 4.5C0 3.11929 1.11929 2 2.5 2H7.5C8.88071 2 10 3.11929 10 4.5V9.40959C10.0001 9.4396 10.0002 9.46975 10.0002 9.50001C10.0002 10.8787 11.1162 11.9968 12.4942 12C12.4961 12 12.4981 12 12.5 12H17.5C18.8807 12 20 13.1193 20 14.5V19.5C20 20.8807 18.8807 22 17.5 22H12.5C11.1193 22 10 20.8807 10 19.5V14.5C10 14.4931 10 14.4861 10.0001 14.4792C9.98891 13.1081 8.87394 12 7.50017 12C7.4937 12 7.48725 12 7.48079 12H2.5C1.11929 12 0 10.8807 0 9.5V4.5Z"
                fill="currentColor"
            />
        </svg>
    );
};

export const Logo = () => {
    return (
        <a href="/" className="flex items-center gap-2">
            <LogoSVG />
            <span className="text-2xl font-medium">Notus</span>
        </a>
    );
};

export const Container = ({
    className,
    children,
    ...props
}: {
    as?: React.ElementType;
    className?: string;
    children: React.ReactNode;
}) => {
    return (
        <div className={cn("mx-auto max-w-7xl", className)} {...props}>
            {children}
        </div>
    );
};

export const Heading = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <h1
            className={cn(
                "text-center text-3xl font-medium tracking-tight text-black md:text-4xl lg:text-6xl dark:text-white",
                className,
            )}
        >
            {children}
        </h1>
    );
};

export const SubHeading = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <h2
            className={cn(
                "text-center text-sm font-medium tracking-tight text-gray-600 md:text-sm lg:text-base dark:text-gray-300",
                className,
            )}
        >
            {children}
        </h2>
    );
};

export const Label = ({
    className,
    ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                "text-charcoal-700 flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:text-neutral-100",
                className,
            )}
            {...props}
        />
    );
};

export const Input = ({
    className,
    type,
    ...props
}: React.ComponentProps<"input">) => {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-neutral-800",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                "shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]",
                className,
            )}
            {...props}
        />
    );
};

export const Button = <T extends React.ElementType = "button">({
    children,
    variant = "primary",
    className,
    ...props
}: {
    children: React.ReactNode;
    variant?: "primary" | "secondary";
    className?: string;
} & Omit<
    React.ComponentProps<T>,
    "children" | "variant" | "className" | "as"
>) => {
    return (
        <button
            {...props}
            className={cn(
                "block cursor-pointer rounded-xl px-6 py-2 text-center text-sm font-medium transition duration-150 active:scale-[0.98] sm:text-base",
                variant === "primary" &&
                "bg-charcoal-900 text-white dark:bg-white dark:text-black",
                variant === "secondary" && "bg-neutral-800 text-white",

                className,
            )}
        >
            {children}
        </button>
    );
};

export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="29"
            height="29"
            viewBox="0 0 29 29"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g clipPath="url(#clip0_389_3626)">
                <path
                    d="M25.1018 15.1176C25.1018 14.1999 25.0273 13.5302 24.8662 12.8358H14.3867V16.9779H20.5379C20.4139 18.0072 19.7443 19.5575 18.256 20.5991L18.2352 20.7378L21.5486 23.3047L21.7781 23.3276C23.8864 21.3805 25.1018 18.5157 25.1018 15.1176Z"
                    fill="#4285F4"
                />
                <path
                    d="M14.3851 26.0311C17.3986 26.0311 19.9285 25.0389 21.7765 23.3276L18.2544 20.5991C17.3118 21.2564 16.0468 21.7153 14.3851 21.7153C11.4335 21.7153 8.92835 19.7683 8.03534 17.0771L7.90444 17.0882L4.45912 19.7546L4.41406 19.8799C6.24949 23.5259 10.0196 26.0311 14.3851 26.0311Z"
                    fill="#34A853"
                />
                <path
                    d="M8.03837 17.0772C7.80275 16.3827 7.66638 15.6385 7.66638 14.8697C7.66638 14.1007 7.80275 13.3567 8.02598 12.6622L8.01973 12.5143L4.53123 9.80505L4.4171 9.85934C3.66063 11.3724 3.22656 13.0714 3.22656 14.8697C3.22656 16.6679 3.66063 18.3669 4.4171 19.8799L8.03837 17.0772Z"
                    fill="#FBBC05"
                />
                <path
                    d="M14.3851 8.02383C16.4809 8.02383 17.8947 8.92915 18.7008 9.68571L21.8508 6.61007C19.9162 4.81182 17.3986 3.70807 14.3851 3.70807C10.0196 3.70807 6.24949 6.21319 4.41406 9.85926L8.02294 12.6621C8.92835 9.97092 11.4335 8.02383 14.3851 8.02383Z"
                    fill="#EB4335"
                />
            </g>
            <defs>
                <clipPath id="clip0_389_3626">
                    <rect
                        width="22.4"
                        height="22.4"
                        fill="white"
                        transform="translate(2.96875 3.7081)"
                    />
                </clipPath>
            </defs>
        </svg>
    );
};

export const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="29"
            height="29"
            viewBox="0 0 29 29"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g clipPath="url(#clip0_389_3636)">
                <mask
                    id="mask0_389_3636"
                    style={{ maskType: "luminance" }}
                    maskUnits="userSpaceOnUse"
                    x="-1"
                    y="-2"
                    width="32"
                    height="32"
                >
                    <path
                        d="M-0.714844 -1.70559H30.6451V29.6544H-0.714844V-1.70559Z"
                        fill="white"
                    />
                </mask>
                <g mask="url(#mask0_389_3636)">
                    <path
                        d="M26.1656 13.9749C26.1656 7.7893 21.1512 2.77488 14.9656 2.77488C8.78004 2.77488 3.76562 7.7893 3.76562 13.9749C3.76562 19.2274 7.38165 23.6347 12.26 24.845V17.3974H9.95044V13.9749H12.26V12.5001C12.26 8.68798 13.9851 6.92107 17.7277 6.92107C18.4373 6.92107 19.6616 7.06017 20.1625 7.19932V10.3019C19.8981 10.2741 19.439 10.2601 18.8685 10.2601C17.0321 10.2601 16.3225 10.9558 16.3225 12.7645V13.9749H19.9808L19.3523 17.3974H16.3225V25.0928C21.8681 24.423 26.1656 19.7011 26.1656 13.9749Z"
                        fill="#0866FF"
                    />
                    <path
                        d="M19.3511 17.3974L19.9796 13.9749H16.3213V12.7644C16.3213 10.9558 17.0308 10.2602 18.8673 10.2602C19.4378 10.2602 19.8969 10.274 20.1612 10.3019V7.19933C19.6604 7.06018 18.436 6.92103 17.7265 6.92103C13.9839 6.92103 12.2587 8.68799 12.2587 12.5001V13.9749H9.94922V17.3974H12.2587V24.845C13.1253 25.06 14.0314 25.1749 14.9644 25.1749C15.4238 25.1749 15.8764 25.1466 16.3213 25.0928V17.3974H19.3511Z"
                        fill="white"
                    />
                </g>
            </g>
            <defs>
                <clipPath id="clip0_389_3636">
                    <rect
                        width="22.4"
                        height="22.4"
                        fill="white"
                        transform="translate(3.76562 2.77499)"
                    />
                </clipPath>
            </defs>
        </svg>
    );
};

export const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="29"
            height="29"
            viewBox="0 0 29 29"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g clipPath="url(#clip0_389_3652)">
                <path
                    d="M22.673 11.3443C22.5431 11.4451 20.2493 12.7375 20.2493 15.6115C20.2493 18.9356 23.168 20.1116 23.2554 20.1407C23.2419 20.2124 22.7917 21.7513 21.7165 23.3193C20.7578 24.6991 19.7565 26.0767 18.2333 26.0767C16.7101 26.0767 16.3181 25.1919 14.5597 25.1919C12.8461 25.1919 12.2368 26.1059 10.8435 26.1059C9.45025 26.1059 8.47809 24.8291 7.36033 23.2611C6.06561 21.4198 5.01953 18.5593 5.01953 15.8444C5.01953 11.4899 7.85089 9.18042 10.6375 9.18042C12.1181 9.18042 13.3523 10.1526 14.2819 10.1526C15.1667 10.1526 16.5466 9.12218 18.2311 9.12218C18.8695 9.12218 21.1632 9.18042 22.673 11.3443ZM17.4314 7.27866C18.128 6.4521 18.6208 5.30522 18.6208 4.15834C18.6208 3.9993 18.6074 3.83802 18.5783 3.7081C17.4448 3.75066 16.0963 4.46298 15.2832 5.40602C14.6448 6.13178 14.049 7.27866 14.049 8.44122C14.049 8.61594 14.0781 8.79066 14.0915 8.84666C14.1632 8.8601 14.2797 8.87578 14.3962 8.87578C15.4131 8.87578 16.6922 8.19482 17.4314 7.27866Z"
                    fill="currentColor"
                />
            </g>
            <defs>
                <clipPath id="clip0_389_3652">
                    <rect
                        width="18.2336"
                        height="22.4"
                        fill="white"
                        transform="translate(5.01953 3.7081)"
                    />
                </clipPath>
            </defs>
        </svg>
    );
};

export const AuthIllustration = () => {
    return (
        <div className="relative flex min-h-80 flex-col items-start justify-end overflow-hidden rounded-2xl bg-black p-4 md:p-8">
            <div className="relative z-40 mb-2 flex items-center gap-2">
                <p className="rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                    Product Company
                </p>
                <p className="rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                    Cloud Management
                </p>
            </div>
            <div className="relative z-40 max-w-sm rounded-xl bg-black/50 p-4 backdrop-blur-sm">
                <h2 className="text-white">
                    Aceternity Pro Components have completely changed how we work. What
                    used to take hours every week is now fully automated.
                </h2>
                <p className="mt-4 text-sm text-white/50">Gina Clinton</p>
                <p className="mt-1 text-sm text-white/50">
                    Head of Product, <span className="font-bold">Acme Inc.</span>
                </p>
            </div>

            <div className="mask-r-from-50% absolute -top-48 -right-40 z-20 grid rotate-45 transform grid-cols-4 gap-32">
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
            </div>

            <div className="mask-r-from-50% absolute -top-0 -right-10 z-20 grid rotate-45 transform grid-cols-4 gap-32 opacity-50">
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
                <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
            </div>
            <MeshGradient className="mask-t-from-50% absolute inset-0 z-30 h-full w-200 blur-3xl" />
        </div>
    );
};

type MeshGradientProps = {
    className?: string;
    colors?: string[];
    speed?: number;
    resolutionScale?: number;
    paused?: boolean;
};

function resolveCssColorToRGB(color: string): [number, number, number] {
    const el = document.createElement("div");
    el.style.color = color;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return [241, 116, 99];
    return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
    ];
}

export const MeshGradient: React.FC<MeshGradientProps> = ({
    className,
    colors = ["var(--color-orange-500)", "#2762E7", "#3ECF8E", "#FFB86B"],
    speed = 1,
    resolutionScale = 1,
    paused = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const glCtx = canvas.getContext("webgl", {
            premultipliedAlpha: true,
            alpha: true,
        });
        if (!glCtx) return;
        const gl: WebGLRenderingContext = glCtx;

        const getDpr = () =>
            Math.min(window.devicePixelRatio || 1, 1.75) * resolutionScale;

        const vertexSrc = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

        const fragmentSrc = `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_colors[5];

      float hash(vec2 p) {
        p = fract(p*vec2(123.34, 456.21));
        p += dot(p, p+45.32);
        return fract(p.x*p.y);
      }

      void main() {
        vec2 uv = v_uv;
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time;
        vec2 p0 = 0.52 + 0.35*vec2(sin(0.7*t), cos(0.9*t));
        vec2 p1 = 0.48 + 0.35*vec2(sin(0.6*t+1.7), cos(0.8*t+2.3));
        vec2 p2 = 0.50 + 0.38*vec2(sin(0.9*t+0.7), cos(0.7*t+1.7));
        vec2 p3 = 0.46 + 0.33*vec2(sin(0.5*t+2.9), cos(1.1*t+0.2));
        vec2 p4 = 0.50 + 0.30*vec2(sin(0.8*t-1.4), cos(0.6*t-0.9));

        vec2 m = u_mouse * 0.12;
        p0 += m; p1 -= m; p2 += m*0.5; p3 -= m*0.5; p4 += m*0.3;

        float d0 = distance(uv, p0);
        float d1 = distance(uv, p1);
        float d2 = distance(uv, p2);
        float d3 = distance(uv, p3);
        float d4 = distance(uv, p4);

        float w0 = smoothstep(0.85, 0.05, d0);
        float w1 = smoothstep(0.85, 0.05, d1);
        float w2 = smoothstep(0.90, 0.05, d2);
        float w3 = smoothstep(0.95, 0.05, d3);
        float w4 = smoothstep(0.90, 0.05, d4);

        vec3 col = vec3(0.0);
        col += u_colors[0] * w0;
        col += u_colors[1] * w1;
        col += u_colors[2] * w2;
        col += u_colors[3] * w3;
        col += u_colors[4] * w4;

        float wsum = w0 + w1 + w2 + w3 + w4 + 1e-3;
        col /= wsum;

        float g = hash(uv * u_resolution * 0.5 + u_time);
        col += (g - 0.5) * 0.02;

        float vign = smoothstep(1.1, 0.35, length(uv - vec2(0.5)));
        col *= vign;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

        function compile(type: number, src: string) {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader compile error", gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vs = compile(gl.VERTEX_SHADER, vertexSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
        if (!vs || !fs) return;

        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error", gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, "u_resolution");
        const uTime = gl.getUniformLocation(program, "u_time");
        const uMouse = gl.getUniformLocation(program, "u_mouse");
        const uColors = gl.getUniformLocation(program, "u_colors");

        const parseColors = () => {
            const resolved = [...colors];
            while (resolved.length < 5)
                resolved.push(resolved[resolved.length - 1] ?? "#ffffff");
            const rgb = resolved.slice(0, 5).map((c) => {
                const [r, g, b] = resolveCssColorToRGB(c);
                return [r / 255, g / 255, b / 255] as [number, number, number];
            });
            return rgb.flat();
        };

        let mouse: { x: number; y: number } = { x: 0.0, y: 0.0 };
        const handleMouse = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            mouse.x = x * 2.0 - 1.0;
            mouse.y = 1.0 - y * 2.0;
        };
        window.addEventListener("mousemove", handleMouse);

        const prefersReduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const resize = () => {
            const dpr = getDpr();
            const { clientWidth, clientHeight } = canvas;
            const w = Math.max(1, Math.floor(clientWidth * dpr));
            const h = Math.max(1, Math.floor(clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
        };
        resize();
        window.addEventListener("resize", resize);

        const colorArray = new Float32Array(parseColors());
        gl.uniform3fv(uColors, colorArray);

        let start = performance.now();
        const loop = () => {
            const now = performance.now();
            const t =
                ((now - start) / 1000) * (paused || prefersReduced ? 0.0 : speed);
            gl.uniform1f(uTime, t);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouse);
            gl.useProgram(null);
            gl.deleteProgram(program);
            gl.deleteShader(vs!);
            gl.deleteShader(fs!);
            gl.deleteBuffer(buffer);
        };
    }, [colors, speed, resolutionScale, paused]);

    return <canvas ref={canvasRef} className={cn("h-full w-full", className)} />;
};
