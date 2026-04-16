import Image from "next/image";
import Link from "next/link";
import React from "react";
import { ModeToggle } from "./mode-toggle";

export function Footer() {
  const pages = [
    {
      title: "Платформа",
      href: "#",
    },
    {
      title: "Можности",
      href: "#",
    },
    {
      title: "Интеграции",
      href: "#",
    },
    {
      title: "Цени",
      href: "#",
    },
    {
      title: "Блог",
      href: "#",
    },
  ];

  const socials = [
    {
      title: "Twitter",
      href: "#",
    },
    {
      title: "LinkedIn",
      href: "#",
    },
    {
      title: "GitHub",
      href: "#",
    },
    {
      title: "Discord",
      href: "#",
    },
  ];
  const legals = [
    {
      title: "Политика за приватност",
      href: "#",
    },
    {
      title: "Услови за користење",
      href: "#",
    },
    {
      title: "Политика за колачиња",
      href: "#",
    },
  ];

  const signups = [
    {
      title: "Започнете",
      href: "#",
    },
    {
      title: "Најава",
      href: "#",
    },
    {
      title: "Упатства",
      href: "#",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden border-t border-neutral-100 bg-white px-8 pt-20 dark:border-white/10 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between text-sm text-neutral-500 sm:flex-row md:px-8">
        <div>
          <div className="mr-0 mb-4 md:mr-4 md:flex">
            <Logo />
          </div>

          <div className="mt-4 ml-2 flex items-center gap-4">
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              aria-label="Twitter"
            >
              <TwitterIcon className="size-5" />
            </Link>
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              aria-label="LinkedIn"
            >
              <LinkedInIcon className="size-5" />
            </Link>
            <ModeToggle />
          </div>

          <div className="mt-4 ml-2 text-neutral-500 dark:text-neutral-400">
            &copy; copyright OPUS 2026. Сите права задржани.
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0 md:mt-0 lg:grid-cols-4">
          <div className="flex w-full flex-col justify-center gap-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-white">
              Pages
            </p>
            <ul className="flex list-none flex-col gap-4 text-neutral-600 transition-colors dark:text-neutral-300">
              {pages.map((page, idx) => (
                <li key={"pages" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-neutral-800 dark:hover:text-white"
                    href="#"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-white">
              Socials
            </p>
            <ul className="flex list-none flex-col gap-4 text-neutral-600 transition-colors dark:text-neutral-300">
              {socials.map((social, idx) => (
                <li key={"social" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-neutral-800 dark:hover:text-white"
                    href="#"
                  >
                    {social.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-white">
              Legal
            </p>
            <ul className="flex list-none flex-col gap-4 text-neutral-600 transition-colors dark:text-neutral-300">
              {legals.map((legal, idx) => (
                <li key={"legal" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-neutral-800 dark:hover:text-white"
                    href="#"
                  >
                    {legal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-white">
              Register
            </p>
            <ul className="flex list-none flex-col gap-4 text-neutral-600 transition-colors dark:text-neutral-300">
              {signups.map((auth, idx) => (
                <li key={"auth" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-neutral-800 dark:hover:text-white"
                    href="#"
                  >
                    {auth.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="relative mt-20 h-[calc(clamp(3rem,18vw,20rem)*0.75)] w-full overflow-hidden">
        <p
          className="absolute inset-x-0 top-0 w-full text-center leading-none font-bold text-transparent dark:block"
          style={{
            fontSize: "clamp(3rem, 18vw, 20rem)",
            letterSpacing: "-0.02em",
          }}
        >
          <span
            className="dark:hidden"
            style={{ WebkitTextStroke: "1px var(--color-neutral-200)" }}
          >
            OPUS
          </span>
          <span
            className="hidden dark:inline"
            style={{ WebkitTextStroke: "1px var(--color-neutral-700)" }}
          >
            OPUS
          </span>
        </p>
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal"
    >
      <Image
        src="https://assets.aceternity.com/logo-dark.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">OPUS</span>
    </Link>
  );
};

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
