"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, ArrowUp } from "lucide-react";
import Link from "next/link";
import { openCookiePreferences } from "../../../shared/analytics/consent";
import { useI18n } from "@/lib/i18n/context";

export function SiteFooter() {
  const { t } = useI18n();

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
            {t.footer.sloganLine1}
            <br />
            {t.footer.sloganLine2}
          </p>
        </div>
        <div className="footer-links">
          <b>{t.footer.meetOpus}</b>
          <Link href="/#features">{t.footer.features}</Link>
          <Link href="/#intelligence">{t.footer.intelligence}</Link>
          <Link href="/#pricing">{t.footer.pricing}</Link>
        </div>
        <div className="footer-links">
          <b>{t.footer.nextChapter}</b>
          <Link href="/#how-it-works">{t.footer.howItWorks}</Link>
          <Link href="/#faq">{t.footer.faq}</Link>
          <a href="https://studio.opus.mk/signup">
            {t.footer.createWebsite} <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <div className="footer-statement">
          <h3>{t.footer.madeForYou}</h3>
          <p>
            {t.footer.madeForYouSub1}
            <br />
            {t.footer.madeForYouSub2}
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{t.footer.copyright}</span>
        <span>{t.footer.tagline}</span>
        <div className="footer-legal">
          <Link href="/contact">{t.footer.contact}</Link>
          <Link href="/privacy">{t.footer.privacy}</Link>
          <Link href="/terms">{t.footer.terms}</Link>
          <button type="button" onClick={openCookiePreferences}>
            {t.footer.cookieSettings}
          </button>
          <Link href="/#">
            {t.footer.backToTop} <ArrowUp aria-hidden="true" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
