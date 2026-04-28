"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { IconInfoCircle, IconSearch, IconMessages, IconCalendarCheck, IconSparkles } from "@tabler/icons-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    title: "AI Concierge",
    description: "Just type what you're looking for—from 'date night spots' to 'haircut now'—and let OPUS find you an available spot.",
    Icon: IconMessages,
    color: "#6366f1",
  },
  {
    title: "Curated Discovery",
    description: "Explore the best beauty, wellness, and hospitality spots, hand-picked for your location.",
    Icon: IconSearch,
    color: "var(--accent)",
  },

  {
    title: "Instant Booking",
    description: "See real-time availability and reserve your spot in seconds. No phone calls or account required.",
    Icon: IconCalendarCheck,
    color: "var(--online)",
  },
  {
    title: "Smart Learning",
    description: "OPUS learns your preferences over time to deliver increasingly personalized recommendations.",
    Icon: IconSparkles,
    color: "#f59e0b",
  },
];

export function HowItWorks() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = React.useState(false);

  const Content = (
    <div className="grid gap-6 py-4">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex gap-4 items-start p-3 rounded-2xl transition-colors hover:bg-white/5"
        >
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
            style={{ backgroundColor: `${step.color}15`, color: step.color }}
          >
            <step.Icon size={20} stroke={2} />
          </div>
          <div>
            <h4 className="font-medium text-white/95 mb-1">{step.title}</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              {step.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const trigger = (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 transition-colors hover:bg-white/10 group"
    >
      <IconInfoCircle
        size={16}
        className="text-[var(--accent)] group-hover:rotate-12 transition-transform"
      />
      <span className="text-xs font-medium text-white/70 group-hover:text-white/90 transition-colors">
        How it works
      </span>
    </motion.button>
  );

  const footer = (
    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
      <button
        onClick={() => setOpen(false)}
        className="px-6 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95"
      >
        Got it, thanks!
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[440px] bg-[#0A0A0A]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                <IconSparkles className="text-[var(--accent)]" size={24} />
              </div>
              How OPUS Works
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Your AI-powered gateway to the best local services.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
            {Content}
          </div>
          {footer}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[32px] bg-[#0A0A0A] border-white/10 text-white p-6 outline-none">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
              <IconSparkles className="text-[var(--accent)]" size={24} />
            </div>
            How OPUS Works
          </SheetTitle>
          <SheetDescription className="text-white/50 text-sm">
            Discover, book, and enjoy local gems.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto no-scrollbar">
          {Content}
        </div>
        {footer}
      </SheetContent>
    </Sheet>
  );
}
