import { Card } from "@/components/ui/card";
import { UserPlus, AlertTriangle, TrendingUp, Calendar } from "lucide-react";

export function CustomerInsightsWidget({ insights, topCustomers, noShowRisk, formatMoney, revenueToday, bookingsToday }: any) {
  return (
    <Card className="flex flex-col bg-card p-5 h-full overflow-hidden rounded-[24px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold font-display text-primary">Insights & Today</h2>
      </div>

      {/* Today's Quick Stats - Reclaimed from top cards */}
      <div className="grid grid-cols-2 gap-3 border-b border-border/40 pb-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            <TrendingUp className="w-3 h-3 text-green-500" /> Revenue
          </div>
          <span className="text-xl font-bold font-outfit">{formatMoney(revenueToday)}</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-border/40 pl-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            <Calendar className="w-3 h-3 text-primary" /> Bookings
          </div>
          <span className="text-xl font-bold font-outfit">{bookingsToday}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5 items-center justify-center p-3 bg-secondary/30 rounded-[16px] flex-1 border border-border/40">
          <span className="font-outfit text-2xl font-bold text-primary">{insights.newThisMonth}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New</span>
        </div>
        <div className="flex flex-col gap-0.5 items-center justify-center p-3 bg-secondary/30 rounded-[16px] flex-1 border border-border/40">
          <span className="font-outfit text-2xl font-bold text-primary">{insights.returningThisMonth}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Returning</span>
        </div>
      </div>

      {(() => {
        const validCustomers = topCustomers.filter((c: any) => c.totalSpendMinorUnits > 0);
        if (validCustomers.length === 0) return null;
        return (
          <div className="-mb-3">
            <div className="flex items-center justify-between mb-2 text-[11px] font-bold">
              <span className="text-muted-foreground font-outfit font-medium uppercase tracking-tight">Recent Activity</span>
            </div>
            <div className="flex flex-col gap-2">
              {validCustomers.slice(0, 3).map((c: any, i: number) => (
                <div key={c.id} className="flex justify-between items-center text-xs font-outfit">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <span className="font-medium text-primary truncate max-w-[80px]">{c.name}</span>
                  </div>
                  <span className="font-bold text-primary">{formatMoney(c.totalSpendMinorUnits)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {(insights.atRiskChurn > 0 || (noShowRisk?.customers && noShowRisk.customers.length > 0)) && (
        <div className="mt-auto pt-2 border-t border-border/40 space-y-1">
          {insights.atRiskChurn > 0 && (
            <div className="flex items-center justify-between text-[11px] text-destructive font-bold font-outfit">
              <div className="flex items-center gap-1.5 leading-none">
                <AlertTriangle className="h-3 w-3" /> At Risk
              </div>
              <span>{insights.atRiskChurn}</span>
            </div>
          )}
          {noShowRisk?.customers?.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-accent font-bold font-outfit">
              <div className="flex items-center gap-1.5 leading-none">
                <AlertTriangle className="h-3 w-3" /> No-Shows
              </div>
              <span>{noShowRisk.customers.length}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
