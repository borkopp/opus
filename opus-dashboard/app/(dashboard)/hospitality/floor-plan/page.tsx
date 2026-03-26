"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { IconArrowLeft, IconSquare } from "@tabler/icons-react";
import FloorPlanEditor from "./_components/FloorPlanEditor";
import { LocalTable } from "./_components/types";

export default function FloorPlanPage() {
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;

  // Fetch active floor plan
  const floorPlan = useQuery(
    api.hospitality.floorPlans.getActiveFloorPlan,
    orgId ? { orgId } : "skip",
  );

  // Fetch floor plan with tables once we have the floor plan
  const floorPlanData = useQuery(
    api.hospitality.floorPlans.getFloorPlanWithTables,
    orgId && floorPlan ? { orgId, floorPlanId: floorPlan._id } : "skip",
  );

  // Bootstrap mutation
  const bootstrap = useMutation(api.hospitality.onboarding.bootstrapHospitalityOrg);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Auto-bootstrap if no floor plan
  useEffect(() => {
    if (orgId && floorPlan === null && !bootstrapping && !bootstrapped) {
      setBootstrapping(true);
      bootstrap({ orgId })
        .then(() => {
          setBootstrapped(true);
          setBootstrapping(false);
        })
        .catch(() => setBootstrapping(false));
    }
  }, [orgId, floorPlan, bootstrap, bootstrapping, bootstrapped]);

  // Convert Convex tables to LocalTable[] format
  const initialTables: LocalTable[] = useMemo(() => {
    if (!floorPlanData?.tables || !floorPlanData?.floorPlan) return [];
    return floorPlanData.tables.map((t: any) => ({
      id: t._id,
      convexId: t._id,
      floorPlanId: t.floorPlanId,
      label: t.label,
      capacity: t.capacity,
      minCapacity: t.minCapacity,
      shape: t.shape,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation ?? 0,
      status: t.status,
      sortOrder: t.sortOrder ?? 0,
      isDirty: false,
      isNew: false,
      isDeleted: false,
    }));
  }, [floorPlanData]);

  // Loading state
  if (!orgId || floorPlan === undefined || bootstrapping) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center -m-4 md:-m-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {bootstrapping ? "Setting up your floor plan…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  // Still waiting for floor plan data after bootstrap
  if (!floorPlan || floorPlanData === undefined) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center -m-4 md:-m-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 md:-m-8">
      {/* Page header */}
      <div className="flex items-center h-12 px-4 bg-card border-b border-border shrink-0 gap-3">
        <Link
          href="/hospitality"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          Floor Plan
        </Link>

        <div className="h-4 w-px bg-border" />

        <span className="text-sm font-semibold text-foreground">
          {floorPlanData?.floorPlan?.name ?? "Floor Plan"}
        </span>

        <div className="flex-1" />

        {/* Empty state helper if no tables */}
        {initialTables.length === 0 && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Click a shape in the toolbar to place your first table
          </span>
        )}
      </div>

      {/* Empty state overlay */}
      {initialTables.length === 0 && floorPlanData && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center" style={{ top: '7.5rem' }}>
          <div className="flex flex-col items-center gap-4 pointer-events-auto bg-card/90 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-lg">
            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
              <IconSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Start building your floor plan</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Click a table shape in the left toolbar to place your first table on the canvas
            </p>
          </div>
        </div>
      )}

      {/* Editor */}
      <FloorPlanEditor
        floorPlanId={floorPlanData!.floorPlan._id}
        floorPlanName={floorPlanData!.floorPlan.name}
        initialTables={initialTables}
        orgId={orgId}
      />
    </div>
  );
}
