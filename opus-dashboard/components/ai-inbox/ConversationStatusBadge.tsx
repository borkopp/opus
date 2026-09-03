import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

type Status = "active" | "handed_off" | "resolved";

const styles: Record<Status, string> = {
  active: "bg-success/10 text-success border border-success/20",
  handed_off: "bg-highlight/15 text-warning border border-highlight/30",
  resolved: "bg-muted text-muted-foreground",
};

export function ConversationStatusBadge({ status }: { status: Status }) {
  const { t } = useDashboardI18n();

  const labels: Record<Status, string> = {
    active: t("Active", "Активен"),
    handed_off: t("Handed Off", "Преземен"),
    resolved: t("Resolved", "Решен"),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
