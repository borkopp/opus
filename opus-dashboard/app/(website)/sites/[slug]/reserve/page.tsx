import { notFound, redirect } from "next/navigation";
import {
  centralReservationUrl,
  getTenantReservationVenue,
} from "@/lib/reservation-server";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const venue = await getTenantReservationVenue((await params).slug);
  return {
    title: venue ? `Reserve a table · ${venue.name}` : "Page unavailable",
    robots: { index: false, follow: false },
  };
}

export default async function TenantReservationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await getTenantReservationVenue(slug);
  if (!venue) notFound();
  redirect(await centralReservationUrl(slug));
}
