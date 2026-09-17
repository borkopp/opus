import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecoveryOfferBooking } from "@/components/public-site/RecoveryOfferBooking";
import { BookingForm } from "@/components/public-site/BookingForm";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
import { getPublicSite } from "@/lib/public-site-server";
import { tenantSiteUrl } from "@/lib/tenant-sites";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
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
    title: `Резервирај термин во ${site.name}`,
    description: `Изберете услуга и слободен термин во ${site.name}.`,
    robots: { index: !query.offer, follow: !query.offer },
    ...(query.offer ? { referrer: "no-referrer" as const } : {}),
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

  const offerToken = typeof query.offer === "string" ? query.offer : undefined;
  const requestedService = Array.isArray(query.service)
    ? query.service[0]
    : query.service;
  const requestedStaff = Array.isArray(query.staff)
    ? query.staff[0]
    : query.staff;

  return (
    <PublicSiteFrame site={site} mode="booking">
      {offerToken ? (
        <RecoveryOfferBooking site={site} token={offerToken} />
      ) : (
        <BookingForm
          site={site}
          initialServiceId={requestedService}
          initialStaffId={requestedStaff}
        />
      )}
    </PublicSiteFrame>
  );
}
