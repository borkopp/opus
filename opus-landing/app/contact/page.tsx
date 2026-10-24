import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ContactDetails } from "./_components/contact-details";
import { ContactForm } from "./_components/contact-form";
import { ContactHero } from "./_components/contact-hero";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return pageMetadata({
    locale,
    path: "/contact",
    title: messages.metadata.contact.title,
    description: messages.metadata.contact.description,
  });
}

export default function ContactPage() {
  return (
    <main id="main" className="contact-page">
      <ContactHero />
      <section className="contact-content" aria-label="Get in touch with OPUS">
        <div className="contact-grid">
          <ContactDetails />
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
