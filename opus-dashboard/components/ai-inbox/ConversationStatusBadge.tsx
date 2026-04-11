import { cn } from "@/lib/utils";

type Status = "active" | "handed_off" | "resolved";

const labels: Record<Status, string> = {
  active: "Active",
  handed_off: "Handed Off",
  resolved: "Resolved",
};

const styles: Record<Status, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  handed_off: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  resolved: "bg-muted text-muted-foreground",
};

export function ConversationStatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
