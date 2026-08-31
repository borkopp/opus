import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/public-site/BookingForm";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
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
      title: "Booking unavailable",
      robots: { index: false, follow: false },
    };
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
  const canonical = `${tenantSiteUrl(site.slug, rootDomain)}/book`;

  return {
    title: `Book at ${site.name}`,
    description: `Choose a service and an available appointment at ${site.name}.`,
    robots: { index: true, follow: true },
    alternates: { canonical },
  };
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const site = await getPublicSite(slug);
  if (!site) notFound();

  const requestedService = Array.isArray(query.service)
    ? query.service[0]
    : query.service;

  return (
    <PublicSiteFrame site={site}>
      <BookingForm site={site} initialServiceId={requestedService} />
    </PublicSiteFrame>
  );
}
