"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { ResourceEditor } from "../VenueResources";
import { FloorPlanService } from "./FloorPlanService";
import { FloorPlanEditor } from "./FloorPlanEditor";

export function FloorPlanWorkspace() {
  const { t } = useDashboardI18n();
  const params = useSearchParams();
  const editing = params.get("mode") === "edit";
  const [chosenArea, setChosenArea] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const [addingArea, setAddingArea] = useState(false);
  const access = useQuery(api.hospitality.getAccess);
  const workspace = useQuery(
    api.hospitality.getWorkspace,
    access?.hasVenue ? {} : "skip",
  );
  const areaId =
    workspace?.areas.find(
      (area) => area._id === (chosenArea ?? params.get("area")),
    )?._id ?? workspace?.areas[0]?._id;
  const canManage =
    workspace?.role === "owner" || workspace?.role === "manager";
  const snapshot = useQuery(
    api.floorPlans.get,
    areaId ? { areaId: areaId as Id<"floor_plans"> } : "skip",
  );
  if (!access || (access.hasVenue && !workspace) || (areaId && !snapshot))
    return <Skeleton className="h-96" />;
  if (!workspace) return null;
  if (editing && !canManage)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {t(
              "Floor plan editing is for managers",
              "Планот го уредуваат менаџерите",
              "Plani redaktohet nga menaxherët",
            )}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Open the table overview to see your current service.",
              "Отворете го прегледот на масите за тековната услуга.",
              "Hapni përmbledhjen e tavolinave për shërbimin aktual.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/hospitality/tables">
              {t("View tables", "Преглед на масите", "Shiko tavolinat")}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  return (
    <div className="min-w-0 pb-12">
      {snapshot && !editing ? (
        <FloorPlanService
          key={`${snapshot.viewerId}-${workspace.org._id}-${areaId}`}
          workspace={workspace}
          snapshot={snapshot}
          onArea={setChosenArea}
        />
      ) : snapshot ? (
        <FloorPlanEditor
          key={`${snapshot.viewerId}-${workspace.org._id}-${areaId}-${session}`}
          snapshot={snapshot}
          workspace={workspace}
          onArea={setChosenArea}
          onReset={() => setSession(session + 1)}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {t(
                "Start with your first room",
                "Започнете со првиот простор",
                "Filloni me dhomën e parë",
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "Create an area such as Main room or Terrace, then place your tables.",
                "Создајте простор, на пример Главна сала или Тераса, па распоредете ги масите.",
                "Krijoni një zonë si Salla kryesore ose Tarraca, pastaj vendosni tavolinat.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {canManage && (
              <Button onClick={() => setAddingArea(true)}>
                <Plus data-icon="inline-start" />
                {t("Add area", "Додај простор", "Shto zonë")}
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/hospitality/tables">
                <ArrowLeft data-icon="inline-start" />
                {t("Back to tables", "Назад кон масите", "Kthehu te tavolinat")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {addingArea && (
        <ResourceEditor
          editor={{ kind: "area" }}
          workspace={workspace}
          onClose={() => setAddingArea(false)}
          onSaved={setChosenArea}
        />
      )}
    </div>
  );
}
