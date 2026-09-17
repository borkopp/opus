import type { Metadata } from "next";
import { ContactDetails } from "./_components/contact-details";
import { ContactForm } from "./_components/contact-form";

export const metadata: Metadata = {
  title: "Contact OPUS — A little help for your studio.",
  description: "Have a question about OPUS? Get in touch for help with your booking website, your team, or getting your studio started.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact OPUS — A little help for your studio.",
    description: "Getting started or finding your feet? We’re here for your studio.",
    url: "/contact",
    images: ["/assets/opus-contact-portrait.png"],
  },
};

export default function ContactPage() {
  return (
    <main id="main" className="contact-page">
      <section className="contact-hero" aria-labelledby="contact-title">
        <div className="contact-intro">
          <h1 id="contact-title">A little help.<br />A real conversation.</h1>
          <p>
            Getting started, finding your feet, or planning your next chapter?
            <br className="desktop-break" /> We’re here for your studio.
          </p>
        </div>
      </section>
      <section className="contact-content" aria-label="Get in touch with OPUS">
        <div className="contact-grid">
          <ContactDetails />
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
