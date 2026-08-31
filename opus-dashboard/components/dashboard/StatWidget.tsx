import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subValue?: React.ReactNode;
  actionText?: string;
  actionIcon?: React.ReactNode;
  className?: string;
}

export function StatWidget({ title, value, icon: Icon, subValue, actionText, actionIcon, className }: StatWidgetProps) {
  return (
      <Card className={cn("flex flex-col justify-between p-5 h-full min-h-[160px] gap-2", className)}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <WidgetTitle>{title}</WidgetTitle>
        </div>
        <div className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{value}</div>
      </div>

      {(subValue || actionText) && (
        <div className="flex justify-between items-center text-sm font-semibold mt-4 pt-4 border-t border-border/40">
          <span className="text-muted-foreground font-display flex items-center gap-1">
            {subValue}
          </span>
          {actionText && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              {actionIcon || (
                <span className="flex size-4 items-center justify-center rounded-full bg-muted">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                </span>
              )}
              <span className="hover:underline cursor-pointer">{actionText}</span>
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
