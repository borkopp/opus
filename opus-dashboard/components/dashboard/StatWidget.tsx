import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <Card className={cn("flex flex-col justify-between p-5 h-full min-h-[160px] gap-2 rounded-[24px] border border-border/40 shadow-sm bg-card", className)}>
      <div className="flex flex-col">
        <span className="text-xl font-semibold font-display text-primary">{title}</span>
        <div className="font-outfit text-2xl lg:text-3xl font-bold tracking-tight text-primary mt-1.5">{value}</div>
      </div>

      {(subValue || actionText) && (
        <div className="flex justify-between items-center text-sm font-semibold mt-4 pt-4 border-t border-border/40">
          <span className="text-muted-foreground font-outfit flex items-center gap-1">
            {subValue}
          </span>
          {actionText && (
            <span className="text-accent flex items-center gap-1.5 text-xs">
              {actionIcon || (
                <span className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full" />
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
