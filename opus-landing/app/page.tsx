import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { HomeContent } from "./_components/home-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return {
    title: messages.metadata.home.title,
    description: messages.metadata.home.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: messages.metadata.home.title,
      description: messages.metadata.home.description,
      siteName: "OPUS",
      type: "website",
      images: [
        {
          url: "/assets/opus-cta-wide.jpg",
          width: 2172,
          height: 724,
          alt: "OPUS",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: messages.metadata.home.title,
      description: messages.metadata.home.description,
      images: ["/assets/opus-cta-wide.jpg"],
    },
  };
}

export default function HomePage() {
  return <HomeContent />;
}
