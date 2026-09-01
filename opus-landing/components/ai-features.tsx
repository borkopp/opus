"use client";
import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChatConversation } from "./features-one/chat";
import { GapOptimizerSkeleton } from "./features-one/gap-optimizer-skeleton";
import { AnalysisUpsellSkeleton } from "./features-one/analysis-upsell-skeleton";
import { useI18n } from "./i18n-provider";

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

interface Feature {
  id: string;
  title: string;
  description: string;
  skeleton: React.ReactNode;
}

const InternalAiSkeleton = () => {
  const { messages } = useI18n();
  const copy = messages.aiSection;

  return (
    <div className="flex h-full w-full flex-col space-y-6 overflow-hidden p-6">
      {/* User Question */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-brand-primary/10 border-brand-primary/20 max-w-[80%] self-end rounded-2xl rounded-tr-none border p-3"
      >
        <p className="text-xs text-white">{copy.question}</p>
      </motion.div>

      {/* Thinking State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="flex items-center gap-2"
      >
        <div className="bg-brand-primary/40 size-1.5 animate-bounce rounded-full" />
        <div className="bg-brand-primary/40 size-1.5 animate-bounce rounded-full [animation-delay:0.2s]" />
        <div className="bg-brand-primary/40 size-1.5 animate-bounce rounded-full [animation-delay:0.4s]" />
      </motion.div>

      {/* AI Answer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 0.6 }}
        className="w-full max-w-[95%] space-y-4 self-start"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="bg-brand-primary flex size-6 items-center justify-center rounded-full">
            <span className="text-[10px] font-bold tracking-tighter text-white">
              AI
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-widest text-neutral-400 uppercase">
            {copy.analysisLabel}
          </span>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <p className="text-xs leading-relaxed font-medium text-neutral-200">
            {copy.answerBefore}{" "}
            <span className="text-brand-primary font-bold">
              {copy.answerDay}
            </span>{" "}
            {copy.answerAfter}
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>{copy.tuesday}</span>
                <span className="text-brand-primary">
                  {copy.versusAverage}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "12%" }}
                  transition={{ delay: 3.8, duration: 1 }}
                  className="bg-brand-primary h-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>{copy.weekendAverage}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "88%" }}
                  transition={{ delay: 4, duration: 1 }}
                  className="h-full bg-white/20"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-2">
            <p className="text-[10px] text-neutral-400 italic">
              {copy.suggestion}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input bar placeholder */}
      <div className="relative mt-auto pt-4">
        <div className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/5 bg-neutral-950/50 px-4">
          <div className="h-2 w-32 rounded bg-white/10" />
          <div className="flex gap-2">
            <div className="size-6 rounded-lg border border-white/10 bg-white/5" />
            <div className="bg-brand-primary/20 border-brand-primary/40 flex size-6 items-center justify-center rounded-lg border">
              <div className="border-brand-primary size-2.5 -translate-x-0.5 rotate-45 border-t-2 border-r-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function FeatureSectionWithTerminal() {
  const { messages } = useI18n();
  const copy = messages.aiSection;
  const features: Feature[] = [
    {
      id: "ai-assistant",
      ...copy.features[0],
      skeleton: (
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <ChatConversation className="max-h-[300px] w-full" />
        </div>
      ),
    },
    {
      id: "gap-optimizer",
      ...copy.features[1],
      skeleton: (
        <div className="flex h-full w-full items-center justify-center p-2">
          <GapOptimizerSkeleton className="scale-90" />
        </div>
      ),
    },
    {
      id: "analysis-upsell",
      ...copy.features[2],
      skeleton: (
        <div className="flex h-full w-full items-center justify-center">
          <AnalysisUpsellSkeleton className="scale-90" />
        </div>
      ),
    },
    {
      id: "internal-ai",
      ...copy.features[3],
      skeleton: (
        <div className="flex h-full w-full items-center justify-center">
          <InternalAiSkeleton />
        </div>
      ),
    },
  ];
  const [activeFeature, setActiveFeature] = useState<string>("ai-assistant");

  const currentFeature = features.find((f) => f.id === activeFeature)!;

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:px-8">
      <div className="mb-12 w-full text-left">
        <h2 className="text-3xl font-medium tracking-tight text-neutral-700 md:text-5xl dark:text-white">
          {copy.heading}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.headingAccent}
          </span>
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-neutral-500 dark:text-neutral-400">
          {copy.description}
        </p>
      </div>

      <div className="grid rounded-3xl bg-gray-100 shadow-sm ring-1 shadow-black/10 ring-black/10 transition-all lg:grid-cols-2 dark:bg-neutral-900">
        <div className="relative order-2 flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-b-3xl bg-neutral-900 p-4 md:p-8 lg:order-1 lg:rounded-l-3xl lg:rounded-r-none">
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/bg.jpg"
              alt=""
              fill
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-neutral-900/60" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 flex h-full w-full items-center justify-center"
            >
              {currentFeature.skeleton}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="order-1 space-y-3 rounded-t-3xl bg-gray-50 p-4 md:p-8 lg:order-2 lg:rounded-l-none lg:rounded-r-3xl dark:bg-neutral-950/20">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isActive={activeFeature === feature.id}
              onClick={() => setActiveFeature(feature.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  isActive,
  onClick,
}: {
  feature: Feature;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl transition-all duration-300",
        isActive
          ? "bg-white shadow-md ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-800"
          : "hover:bg-neutral-200/50 dark:hover:bg-neutral-800/30",
      )}
      layout
    >
      <div className="flex items-center gap-4 p-4 text-left">
        <div className="flex-1">
          <h3
            className={cn(
              "font-semibold text-neutral-700 transition-colors dark:text-neutral-200",
              isActive && "text-brand-primary dark:text-white",
            )}
          >
            {feature.title}
          </h3>
          <p
            className={cn(
              "mt-1 text-xs text-neutral-500 transition-opacity dark:text-neutral-400",
              !isActive && "opacity-60",
            )}
          >
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
