"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Layers,
  LayoutGrid,
  MapPin,
  Table2,
  DraftingCompass,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReservationSectionNavigation } from "./ReservationSectionNavigation";
import { VenueResources } from "./VenueResources";
import { LiveTableOverview } from "./LiveTableOverview";

export function TablesWorkspace() {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useQuery(api.hospitality.getAccess);
  const workspace = useQuery(
    api.hospitality.getWorkspace,
    access?.hasVenue ? {} : "skip",
  );
  if (!access || (access.hasVenue && !workspace))
    return <Skeleton className="h-96" />;
  if (!workspace) return null;
  const canManage = workspace.role === "owner" || workspace.role === "manager";
  const requested = searchParams.get("tab");
  const tab =
    canManage && ["tables", "areas", "combinations"].includes(requested ?? "")
      ? requested!
      : "overview";
  const navigate = (value: string) =>
    router.replace(`/hospitality/tables?tab=${value}`, { scroll: false });
  const sections = [
    {
      value: "overview",
      label: t("Overview", "Преглед", "Përmbledhje"),
      icon: LayoutGrid,
    },
    { value: "tables", label: copy("Tables"), icon: Table2 },
    { value: "areas", label: copy("Areas"), icon: MapPin },
    {
      value: "combinations",
      label: t("Combinations", "Комбинации", "Kombinimet"),
      icon: Layers,
    },
  ];
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-6 pb-12">
      <DashboardPageHeader
        title={copy("Tables")}
        description={t(
          "See seated guests, table resets and the next arrivals.",
          "Преглед на сместените гости, подготовката на масите и следните пристигнувања.",
          "Shikoni mysafirët e ulur, përgatitjen e tavolinave dhe mbërritjet e ardhshme.",
        )}
      >
        <Button variant="outline" asChild>
          <Link href="/hospitality/tables/floor-plan">
            <DraftingCompass data-icon="inline-start" />
            {t("Floor plan", "План на просторот", "Plani i lokalit")}
          </Link>
        </Button>
        {canManage && tab === "overview" && (
          <Button asChild>
            <Link href="/hospitality/tables?tab=tables">
              <Table2 data-icon="inline-start" />
              {t("Manage tables", "Уреди маси", "Menaxho tavolinat")}
            </Link>
          </Button>
        )}
      </DashboardPageHeader>
      {canManage ? (
        <Tabs
          key={workspace.org._id}
          value={tab}
          onValueChange={navigate}
          orientation="vertical"
          className="dashboard-settings-tabs w-full"
        >
          <ReservationSectionNavigation
            sections={sections}
            value={tab}
            onValueChange={navigate}
          />
          <div className="min-w-0">
            <TabsContent value="overview">
              {tab === "overview" && (
                <LiveTableOverview
                  key={workspace.org._id}
                  workspace={workspace}
                />
              )}
            </TabsContent>
            <TabsContent value="tables">
              <VenueResources workspace={workspace} section="table" />
            </TabsContent>
            <TabsContent value="areas">
              <VenueResources workspace={workspace} section="area" />
            </TabsContent>
            <TabsContent value="combinations">
              <VenueResources workspace={workspace} section="combination" />
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <LiveTableOverview key={workspace.org._id} workspace={workspace} />
      )}
    </div>
  );
}
