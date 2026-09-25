import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuickBooking } from "@/components/bookings/QuickBookingProvider";
import type { OverviewData } from "@/lib/dashboard-overview";
import { OpenSlotsCard } from "./OpenSlotsCard";
import { useRouter } from "next/navigation";
export function OpenSlotsWidget({
  orgId,
  data,
}: {
  orgId: Id<"orgs">;
  data: OverviewData;
}) {
  const { openQuickBooking } = useQuickBooking();
  const router = useRouter();
  const date = new Date(data.today).toISOString().slice(0, 10);
  const result = useQuery(api.slots.getQuickBookingSlots, { orgId, date });
  const available =
    result?.slots.filter(
      (slot) => !slot.isFallback && slot.startAt >= data.now,
    ) ?? [];
  return (
    <OpenSlotsCard
      loaded={result !== undefined}
      available={available}
      staff={data.staff}
      onBook={(slot) => openQuickBooking({ slot, date })}
      onShare={(slot) =>
        router.push(
          `/beauty/promote?${new URLSearchParams({ tab: "opening", date, staff: slot.staffId, at: String(slot.startAt) })}`,
        )
      }
    />
  );
}
