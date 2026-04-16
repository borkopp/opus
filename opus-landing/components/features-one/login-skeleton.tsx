"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function LoginSkeleton({ className }: { className?: string }) {
  return (
    <div className="h-full w-full mask-b-from-50% p-4 md:p-8">
      <div className={cn("relative", className)}>
        <GridLineHorizontal className="top-0" offset="40px" />
        <GridLineHorizontal className="top-auto bottom-0" offset="40px" />
        <GridLineVertical className="left-0" offset="40px" />
        <GridLineVertical className="right-0 left-auto" offset="40px" />

        <div className="w-full px-6 py-6">
          <div className="flex flex-col items-center gap-4">
            <LoginLogo />

            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="skeleton-email"
                  className="text-[8px] font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email
                </label>
                <input
                  id="skeleton-email"
                  name="skeleton-demo-email"
                  type="text"
                  autoComplete="one-time-code"
                  data-form-type="other"
                  placeholder="you@example.com"
                  className="w-full rounded-md bg-white px-2 py-1.5 text-[8px] text-neutral-700 shadow-sm ring-1 shadow-black/10 ring-black/10 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-200 dark:shadow-white/5 dark:ring-white/10 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="skeleton-password"
                  className="text-[8px] font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
                <input
                  id="skeleton-password"
                  name="skeleton-demo-password"
                  type="password"
                  autoComplete="new-password"
                  data-form-type="other"
                  placeholder="••••••••"
                  className="w-full rounded-md bg-white px-2 py-1.5 text-[8px] text-neutral-700 shadow-sm ring-1 shadow-black/10 ring-black/10 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-200 dark:shadow-white/5 dark:ring-white/10 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    className="size-2.5 cursor-pointer rounded-sm accent-neutral-700"
                  />
                  <span className="text-[7px] text-neutral-600 dark:text-neutral-400">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-[7px] text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="button"
                className="w-full rounded-md bg-linear-to-b from-neutral-700 to-neutral-950 px-3 py-2 text-center text-[8px] font-semibold text-white transition-all hover:from-neutral-600 hover:to-neutral-900 active:scale-[0.98] dark:from-neutral-600 dark:to-neutral-900 dark:hover:from-neutral-500 dark:hover:to-neutral-800"
                style={{
                  boxShadow:
                    "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                Sign in
              </button>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-[7px] text-neutral-400 dark:text-neutral-500">
                  or continue with
                </span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white py-1.5 shadow-sm ring-1 shadow-black/5 ring-black/10 transition-all hover:bg-neutral-50 active:scale-[0.98] dark:bg-neutral-800 dark:ring-white/10 dark:hover:bg-neutral-700"
                >
                  <svg className="size-2.5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      className="fill-[#4285F4]"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      className="fill-[#34A853]"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      className="fill-[#FBBC05]"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      className="fill-[#EA4335]"
                    />
                  </svg>
                  <span className="text-[7px] font-medium text-neutral-700 dark:text-neutral-300">
                    Google
                  </span>
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white py-1.5 shadow-sm ring-1 shadow-black/5 ring-black/10 transition-all hover:bg-neutral-50 active:scale-[0.98] dark:bg-neutral-800 dark:ring-white/10 dark:hover:bg-neutral-700"
                >
                  <svg
                    className="size-2.5 text-neutral-900 dark:text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="text-[7px] font-medium text-neutral-700 dark:text-neutral-300">
                    GitHub
                  </span>
                </button>
              </div>

              <p className="text-center text-[7px] text-neutral-500 dark:text-neutral-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  Sign up
                </button>
              </p>
            </div>

            <TestimonialCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard() {
  return (
    <div className="mt-2 w-full rounded-xl bg-white p-4 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
      <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        &ldquo;Setting up auth took us 10 minutes instead of 2 weeks. The SDK
        just works out of the box with zero configuration. Our team shipped the
        entire login flow before lunch. Best developer experience we&apos;ve
        had.&rdquo;
      </p>
      <div className="mt-3 flex items-center gap-2">
        <img
          src="https://assets.aceternity.com/avatars/1.webp"
          alt="Sarah Chen"
          className="size-5 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            Sarah Chen
          </span>
          <span className="text-[8px] text-neutral-500 dark:text-neutral-400">
            CTO at TechFlow
          </span>
        </div>
      </div>
    </div>
  );
}

function LoginLogo() {
  return (
    <a href="#" className="flex items-center gap-1.5">
      <div className="relative flex size-5 items-center justify-center rounded-md">
        <img
          src="https://assets.aceternity.com/logo.png"
          height={20}
          width={20}
          alt="Logo"
        />
      </div>
      <span className="text-xs font-semibold text-neutral-900 dark:text-white">
        Nexus
      </span>
    </a>
  );
}

function GridLineHorizontal({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) {
  return (
    <div
      style={
        {
          "--background": "#ffffff",
          "--height": "1px",
          "--width": "5px",
          "--fade-stop": "90%",
          "--offset": offset || "200px",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "[--color-dark:var(--color-neutral-800)] [--color:var(--color-neutral-400)]",
        "absolute left-[calc(var(--offset)/2*-1)] h-(--height) w-[calc(100%+var(--offset))]",
        "bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "bg-size-[var(--width)_var(--height)]",
        "[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),linear-gradient(black,black)]",
        "mask-exclude",
        "z-30",
        "dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className,
      )}
    />
  );
}

function GridLineVertical({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) {
  return (
    <div
      style={
        {
          "--background": "#ffffff",
          "--height": "5px",
          "--width": "1px",
          "--fade-stop": "90%",
          "--offset": offset || "150px",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "[--color-dark:var(--color-neutral-800)] [--color:var(--color-neutral-400)]",
        "absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-(--width)",
        "bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "bg-size-[var(--width)_var(--height)]",
        "[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),linear-gradient(black,black)]",
        "mask-exclude",
        "z-30",
        "dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className,
      )}
    />
  );
}
