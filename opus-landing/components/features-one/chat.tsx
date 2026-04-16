"use client";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

export function ChatConversation({ className }: { className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const messages = [
    {
      id: 1,
      name: "AI Agent",
      avatar: "https://assets.aceternity.com/avatars/1.webp",
      text: "Workflow completed. 847 tasks processed.",
      isUser: false,
    },
    {
      id: 2,
      name: "You",
      avatar: "https://assets.aceternity.com/avatars/manu.webp",
      text: "Deploy to production",
      isUser: true,
    },
    {
      id: 3,
      name: "AI Agent",
      avatar: "https://assets.aceternity.com/avatars/8.webp",
      text: "Deployed. All systems operational.",
      isUser: false,
    },
  ];

  return (
    <div
      className={cn("flex min-h-60 items-center justify-center p-4", className)}
    >
      <div ref={ref} className="flex flex-col justify-center gap-3">
        {messages.map((message, index) => {
          const baseDelay = index * 0.3;
          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.isUser ? "flex-row-reverse" : ""}`}
            >
              <motion.img
                src={message.avatar}
                alt={message.name}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: baseDelay }}
                className="size-8 shrink-0 rounded-full object-cover"
              />
              <motion.div
                initial={{ opacity: 0, x: message.isUser ? 10 : -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: baseDelay + 0.15 }}
                className="rounded-xl bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-800 dark:text-neutral-200"
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
