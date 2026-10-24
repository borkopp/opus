import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { homeStructuredData, pageMetadata } from "@/lib/seo";
import { HomeContent } from "./_components/home-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return pageMetadata({
    locale,
    path: "/",
    ...getMessages(locale).metadata.home,
  });
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const data = homeStructuredData(
    locale,
    getMessages(locale).metadata.home.description,
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(data).replace(/</g, "\\u003c"),
        }}
      />
      <HomeContent />
    </>
  );
}
