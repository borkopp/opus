/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

export function ContactDetails() {
  return (
    <aside className="contact-details" aria-labelledby="contact-details-title">
      <img
        className="contact-portrait"
        src="/assets/opus-contact-portrait.png"
        alt=""
        width="1024"
        height="1536"
      />
      <div className="contact-details-copy">
        <h2 id="contact-details-title">Let’s talk.</h2>
        <dl className="contact-channels">
          <div>
            <dt><Mail aria-hidden="true" /> Prefer email?</dt>
            <dd><a href="mailto:hello@opus.mk">hello@opus.mk <ArrowUpRight aria-hidden="true" /></a></dd>
          </div>
          <div>
            <dt><Phone aria-hidden="true" /> Give us a call</dt>
            <dd><a href="tel:+38977826333">+389 77 826 333 <ArrowUpRight aria-hidden="true" /></a></dd>
          </div>
          <div>
            <dt><MapPin aria-hidden="true" /> A little closer to home</dt>
            <dd>Skopje, North Macedonia</dd>
          </div>
        </dl>
        <Link href="/#faq" className="contact-faq-link">
          Explore common questions <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
