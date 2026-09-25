import {
  Message as MessageRow,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
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
        <div className="inline-flex flex-wrap justify-center items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs border border-border/50">
          <span className="font-medium">
            {actionLabels[message.actionType!] ?? message.actionType}
          </span>
          <span className="opacity-50">· {time}</span>
        </div>
      </div>
    );
  }

  return (
    <MessageRow align={isUser ? "start" : "end"}>
      <MessageContent>
        <MessageHeader>
          {isUser
            ? t("Client", "Клиент")
            : message.author === "staff"
              ? t("Your team", "Вашиот тим")
              : t("AI front desk", "AI рецепција")}
        </MessageHeader>
        <Bubble
          variant={isUser ? "outline" : "tinted"}
          align={isUser ? "start" : "end"}
          className="max-w-[92%] sm:max-w-[80%]"
        >
          <BubbleContent>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {message.content}
            </p>
            {!isUser && message.deliveryStatus && (
              <p className="mt-2 text-xs opacity-70">
                {message.author === "staff" ? t("Team", "Тим") : "AI"} ·{" "}
                {
                  {
                    queued: t("Queued", "Во редица"),
                    sending: t("Sending", "Се испраќа"),
                    sent: t("Accepted by Instagram", "Прифатено од Instagram"),
                    failed: t("Not sent", "Не е испратено"),
                    uncertain: t(
                      "Check delivery in Instagram",
                      "Проверете ја испораката во Instagram",
                    ),
                    withheld: t(
                      "Not sent · needs team review",
                      "Не е испратено · потребен е преглед од тимот",
                    ),
                  }[message.deliveryStatus]
                }
              </p>
            )}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="flex-wrap gap-2">
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
        </MessageFooter>
      </MessageContent>
    </MessageRow>
  );
}
