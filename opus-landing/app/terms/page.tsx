import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const document = getLegalDocument(locale, "terms");

  return {
    title: `${document.title} — OPUS`,
    description: document.description,
    alternates: { canonical: "https://opus.mk/terms" },
    openGraph: {
      title: `${document.title} — OPUS`,
      description: document.description,
      type: "website",
    },
  };
}

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return <LegalDocument document={getLegalDocument(locale, "terms")} />;
}
