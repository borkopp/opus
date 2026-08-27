import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Message = FunctionReturnType<typeof api.ai.messages.listMessages>[number];

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isAction = !!message.actionType;
  const time = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

  if (isAction) {
    const actionLabels: Record<string, string> = {
      booking_created: "Booking created",
      booking_cancelled: "Booking cancelled",
      booking_rescheduled: "Booking rescheduled",
      payment_link_sent: "Payment link sent",
      handoff_triggered: "Handed off to human",
    };
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs border border-border/50">
          <span className="font-medium">{actionLabels[message.actionType!] ?? message.actionType}</span>
          {message.actionReferenceId && (
            <span className="opacity-60">· {message.actionReferenceId.slice(0, 8)}</span>
          )}
          <span className="opacity-50">· {time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 max-w-[80%] mb-3", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div className={cn(
        "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted border border-border/50 rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className={cn("flex flex-col gap-0.5 justify-end shrink-0", isUser ? "items-end" : "items-start")}>
        <span className="text-[10px] text-muted-foreground">{time}</span>
        {!isUser && message.confidenceScore !== undefined && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            message.confidenceScore >= 0.7
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          )}>
            {Math.round(message.confidenceScore * 100)}% confident
          </span>
        )}
      </div>
    </div>
  );
}
