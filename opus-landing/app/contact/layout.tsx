import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const contact = getMessages(locale).metadata.contact;

  return {
    title: contact.title,
    description: contact.description,
    openGraph: {
      title: contact.title,
      description: contact.description,
      type: "website",
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
