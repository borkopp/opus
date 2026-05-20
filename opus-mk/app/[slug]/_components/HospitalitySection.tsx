"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import Markdown from "react-markdown";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Tab = "general" | "menu" | "hours";

type HourEntry = {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function OpeningHoursTable({ hours }: { hours: HourEntry[] }) {
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="space-y-1">
      {sorted.map((h) => {
        const isToday = h.dayOfWeek === todayIndex;
        return (
          <div
            key={h.dayOfWeek}
            className={`flex items-center justify-between py-1.5 px-3 rounded-xl text-sm ${
              isToday ? "bg-white/5 font-semibold" : ""
            }`}
          >
            <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
              {DAYS[h.dayOfWeek]}
              {isToday && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Today
                </span>
              )}
            </span>
            {h.isClosed ? (
              <span className="text-red-400/70 text-xs font-medium">Closed</span>
            ) : (
              <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
                {h.open} – {h.close}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  openingHours?: HourEntry[];
  menuText?: string;
  venueType?: string;
  cuisine?: string[];
  priceRange?: string;
  tags?: string[];
}

export function HospitalitySection({
  openingHours,
  menuText,
  venueType,
  cuisine,
  priceRange,
  tags,
}: Props) {
  const hasTabs = {
    menu: !!menuText,
    hours: !!(openingHours && openingHours.length > 0),
  };

  const defaultTab: Tab =
    venueType || cuisine?.length || priceRange || tags?.length
      ? "general"
      : hasTabs.menu
      ? "menu"
      : "hours";

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: "general", label: "General", visible: true },
    { id: "menu", label: "Menu", visible: hasTabs.menu },
    { id: "hours", label: "Opening hours", visible: hasTabs.hours },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
      }}
    >
      <Separator className="my-3" />

      {/* Tab bar */}
      <div className="flex gap-5 border-b border-border/40 mt-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-5 pb-4">

        {/* ── General ── */}
        {activeTab === "general" && (
          <div className="flex flex-wrap gap-2">
            {venueType && (
              <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                {cap(venueType)}
              </span>
            )}
            {cuisine?.map((c) => (
              <span key={c} className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                {cap(c)}
              </span>
            ))}
            {tags?.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                {cap(t)}
              </span>
            ))}
            {priceRange && (
              <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                {priceRange === "budget" ? "€ Budget" : priceRange === "mid" ? "€€ Mid-range" : "€€€ Premium"}
              </span>
            )}
            {!venueType && !cuisine?.length && !tags?.length && !priceRange && (
              <p className="text-sm text-muted-foreground">No details available yet.</p>
            )}
          </div>
        )}

        {/* ── Menu ── */}
        {activeTab === "menu" && menuText && (
          <Markdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-6 mb-2 first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-5 mb-2">
                  {children}
                </h3>
              ),
              ul: ({ children }) => <ul className="space-y-1 mb-2">{children}</ul>,
              li: ({ children }) => (
                <li className="flex items-baseline gap-2 text-[14px] text-foreground/80 leading-snug">
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span>{children}</span>
                </li>
              ),
              p: ({ children }) => (
                <p className="text-[14px] text-foreground/60 leading-relaxed mb-2">{children}</p>
              ),
            }}
          >
            {menuText}
          </Markdown>
        )}

        {/* ── Opening hours ── */}
        {activeTab === "hours" && openingHours && openingHours.length > 0 && (
          <OpeningHoursTable hours={openingHours} />
        )}

      </div>
    </motion.div>
  );
}
