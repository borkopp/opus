import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/legal/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const document = getLegalDocument(locale, "terms");

  return pageMetadata({
    locale,
    path: "/terms",
    title: `${document.title} — OPUS`,
    description: document.description,
  });
}

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return (
    <div lang={locale}>
      <LegalDocument document={getLegalDocument(locale, "terms")} />
    </div>
  );
}
