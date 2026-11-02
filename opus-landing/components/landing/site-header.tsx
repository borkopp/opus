"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LocalizedLink as Link } from "@/components/landing/localized-link";
import { useBillingCurrency } from "@/components/pricing/billing-currency-provider";
import { trialSignupUrl } from "@/lib/pro-pricing";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageToggle } from "./language-toggle";

export function SiteHeader() {
  const { currency } = useBillingCurrency();
  const { messages, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setInstant(true);
      setOpen(false);
      toggleRef.current?.focus();
    };
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", closeOutside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  const links = [
    { href: "/#features", label: t.nav.features },
    { href: "/#intelligence", label: t.nav.ai },
    { href: "/#how-it-works", label: t.nav.howItWorks },
    { href: "/pricing", label: t.nav.pricing },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header
      ref={headerRef}
      className="header"
      data-menu-open={open}
      data-menu-instant={instant}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
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
          href={trialSignupUrl(currency)}
        >
          {t.nav.startFree}{" "}
          <span>
            <ArrowUpRight aria-hidden="true" />
          </span>
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-label={
            open
              ? messages.accessibility.closeMenu
              : messages.accessibility.openMenu
          }
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={(event) => {
            setInstant(event.detail === 0);
            setOpen((current) => !current);
          }}
        >
          <Menu className="menu-icon-open" aria-hidden="true" />
          <X className="menu-icon-close" aria-hidden="true" />
        </button>
      </div>
      <nav
        id="mobile-nav"
        className="mobile-nav"
        aria-label="Mobile navigation"
        inert={!open}
        aria-hidden={!open}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setOpen(false);
        }}
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
