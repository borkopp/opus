"use client";

import { Card } from "@/components/ui/card";

interface CoversTodayProps {
  covers: { total: number; seated: number; remaining: number; completed: number; reservationCount: number } | null;
  totalSeats: number;
}

export function CoversToday({ covers, totalSeats }: CoversTodayProps) {
  if (!covers) {
    return (
      <Card className="flex flex-col p-5 rounded-[20px] h-full animate-pulse">
        <div className="h-4 w-28 bg-muted rounded" />
      </Card>
    );
  }

  const estimatedTurns = 2.5;
  const maxCovers = totalSeats * estimatedTurns;
  const utilisation = maxCovers > 0 ? Math.round((covers.total / maxCovers) * 100) : 0;

  return (
    <Card className="flex flex-col p-5 rounded-[20px] h-full">
      <h2 className="text-xl font-semibold font-display text-primary mb-4">
        Covers Today
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-2xl font-outfit font-bold text-foreground">{covers.total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-outfit font-bold text-foreground">{covers.seated}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Seated</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-outfit font-bold text-foreground">{covers.remaining}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining</span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Utilisation</span>
          <span className="text-xs font-bold font-outfit text-foreground">{utilisation}%</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, utilisation)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
