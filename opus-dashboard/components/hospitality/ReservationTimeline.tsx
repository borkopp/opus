"use client";

import { Card } from "@/components/ui/card";
import { useMemo, useEffect, useState } from "react";

interface ReservationTimelineProps {
  reservations: any[] | null;
  tables: any[];
  onSelectReservation?: (r: any) => void;
}

export function ReservationTimeline({ reservations, tables, onSelectReservation }: ReservationTimelineProps) {
  const [now, setNow] = useState(Date.now());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Timeline bounds: 8am to midnight (or adjusted to first/last reservation)
  const { dayStart, dayEnd, duration, hours } = useMemo(() => {
    const today = new Date();
    const dayStr = today.toISOString().split("T")[0];
    let startMs = new Date(dayStr + "T08:00:00").getTime();
    let endMs = new Date(dayStr + "T23:59:59").getTime();

    if (reservations && reservations.length > 0) {
      const firstStart = Math.min(...reservations.map((r) => r.startAt));
      const lastEnd = Math.max(...reservations.map((r) => r.endAt));
      startMs = Math.min(startMs, firstStart - 30 * 60 * 1000);
      endMs = Math.max(endMs, lastEnd + 30 * 60 * 1000);
    }

    const dur = endMs - startMs;

    // Generate hour labels
    const hrs: { label: string; pct: number }[] = [];
    const startHour = new Date(startMs).getHours();
    const endHour = new Date(endMs).getHours();
    for (let h = startHour; h <= endHour; h++) {
      const hMs = new Date(new Date(startMs).setHours(h, 0, 0, 0)).getTime();
      const pct = ((hMs - startMs) / dur) * 100;
      if (pct >= 0 && pct <= 100) {
        hrs.push({ label: `${h.toString().padStart(2, "0")}:00`, pct });
      }
    }

    return { dayStart: startMs, dayEnd: endMs, duration: dur, hours: hrs };
  }, [reservations]);

  const nowPct = ((now - dayStart) / duration) * 100;

  // Group reservations by table
  const tableRows = useMemo(() => {
    if (!tables.length) return [];
    return tables.map((table) => {
      const tableRes = (reservations ?? []).filter(
        (r: any) => r.tableId === table._id || r.table?._id === table._id,
      );
      return { table, reservations: tableRes };
    });
  }, [tables, reservations]);

  const statusColor: Record<string, { bg: string; border: string }> = {
    confirmed: { bg: "bg-accent/20", border: "border-accent/40" },
    pending: { bg: "bg-amber-100", border: "border-amber-300" },
    seated: { bg: "bg-primary", border: "border-primary" },
    completed: { bg: "bg-muted", border: "border-border" },
  };

  return (
    <Card className="flex flex-col p-5 rounded-[20px] h-full overflow-hidden">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Reservation Timeline
      </span>

      <div className="flex-1 overflow-auto">
        {/* Hour labels */}
        <div className="relative h-5 mb-1 ml-14">
          {hours.map((h) => (
            <span
              key={h.label}
              className="absolute text-[10px] font-mono text-muted-foreground -translate-x-1/2"
              style={{ left: `${h.pct}%` }}
            >
              {h.label}
            </span>
          ))}
        </div>

        {/* Table rows */}
        <div className="flex flex-col gap-1">
          {tableRows.map(({ table, reservations: tableRes }) => (
            <div key={table._id} className="flex items-center gap-2 h-8">
              {/* Table label */}
              <span className="text-[11px] font-semibold text-muted-foreground w-12 shrink-0 text-right">
                {table.label}
              </span>

              {/* Timeline row */}
              <div className="relative flex-1 h-full bg-secondary/30 rounded overflow-hidden">
                {/* hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h.label}
                    className="absolute top-0 bottom-0 w-px bg-border/40"
                    style={{ left: `${h.pct}%` }}
                  />
                ))}

                {/* Reservation blocks */}
                {tableRes.map((r: any) => {
                  const left = ((r.startAt - dayStart) / duration) * 100;
                  const width =
                    ((r.durationMins * 60 * 1000) / duration) * 100;
                  const colors = statusColor[r.status] ?? statusColor.confirmed;

                  return (
                    <div
                      key={r._id}
                      onClick={() => onSelectReservation?.(r)}
                      className={`absolute top-0.5 bottom-0.5 ${colors.bg} border ${colors.border} rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center px-1 overflow-hidden`}
                      style={{
                        left: `${Math.max(0, left)}%`,
                        width: `${Math.min(100 - Math.max(0, left), width)}%`,
                      }}
                    >
                      {width > 6 && (
                        <span className={`text-[9px] font-medium truncate ${
                          r.status === "seated" ? "text-white" : "text-foreground"
                        }`}>
                          {r.customer?.name ?? "Guest"}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Now indicator */}
                {nowPct >= 0 && nowPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                    style={{ left: `${nowPct}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {tableRows.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No tables set up yet
          </div>
        )}
      </div>
    </Card>
  );
}
