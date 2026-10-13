import type { Metadata } from "next";
import type { Id } from "@/convex/_generated/dataModel";
import { ReservationManagement } from "@/components/reservations/public/ReservationManagement";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Manage reservation",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ReservationManagementPage({
  params,
}: {
  params: Promise<{ slug: string; reservationId: string }>;
}) {
  const { slug, reservationId } = await params;
  return (
    <ReservationManagement
      slug={slug}
      reservationId={reservationId as Id<"reservations">}
    />
  );
}
