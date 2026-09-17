"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, ArrowUp } from "lucide-react";
import Link from "next/link";
import { openCookiePreferences } from "../../../shared/analytics/consent";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <Link className="brand" href="/">
            <img
              className="opus-mark"
              src="/assets/opus-mark.svg"
              alt=""
              width="40"
              height="48"
            />
            <span className="opus-wordmark">OPUS</span>
          </Link>
          <p>
            A little more time
            <br />
            for what you love.
          </p>
        </div>
        <div className="footer-links">
          <b>Meet OPUS</b>
          <Link href="/#features">Features</Link>
          <Link href="/#intelligence">OPUS Intelligence</Link>
          <Link href="/#pricing">Pricing</Link>
        </div>
        <div className="footer-links">
          <b>Your next chapter</b>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#faq">Common questions</Link>
          <a href="https://studio.opus.mk/signup">Create your website <ArrowUpRight aria-hidden="true" /></a>
        </div>
        <div className="footer-statement">
          <h3>Made for you.</h3>
          <p>
            Thoughtfully built for beauty
            <br />
            businesses in Macedonia.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 OPUS. A little more possibility.</span>
        <span>Beauty is your business. Simplicity is ours.</span>
        <div className="footer-legal">
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <button type="button" onClick={openCookiePreferences}>
            Cookie settings
          </button>
          <Link href="/#">Back to top <ArrowUp aria-hidden="true" /></Link>
        </div>
      </div>
    </footer>
  );
}
