"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageToggle } from "./language-toggle";

export function SiteHeader() {
  const { messages, t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const links = [
    { href: "/#features", label: t.nav.features },
    { href: "/#intelligence", label: t.nav.ai },
    { href: "/#how-it-works", label: t.nav.howItWorks },
    { href: "/#pricing", label: t.nav.pricing },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header className="header">
      <Link className="brand" href="/" aria-label="OPUS home">
        <img
          className="opus-mark"
          src="/assets/opus-mark.svg"
          alt=""
          width="40"
          height="48"
        />
        <span className="opus-wordmark">OPUS</span>
      </Link>
      <nav className="desktop-nav" aria-label={messages.accessibility.openMenu}>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
            {link.href === "/#intelligence" && (
              <>
                {" "}
                <span className="tiny-pill">{t.nav.newBadge}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
      <div className="nav-actions">
        <LanguageToggle />
        <a className="login" href="https://studio.opus.mk/login">
          {t.nav.login}
        </a>
        <a
          className="button button-dark button-small"
          href="https://studio.opus.mk/signup"
        >
          {t.nav.startFree}{" "}
          <span>
            <ArrowUpRight aria-hidden="true" />
          </span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={
            open
              ? messages.accessibility.closeMenu
              : messages.accessibility.openMenu
          }
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      <nav
        id="mobile-nav"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
        onClick={() => setOpen(false)}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href="https://studio.opus.mk/login">{t.nav.login}</a>
        <div
          className="mobile-locale-toggle"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{t.nav.language}</span>
          <LanguageToggle />
        </div>
      </nav>
    </header>
  );
}
