"use client";
import { IconBrandGoogle, IconBrandApple } from "@tabler/icons-react";
import { Button } from "@/components/button";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-neutral-900 dark:text-white">
          Sign in to your account
        </h1>
        <p className="mb-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Welcome back! Please enter your details.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="block w-full rounded-lg bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm ring-1 shadow-black/10 ring-black/10 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-white dark:ring-white/10 dark:placeholder:text-neutral-500 dark:focus:ring-white/30"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <Link
                href="#"
                className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="block w-full rounded-lg bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm ring-1 shadow-black/10 ring-black/10 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-white dark:ring-white/10 dark:placeholder:text-neutral-500 dark:focus:ring-white/30"
            />
          </div>

          <Button type="submit" className="w-full py-2.5 text-sm">
            Sign in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--color-neutral-300)_0px,var(--color-neutral-300)_4px,transparent_4px,transparent_8px)] dark:bg-[repeating-linear-gradient(90deg,var(--color-neutral-700)_0px,var(--color-neutral-700)_4px,transparent_4px,transparent_8px)]" />
          <span className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
            or
          </span>
          <div className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--color-neutral-300)_0px,var(--color-neutral-300)_4px,transparent_4px,transparent_8px)] dark:bg-[repeating-linear-gradient(90deg,var(--color-neutral-700)_0px,var(--color-neutral-700)_4px,transparent_4px,transparent_8px)]" />
        </div>

        <div className="flex flex-col gap-y-3">
          <Button variant="outline" className="w-full gap-3 py-2.5 text-sm">
            <IconBrandGoogle className="h-5 w-5" />
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full gap-3 py-2.5 text-sm">
            <IconBrandApple className="h-5 w-5" />
            Continue with Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Don&apos;t have an account?{" "}
          <Link
            href="#"
            className="font-medium text-neutral-900 hover:underline dark:text-white"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-neutral-900 dark:text-white"
    >
      <Image
        src="https://assets.aceternity.com/logo.png"
        alt="Logo"
        width={24}
        height={24}
        className="size-6"
      />
      <span className="text-lg font-semibold">Simplistic</span>
    </Link>
  );
}
