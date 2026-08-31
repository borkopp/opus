import { cn } from "@/lib/utils";

type Status = "active" | "handed_off" | "resolved";

const labels: Record<Status, string> = {
  active: "Active",
  handed_off: "Handed Off",
  resolved: "Resolved",
};

const styles: Record<Status, string> = {
  active: "bg-success/10 text-success border border-success/20",
  handed_off: "bg-highlight/15 text-warning border border-highlight/30",
  resolved: "bg-muted text-muted-foreground",
};

export function ConversationStatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
