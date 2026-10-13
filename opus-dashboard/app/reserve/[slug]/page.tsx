import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReservationVenue } from "@/lib/reservation-server";
import { ReservationForm } from "@/components/reservations/public/ReservationForm";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const venue = await getReservationVenue((await params).slug);
  return {
    title: venue
      ? `${venue.acceptingReservations ? "Reserve a table" : "Reservations unavailable"} · ${venue.name}`
      : "Page unavailable",
    description: venue
      ? venue.acceptingReservations
        ? "Choose a time and reserve your table."
        : "Contact the venue to arrange a visit."
      : undefined,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const venue = await getReservationVenue(slug);
  if (!venue) notFound();
  return (
    <ReservationForm
      venue={venue}
      initialDate={typeof query.date === "string" ? query.date : undefined}
      initialPartySize={Number(query.partySize) || undefined}
      initialStartAt={Number(query.at) || undefined}
    />
  );
}
