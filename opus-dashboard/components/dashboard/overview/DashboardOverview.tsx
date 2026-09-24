"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useQuickBooking } from "@/components/bookings/QuickBookingProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { WebsiteBanner } from "../WebsiteBanner";
import { OverviewLayout } from "./OverviewLayout";
import { OpenSlotsWidget } from "./widgets/OpenSlotsWidget";
import { AssistantWidget } from "./widgets/AssistantWidget";
import { RecoveryWidget } from "./widgets/RecoveryWidget";

export function DashboardOverview() {
  const { data, isUpdating, utilisation, analytics, setDays, setDate } =
    useDashboardOverview();
  const profile = useQuery(api.users.getMyProfile, {});
  const { t } = useDashboardI18n();
  const { openQuickBooking } = useQuickBooking();
  if (!data || !profile?.orgId)
    return (
      <div
        className="grid gap-5 p-8"
        aria-label={t("Loading dashboard", "Се вчитува контролната табла")}
      >
        <Skeleton className="h-24 w-2/3" />
        <div className="grid grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  return (
    <OverviewLayout
      data={data}
      paid={profile.plan === "paid"}
      isUpdating={isUpdating}
      utilisation={utilisation}
      analytics={analytics}
      firstName={profile.user?.name?.split(" ")[0] || ""}
      onDaysChange={setDays}
      onDateChange={setDate}
      onNewAppointment={() =>
        openQuickBooking({
          date: new Date(data.today).toISOString().slice(0, 10),
        })
      }
      openings={<OpenSlotsWidget orgId={profile.orgId} data={data} />}
      assistant={<AssistantWidget />}
      recovery={
        <RecoveryWidget orgId={profile.orgId} paid={profile.plan === "paid"} />
      }
      website={<WebsiteBanner orgId={profile.orgId} />}
    />
  );
}
