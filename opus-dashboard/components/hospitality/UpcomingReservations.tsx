"use client";

import { Card } from "@/components/ui/card";
import { IconUsers, IconClock } from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";

interface UpcomingReservationsProps {
  reservations: any[] | null;
}

export function UpcomingReservations({ reservations }: UpcomingReservationsProps) {
  if (!reservations) {
    return (
      <Card className="flex flex-col p-5 rounded-[20px] h-full animate-pulse">
        <div className="h-4 w-36 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col p-5 rounded-[20px] h-full">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Upcoming Reservations
      </span>

      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
          <IconClock className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <span className="text-sm text-muted-foreground">No upcoming reservations</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reservations.map((r: any) => (
            <div
              key={r._id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold font-mono tabular-nums text-foreground w-12 shrink-0">
                {format(new Date(r.startAt), "HH:mm")}
              </span>
              <span className="text-sm text-foreground truncate flex-1">
                {r.customer?.name ?? "Guest"}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconUsers className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{r.partySize}</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                {r.table?.label ?? "—"}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                r.status === "confirmed" ? "bg-accent/10 text-accent" :
                r.status === "seated" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border">
        <Link
          href="/hospitality/reservations"
          className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          View all →
        </Link>
      </div>
    </Card>
  );
}
