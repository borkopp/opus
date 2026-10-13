import { ReservationWorkspace } from "@/components/reservations/ReservationWorkspace";

export default async function HospitalityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <ReservationWorkspace initialDate={date} />;
}
