"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";

import { useEffect, useState } from "react";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#intelligence", label: "OPUS AI" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

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
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
            {link.label === "OPUS AI" && (
              <>
                {" "}
                <span className="tiny-pill">NEW</span>
              </>
            )}
          </Link>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="login" href="https://studio.opus.mk/login">
          Log in
        </a>
        <a
          className="button button-dark button-small"
          href="https://studio.opus.mk/signup"
        >
          Start for free <span><ArrowUpRight aria-hidden="true" /></span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
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
        <a href="https://studio.opus.mk/login">Log in</a>
      </nav>
    </header>
  );
}
