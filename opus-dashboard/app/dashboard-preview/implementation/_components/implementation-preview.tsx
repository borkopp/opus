"use client";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
// TODO: Remove the sample-data harness after authenticated visual acceptance.
// It is development-only and does not replace any production query or mutation.
import { OverviewLayout } from "@/components/dashboard/overview/OverviewLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OpenSlotsCard } from "@/components/dashboard/overview/widgets/OpenSlotsCard";
import { WidgetFrame } from "@/components/dashboard/overview/WidgetFrame";
import {
  appointments,
  staff as sampleStaff,
  openings,
} from "../../_lib/mock-data";
import type { OverviewData, ClientAnalytics } from "@/lib/dashboard-overview";
import s from "@/components/dashboard/clarity.module.css";
const today = Date.UTC(2026, 8, 22);
const team = sampleStaff.map((person, index) => ({
  id: `preview-staff-${index}` as Id<"staff_members">,
  name: person.name,
  role: "staff" as const,
  todayCount: 2,
}));
const schedule: OverviewData["schedule"] = appointments.map((item) => {
  const [hours, minutes] = item.time.split(":").map(Number);
  const startAt = Date.UTC(2026, 8, item.day, hours, minutes);
  return {
    id: item.id as Id<"bookings">,
    staffId: team.find((person) => person.name === item.staff)!.id,
    startAt,
    endAt: startAt + item.duration * 60_000,
    customerName: item.name,
    staffName: item.staff,
    serviceName: item.service,
    status:
      item.status === "Completed"
        ? "completed"
        : item.status === "Arrived"
          ? "checked_in"
          : "confirmed",
    priceMinorUnits: item.price,
    currency: "MKD",
    notes: "Prefers a natural finish. Loves a quiet appointment.",
  };
});
const clientSummary = {
  clients: 50,
  newClients: 14,
  returningClients: 36,
  newClientShare: 28,
  returningClientShare: 72,
  completedAppointments: 96,
  currency: "MKD",
  averageValueMinorUnits: 150000,
};
const rows = [
  "Cut & blow-dry",
  "Gel manicure",
  "Balayage & finish",
  "Brow shape & tint",
].map((name, index) => ({
  id: name,
  names: [name],
  isCombined: false,
  appointments: 32 - index * 6,
  previousAppointments: 20,
  appointmentChange: 12 - index * 6,
  currency: "MKD",
  revenueMinorUnits: 120000,
  revenuePerHourMinorUnits: 200000,
  appointmentBarPct: 100 - index * 18,
  revenueBarPct: 100 - index * 18,
}));
const analytics: ClientAnalytics = {
  clientGrowth: {
    current: clientSummary,
    previous: clientSummary,
    clientChange: 8,
  },
  servicePerformance: {
    byAppointments: rows,
    byRevenue: rows,
    canCompareRevenue: true,
    hasCombinedServices: false,
    insight: null,
  },
};
export function ImplementationPreview() {
  const [days, setDays] = useState<7 | 30>(7);
  const [selected, setSelected] = useState(today);
  const mockAction = () =>
    toast.info("Sample preview — sign in to use the connected booking flow.");
  const data: OverviewData = {
    orgName: "Luna Beauty Studio",
    today,
    now: today + 11 * 3_600_000,
    selected,
    todayCount: 6,
    staff: team,
    schedule: schedule.filter(
      (item) =>
        item.startAt >= selected && item.startAt < selected + 86_400_000,
    ),
    next: schedule[2],
    revenue: {
      days,
      currency: "MKD",
      totalMinor: days === 7 ? 8420000 : 34280000,
      previousMinor: 7465000,
      changePct: 12.8,
      buckets: [6, 9, 7, 11, 8, 13, 10].map((value, index) => ({
        startAt: today - (6 - index) * 86_400_000,
        endAt: today - (5 - index) * 86_400_000,
        valueMinor: value * 100000,
      })),
    },
  };
  const slots = openings.map((slot) => {
    const [hours, minutes] = slot.time.split(":").map(Number);
    return {
      staffId: team.find((person) => person.name === slot.staff)!.id,
      startAt: today + (hours * 60 + minutes) * 60_000,
      endAt: today + (hours * 60 + minutes + slot.duration) * 60_000,
      durationMins: slot.duration,
      availableDurationMins: slot.duration,
      isFallback: false,
    };
  });
  return (
    <div className={`dashboard-shell ${s.scope}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-3 text-xs">
        <span className="flex items-center gap-3">
          <Badge variant="secondary">Sample</Badge>
          Production Clarity components · sample data
        </span>
        <div className="flex gap-4">
          <Link href="/dashboard-preview">Design references</Link>
          <Link href="/beauty">Open live dashboard ↗</Link>
        </div>
      </div>
      <div className={s.stage}>
        <div className={s.dashboard}>
          <DashboardHeader
            activePath="/beauty"
            profile={{
              user: { name: "Elena Petrova" },
              role: "owner",
              plan: "paid",
            }}
          />
          <main className="dashboard-workspace dashboard-overview">
            <OverviewLayout
              data={data}
              firstName="Elena"
              utilisation={team.map((p, i) => ({
                staffName: p.name,
                bookedMins: 78 - i * 8,
                availableMins: 100,
                utilisationPct: 78 - i * 8,
              }))}
              analytics={analytics}
              onDaysChange={setDays}
              onDateChange={(date) =>
                setSelected(Date.parse(`${date}T00:00:00Z`))
              }
              onNewAppointment={mockAction}
              openings={
                <OpenSlotsCard
                  loaded
                  available={slots}
                  staff={team}
                  onBook={mockAction}
                />
              }
              assistant={
                <WidgetFrame
                  title="Business assistant"
                  subtitle="A clearer view of your studio"
                  action={<Badge variant="secondary">Sample</Badge>}
                >
                  <p className="mb-5 text-sm text-muted-foreground">
                    Ask about your bookings, clients, or capacity.
                  </p>
                  <button className={s.clientButton} onClick={mockAction}>
                    Open assistant ↗
                  </button>
                </WidgetFrame>
              }
              recovery={
                <WidgetFrame
                  title="Opening recovery"
                  subtitle="A cancellation can become a booking"
                  action={<Badge variant="secondary">Sample</Badge>}
                >
                  <p className="mb-5 text-sm text-muted-foreground">
                    Review openings, choose a client, and share an invitation
                    yourself.
                  </p>
                  <button className={s.clientButton} onClick={mockAction}>
                    Review openings ↗
                  </button>
                </WidgetFrame>
              }
            />
          </main>
        </div>
      </div>
    </div>
  );
}
