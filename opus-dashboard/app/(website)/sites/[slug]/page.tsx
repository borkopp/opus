import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
import { StudioWebsite } from "@/components/public-site/StudioWebsite";
import { getPublicSite } from "@/lib/public-site-server";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { PublishedWebsite } from "@/components/website/PublishedWebsite";
import {
  resolveWebsiteLocale,
  translatedWebsiteText,
} from "../../../../../shared/website-design";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) {
    return {
      title: "Website unavailable",
      robots: { index: false, follow: false },
    };
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
  const canonical = tenantSiteUrl(site.slug, rootDomain);
  const query = await searchParams;
  const locale = site.design
    ? resolveWebsiteLocale(
        site.design,
        typeof query.lang === "string"
          ? query.lang
          : site.design.primaryLanguage,
      )
    : "mk";
  const cover =
    site.media.find((item) => item._id === site.design?.hero.imageId) ??
    site.media.find((item) => item.type === "cover");
  const source = site.design?.content.heroDescription || site.tagline || "";
  const description = site.design
    ? translatedWebsiteText(
        site.design,
        locale,
        "content.heroDescription",
        source,
      ) ||
      {
        mk: `Резервирајте слободен термин во ${site.name}.`,
        en: `Book an appointment at ${site.name}.`,
        sq: `Rezervoni një termin te ${site.name}.`,
      }[locale]
    : source || `Резервирајте слободен термин во ${site.name}.`;

  return {
    title: site.name,
    description,
    alternates: {
      canonical,
      languages: site.design
        ? Object.fromEntries(
            site.design.languages.map((language) => [
              language,
              `${canonical}?lang=${language}`,
            ]),
          )
        : undefined,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: site.name,
      description,
      images: cover ? [{ url: cover.url }] : undefined,
    },
  };
}

export default async function PublicStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) notFound();
  if (site.design) {
    const query = await searchParams;
    const locale = resolveWebsiteLocale(
      site.design,
      typeof query.lang === "string" ? query.lang : await getRequestLocale(),
    );
    return (
      <PublishedWebsite site={site} design={site.design} locale={locale} />
    );
  }

  return (
    <PublicSiteFrame site={site}>
      <StudioWebsite site={site} />
    </PublicSiteFrame>
  );
}
