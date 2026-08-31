"use client";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

export function ChatConversation({ className }: { className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const messages = [
    {
      id: 1,
      name: "Клиент",
      avatar: "https://assets.aceternity.com/avatars/2.webp",
      text: "Здраво, имате ли слободен термин за денес?",
      isUser: false,
    },
    {
      id: 2,
      name: "AI Асистент",
      avatar: "robot",
      text: "Здраво! Имаме слободно во 16:30. Да го резервирам?",
      isUser: true,
    },
    {
      id: 3,
      name: "Клиент",
      avatar: "https://assets.aceternity.com/avatars/2.webp",
      text: "Одлично, може. Фала!",
      isUser: false,
    },
  ];

  return (
    <div
      className={cn("flex min-h-[180px] w-full flex-col items-center justify-center p-2", className)}
    >
      <div ref={ref} className="flex w-full max-w-sm flex-col justify-center gap-3">
        {messages.map((message, index) => {
          const baseDelay = index * 0.4;
          return (
            <div
              key={message.id}
              className={`flex w-full items-end gap-2 ${message.isUser ? "flex-row-reverse" : ""}`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: baseDelay }}
                className={cn(
                  "flex size-6 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-border",
                  message.avatar === "robot" ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {message.avatar === "robot" ? (
                  <Bot className="size-3.5" />
                ) : (
                  <img src={message.avatar} alt={message.name} className="h-full w-full object-cover" />
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: baseDelay + 0.15, type: "spring", stiffness: 200, damping: 20 }}
                className={cn(
                  "relative max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ring-1",
                  message.isUser
                    ? "rounded-br-sm bg-primary text-primary-foreground ring-primary/20"
                    : "rounded-bl-sm bg-card text-foreground ring-border"
                )}
              >
                {message.text}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
