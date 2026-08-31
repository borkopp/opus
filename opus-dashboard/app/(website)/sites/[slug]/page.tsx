import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
import { StudioWebsite } from "@/components/public-site/StudioWebsite";
import { getPublicSite } from "@/lib/public-site-server";
import { tenantSiteUrl } from "@/lib/tenant-sites";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
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
  const cover = site.media.find((item) => item.type === "cover");
  const description = site.tagline || `Book an appointment with ${site.name}.`;

  return {
    title: site.name,
    description,
    alternates: { canonical },
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) notFound();

  return (
    <PublicSiteFrame site={site}>
      <StudioWebsite site={site} />
    </PublicSiteFrame>
  );
}
