"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Wand, Trash } from "lucide-react";

// Widgets
import { LiveFloorPlan } from "@/components/hospitality/LiveFloorPlan";
import { CoversToday } from "@/components/hospitality/CoversToday";
import { UpcomingReservations } from "@/components/hospitality/UpcomingReservations";
import { TableTurnover } from "@/components/hospitality/TableTurnover";
import { ReservationTimeline } from "@/components/hospitality/ReservationTimeline";
import { NewReservationModal } from "@/components/hospitality/NewReservationModal";
import { AIPerformanceWidget } from "@/components/dashboard/AIPerformanceWidget";

export default function HospitalityDashboard() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split("T")[0], [today]);

  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;

  const [showNewReservation, setShowNewReservation] = useState(false);

  // Dev mutations
  const seedMockData = useMutation(api.hospitality.dev.seedHospitalityMockData);
  const clearMockData = useMutation(api.hospitality.dev.clearHospitalityMockData);

  const handleSeedData = async () => {
    if (!orgId) return;
    try {
      const promise = seedMockData({ orgId, targetDateMs: Date.now() });
      toast.promise(promise, {
        loading: "Seeding hospitality mock data...",
        success: (data) =>
          `Added ${data.totalReservations} reservations, ${data.totalCustomers} customers.`,
        error: (e) => e?.message || "Failed to seed data",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearData = async () => {
    if (!orgId) return;
    try {
      const promise = clearMockData({ orgId });
      toast.promise(promise, {
        loading: "Clearing hospitality mock data...",
        success: (data) =>
          `Cleared ${data.deletedReservations} reservations, ${data.deletedCustomers} customers, ${data.deletedConvos} AI conversations.`,
        error: "Failed to clear data",
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ── Real-time Convex queries ──────────────────────────────────────────────
  const tableData = useQuery(
    api.hospitality.tables.getTablesWithCurrentReservations,
    orgId ? { orgId } : "skip",
  );

  const covers = useQuery(
    api.hospitality.reservations.getCoversToday,
    orgId ? { orgId } : "skip",
  );

  const upcoming = useQuery(
    api.hospitality.reservations.getUpcomingReservations,
    orgId ? { orgId, limit: 5 } : "skip",
  );

  const turnover = useQuery(
    api.hospitality.reservations.getTableTurnoverStats,
    orgId ? { orgId } : "skip",
  );

  const todayReservations = useQuery(
    api.hospitality.reservations.listReservationsByOrg,
    orgId ? { orgId, date: todayStr } : "skip",
  );

  const monthStart = startOfMonth(today).getTime();
  const monthEnd = endOfMonth(today).getTime();
  const aiPerformance = useQuery(
    api.dashboard.getAIPerformance,
    orgId ? { orgId, startMs: monthStart, endMs: monthEnd } : "skip",
  );

  // Total seats for covers utilisation
  const totalSeats = useMemo(
    () => (tableData?.tables ?? []).reduce((sum: number, t: any) => sum + (t.capacity ?? 0), 0),
    [tableData],
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (profile === undefined) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!orgId) return null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto overflow-visible">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between w-full relative z-10">
        <div className="flex items-center gap-4 lg:gap-6 w-full lg:w-auto">
          <div className="flex flex-col items-center justify-center bg-card rounded-[24px] shadow-s dark:shadow-l w-16 h-16 lg:w-20 lg:h-20 shrink-0">
            <span className="font-outfit text-xl lg:text-3xl font-bold leading-none">
              {format(today, "dd")}
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-md font-semibold">{format(today, "EEEE")}</span>
            <span className="text-md text-muted-foreground">{format(today, "MMMM")}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <Button onClick={handleClearData} variant="outline" className="rounded-full shadow-sm font-semibold border-destructive/40 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
            <Trash className="h-4 w-4" />
          </Button>
          <Button onClick={handleSeedData} variant="outline" className="rounded-full shadow-sm font-semibold border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
            <Wand className="h-4 w-4" />
          </Button>
          <Button
            variant="terracotta"
            className="rounded-full shadow-md px-6 py-6 hidden items-center justify-center lg:flex"
            onClick={() => setShowNewReservation(true)}
          >
            <Plus className="h-4 w-4" /> New Reservation
          </Button>
        </div>
      </div>

      {/* ── Grid Layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Row 1: Live Floor Plan (3 cols) + Right sidebar (1 col) */}
        <div className="lg:col-span-3 min-h-[420px] max-h-[520px]">
          <LiveFloorPlan data={tableData ?? null} orgId={orgId} />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
          <CoversToday covers={covers ?? null} totalSeats={totalSeats} />
          <UpcomingReservations reservations={upcoming ?? null} />
        </div>

        {/* Row 2: Timeline (2 cols) + Stats (1 col) + AI (1 col) */}
        <div className="lg:col-span-2 min-h-[250px] max-h-[320px]">
          <ReservationTimeline
            reservations={todayReservations ?? null}
            tables={tableData?.tables ?? []}
          />
        </div>

        <div className="lg:col-span-1 min-h-0">
          <TableTurnover stats={turnover ?? null} />
        </div>

        <div className="lg:col-span-1 min-h-0">
          {aiPerformance !== undefined && (
            <AIPerformanceWidget aiPerformance={aiPerformance} />
          )}
        </div>
      </div>

      {/* ── New Reservation Modal ──────────────────────────────────────── */}
      {showNewReservation && (
        <NewReservationModal
          orgId={orgId}
          source="manual"
          onClose={() => setShowNewReservation(false)}
        />
      )}
    </div>
  );
}
