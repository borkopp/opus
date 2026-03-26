"use client";

import { Card } from "@/components/ui/card";
import { IconClock } from "@tabler/icons-react";

interface TableTurnoverProps {
  stats: { avgMins: number; fastest: { tableLabel: string; mins: number } | null; slowest: { tableLabel: string; mins: number } | null } | null;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function TableTurnover({ stats }: TableTurnoverProps) {
  if (!stats) {
    return (
      <Card className="flex flex-col p-5 rounded-[20px] h-full animate-pulse">
        <div className="h-4 w-28 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col p-5 rounded-[20px] h-full">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Table Turnover
      </span>

      <div className="flex items-center gap-3 mb-1">
        <IconClock className="h-5 w-5 text-accent" />
        <span className="text-3xl font-outfit font-bold text-foreground">
          {stats.avgMins > 0 ? formatDuration(stats.avgMins) : "—"}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground mb-4">
        {stats.avgMins > 0 ? "Avg table time today" : "No completed seatings today"}
      </span>

      {stats.fastest && stats.slowest && (
        <div className="flex flex-col gap-1.5 mt-auto pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fastest</span>
            <span className="font-medium text-foreground">
              {stats.fastest.tableLabel} · {formatDuration(stats.fastest.mins)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Slowest</span>
            <span className="font-medium text-foreground">
              {stats.slowest.tableLabel} · {formatDuration(stats.slowest.mins)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
