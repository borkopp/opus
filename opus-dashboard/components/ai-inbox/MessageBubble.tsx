import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { mk } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

type Message = FunctionReturnType<typeof api.ai.messages.listMessages>[number];

export function MessageBubble({ message }: { message: Message }) {
  const { language, t } = useDashboardI18n();
  const isUser = message.role === "user";
  const isAction = !!message.actionType;
  const time = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: language === "mk" ? mk : undefined,
  });

  if (isAction) {
    const actionLabels: Record<string, string> = {
      booking_created: t("Booking created", "Терминот е закажан"),
      booking_cancelled: t("Booking cancelled", "Терминот е откажан"),
      booking_rescheduled: t("Booking rescheduled", "Терминот е презакажан"),
      handoff_triggered: t("Handed off to human", "Преземено од персонал"),
    };
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs border border-border/50">
          <span className="font-medium">
            {actionLabels[message.actionType!] ?? message.actionType}
          </span>
          {message.actionReferenceId && (
            <span className="opacity-60">
              · {message.actionReferenceId.slice(0, 8)}
            </span>
          )}
          <span className="opacity-50">· {time}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%] mb-3",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
    >
      <div
        className={cn(
          "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted border border-border/50 rounded-tl-sm",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div
        className={cn(
          "flex flex-col gap-0.5 justify-end shrink-0",
          isUser ? "items-end" : "items-start",
        )}
      >
        <span className="text-[10px] text-muted-foreground">{time}</span>
        {!isUser && message.confidenceScore !== undefined && (
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              message.confidenceScore >= 0.7
                ? "bg-success/10 text-success"
                : "bg-highlight/15 text-warning",
            )}
          >
            {Math.round(message.confidenceScore * 100)}%{" "}
            {t("confident", "сигурност")}
          </span>
        )}
      </div>
    </div>
  );
}
