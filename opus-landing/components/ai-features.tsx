"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChatConversation } from "./features-one/chat";
import { GapOptimizerSkeleton } from "./features-one/gap-optimizer-skeleton";
import { AnalysisUpsellSkeleton } from "./features-one/analysis-upsell-skeleton";

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

interface Feature {
  id: string;
  title: string;
  description: string;
  skeleton: React.ReactNode;
}

const InternalAiSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col p-6 space-y-6 overflow-hidden">
      {/* User Question */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="self-end max-w-[80%] p-3 rounded-2xl rounded-tr-none bg-primary/10 border border-primary/20"
      >
        <p className="text-xs text-background">Кој е мојот најслаб ден овој месец?</p>
      </motion.div>

      {/* Thinking State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="flex items-center gap-2"
      >
        <div className="size-1.5 rounded-full bg-primary/40 animate-bounce" />
        <div className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]" />
        <div className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]" />
      </motion.div>

      {/* AI Answer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 0.6 }}
        className="self-start max-w-[95%] w-full space-y-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="size-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-[10px] text-primary-foreground font-bold tracking-tighter">AI</span>
          </div>
          <span className="text-[10px] text-background/60 font-medium uppercase tracking-widest">Анализа на податоци</span>
        </div>

        <div className="p-4 rounded-xl bg-background/5 border border-background/10 backdrop-blur-md space-y-4">
          <p className="text-xs text-background/85 leading-relaxed font-medium">
            Врз основа на вашите 420 резервации овој месец, <span className="text-primary font-bold">Вторник</span> е вашиот најслаб ден со само 12% пополнетост.
          </p>
          
          <div className="space-y-3">
             <div className="space-y-1">
               <div className="flex justify-between text-[10px] text-background/55">
                 <span>Вторник (12%)</span>
                 <span className="text-primary">-65% vs просек</span>
               </div>
               <div className="h-1.5 w-full bg-background/10 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "12%" }}
                   transition={{ delay: 3.8, duration: 1 }}
                   className="h-full bg-primary"
                 />
               </div>
             </div>

             <div className="space-y-1">
               <div className="flex justify-between text-[10px] text-background/55">
                 <span>Викенд просек (88%)</span>
               </div>
               <div className="h-1.5 w-full bg-background/10 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "88%" }}
                   transition={{ delay: 4, duration: 1 }}
                   className="h-full bg-background/25"
                 />
               </div>
             </div>
          </div>

          <div className="pt-2 border-t border-background/10">
            <p className="text-[10px] text-background/60 italic">
              Совет: Пробајте со &apos;Happy Hour&apos; попуст од 20% помеѓу 14:00 и 17:00.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input bar placeholder */}
      <div className="mt-auto pt-4 relative">
        <div className="h-11 w-full bg-foreground/50 border border-background/10 rounded-lg px-4 flex items-center justify-between">
          <div className="h-2 w-32 bg-background/10 rounded" />
          <div className="flex gap-2">
            <div className="size-6 rounded-lg bg-background/5 border border-background/10" />
            <div className="size-6 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
               <div className="size-2.5 border-r-2 border-t-2 border-primary rotate-45 -translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const features: Feature[] = [
  {
    id: "ai-assistant",
    title: "AI рецепција",
    description:
      "Вашиот личен AI агент кој одговара на клиенти, закажува термини и решава прашања 24/7. Интеграција со Instagram, Facebook и WhatsApp.",
    skeleton: (
      <div className="flex h-full w-full flex-col items-center justify-center p-4">
        <ChatConversation className="max-h-[300px] w-full" />
      </div>
    ),
  },
  {
    id: "gap-optimizer",
    title: "AI оптимизатор на термини",
    description:
      "Паметно скенирање на вашиот календар за 'дупки'. Автоматски наоѓа соодветни клиенти и им нуди термин за да го максимизирате профитот.",
    skeleton: (
      <div className="flex h-full w-full items-center justify-center p-2">
        <GapOptimizerSkeleton className="scale-90" />
      </div>
    ),
  },
  {
    id: "analysis-upsell",
    title: "AI анализа & Upsell",
    description:
      "Добијте паметни предлози за продажба и детали за секој клиент. AI ги анализира навиките и ви кажува што точно да понудите за поголема заработка.",
    skeleton: (
      <div className="flex h-full w-full items-center justify-center">
        <AnalysisUpsellSkeleton className="scale-90" />
      </div>
    ),
  },
  {
    id: "internal-ai",
    title: "Внатрешен AI асистент",
    description:
      "Директен пристап до сите податоци на вашиот бизнис преку паметен чет. Прашајте што било — од анализи на профит до совети за оптимизација.",
    skeleton: (
      <div className="flex h-full w-full items-center justify-center">
        <InternalAiSkeleton />
      </div>
    ),
  },
];

export function FeatureSectionWithTerminal() {
  const [activeFeature, setActiveFeature] = useState<string>("ai-assistant");

  const currentFeature = features.find((f) => f.id === activeFeature)!;

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:px-8">
      <div className="mb-12 w-full text-left">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
          Моќна вештачка интелигенција
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-white/85">
          OPUS користи најнапредна AI технологија за да го автоматизира вашето работење.
          Фокусирајте се на работата, а нашите AI агенти се грижат за администрацијата.
        </p>
      </div>

      <div className="grid rounded-xl border border-border bg-card shadow-sm lg:grid-cols-2 transition-all">
        <div className="relative order-2 flex min-h-[400px] h-full items-center justify-center bg-foreground p-4 md:p-8 lg:order-1 rounded-b-xl lg:rounded-l-xl lg:rounded-r-none overflow-hidden">
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

        <div className="order-1 space-y-3 p-4 md:p-8 lg:order-2 bg-muted/30 rounded-t-xl lg:rounded-r-xl lg:rounded-l-none">
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
          ? "bg-card shadow-md ring-1 ring-border"
          : "hover:bg-muted/70",
      )}
      layout
    >
      <div className="flex items-center gap-4 p-4 text-left">

        <div className="flex-1">
          <h3
            className={cn(
              "font-semibold text-foreground transition-colors",
              isActive && "text-primary"
            )}
          >
            {feature.title}
          </h3>
          <p className={cn(
            "text-xs mt-1 text-muted-foreground transition-opacity",
            !isActive && "opacity-60"
          )}>
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
