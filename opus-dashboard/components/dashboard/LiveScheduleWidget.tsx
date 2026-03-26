import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle, AlertCircle } from "lucide-react";

export function LiveScheduleWidget({ groupedByStaff, handleAction, checkIn, complete }: { groupedByStaff: any, handleAction: any, checkIn: any, complete: any }) {
  const staffMembers = Object.keys(groupedByStaff);

  // Flatten and sort by time to maintain a chronological view if needed, 
  // or keep it grouped by staff. Since we want a compact grid, 
  // flattening and sorting chronologically might look best for a general schedule.
  const allBookings = staffMembers.flatMap(staff => groupedByStaff[staff]);
  allBookings.sort((a, b) => a.startAt - b.startAt);

  return (
    <Card className="flex flex-col h-full bg-card p-5 rounded-[24px]">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-xl font-semibold font-display text-primary">Live Schedule</h2>
        <Badge variant="outline" className="rounded-full shadow-sm text-[11px] font-bold font-outfit">
          {allBookings.length} Bookings Today
        </Badge>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {allBookings.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground border border-dashed rounded-[16px] border-border/40 h-full">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
              <span>No bookings scheduled for today.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-4">
            {allBookings.map((b: any) => (
              <div key={b._id} className="flex items-center justify-between p-3 rounded-[20px] bg-popover border border-border/30 hover:bg-secondary/40 transition-all duration-300 group relative">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-card border border-border/40 shrink-0 shadow-sm text-[10px] font-bold font-outfit text-primary">
                    {format(new Date(b.startAt), "HH:mm")}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-primary truncate">{b.customerName}</span>
                    <span className="text-[10px] font-medium text-muted-foreground/80 truncate flex items-center gap-1.5 uppercase tracking-wide">
                      {b.serviceName} <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40 shrink-0" /> {b.staffName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {b.status === "confirmed" && (
                    <Button variant="outline" className="rounded-full h-7 px-3 text-[10px] font-bold border-primary/10 hover:bg-primary hover:text-white hover:border-primary transition-all" onClick={() => handleAction(checkIn, b._id, "Customer checked in")}>
                      In
                    </Button>
                  )}
                  {(b.status === "confirmed" || b.status === "checked_in") && (
                    <Button variant="terracotta" className="rounded-full h-7 px-3 text-[10px] font-bold shadow-sm" onClick={() => handleAction(complete, b._id, "Booking completed")}>
                      Done
                    </Button>
                  )}
                </div>

                {/* Show status icon if completed always */}
                {b.status === "completed" && (
                  <div className="flex items-center justify-center w-7 h-7 text-green-600 bg-green-500/10 rounded-full border border-green-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
