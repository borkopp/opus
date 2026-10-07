import { Badge } from "@/components/ui/badge";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

type Status = "active" | "handed_off" | "resolved";

export function ConversationStatusBadge({ status }: { status: Status }) {
  const { t } = useDashboardI18n();

  const labels: Record<Status, string> = {
    active: t("Active", "Активен", "Aktiv"),
    handed_off: t("Handed Off", "Преземен", "I kaluar"),
    resolved: t("Resolved", "Решен", "I zgjidhur"),
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
