import Link from "next/link";
import React from "react";
import { Logo } from "./logo";

export function Footer() {
  const pages = [
    {
      title: "Платформа",
      href: "/#product",
    },
    {
      title: "Контакт",
      href: "/contact",
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
      title: "Отворете OPUS",
      href: "https://studio.opus.mk",
    },
    {
      title: "Најава",
      href: "https://studio.opus.mk",
    },
  ];

  return (
    <div className="border-border bg-background relative w-full overflow-hidden border-t px-8 pt-20">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-start justify-between text-sm sm:flex-row md:px-8">
        <div>
          <Link href="/" className="mr-0 mb-4 md:mr-4 md:flex">
            <Logo className="text-6xl" />
          </Link>

          <div className="text-muted-foreground mt-4 ml-2">
            &copy; Copyright OPUS 2026. Сите права задржани.
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0 md:mt-0 lg:grid-cols-4">
          <div className="flex w-full flex-col justify-center gap-4">
            <p className="text-[10px] font-bold tracking-widest text-white uppercase">
              Страници
            </p>
            <ul className="text-muted-foreground flex list-none flex-col gap-4 transition-colors">
              {pages.map((page, idx) => (
                <li key={"pages" + idx} className="list-none">
                  <Link
                    className="hover:text-foreground transition-colors"
                    href={page.href}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* <div className="flex flex-col justify-center gap-4">
            <p className="text-[10px] font-bold tracking-widest text-white uppercase">
              Социјални мрежи
            </p>
            <ul className="flex list-none flex-col gap-4 text-muted-foreground transition-colors">
              {socials.map((social, idx) => (
                <li key={"social" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-foreground"
                    href={social.href}
                  >
                    {social.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          <div className="flex flex-col justify-center gap-4">
            <p className="text-[10px] font-bold tracking-widest text-white uppercase">
              Правно
            </p>
            <ul className="text-muted-foreground flex list-none flex-col gap-4 transition-colors">
              {legals.map((legal, idx) => (
                <li key={"legal" + idx} className="list-none">
                  <Link
                    className="hover:text-foreground transition-colors"
                    href={legal.href}
                  >
                    {legal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-foreground hover:text-primary text-[10px] font-bold tracking-widest uppercase transition-colors">
              Најава
            </p>
            <ul className="text-muted-foreground flex list-none flex-col gap-4 transition-colors">
              {signups.map((auth, idx) => (
                <li key={"auth" + idx} className="list-none">
                  <Link
                    className="hover:text-foreground transition-colors"
                    href={auth.href}
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
          className="absolute inset-x-0 top-0 w-full text-center leading-none font-bold text-transparent"
          style={{
            fontSize: "clamp(3rem, 18vw, 20rem)",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ WebkitTextStroke: "1px var(--border)" }}>OPUS</span>
        </p>
      </div>
    </div>
  );
}
