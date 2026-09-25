import { Badge } from "@/components/ui/badge";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

type Status = "active" | "handed_off" | "resolved";

export function ConversationStatusBadge({ status }: { status: Status }) {
  const { t } = useDashboardI18n();

  const labels: Record<Status, string> = {
    active: t("Active", "Активен"),
    handed_off: t("Handed Off", "Преземен"),
    resolved: t("Resolved", "Решен"),
  };

  return (
    <Badge
      variant={
        status === "active"
          ? "success"
          : status === "handed_off"
            ? "highlight"
            : "secondary"
      }
    >
      {labels[status]}
    </Badge>
  );
}
