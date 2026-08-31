"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, XAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";

interface RevenueDataItem {
  day: string;
  currentWeek: number;
  dayFull?: string;
}

interface RevenueChartProps {
  revenueData: RevenueDataItem[];
  formatMoney: (val: number) => string;
}

export function RevenueChartWidget({ revenueData, formatMoney }: RevenueChartProps) {
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const containerVars = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1
      }
    }
  } satisfies Variants;

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  } satisfies Variants;

  // Identify today
  const today = new Date().getDay();
  const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = daysMap[today];
  const todayIndex = revenueData.findIndex((item) => item.day.startsWith(todayName));

  return (
    <motion.div
      variants={containerVars}
      initial="hidden"
      animate="visible"
      className="h-full col-span-1 lg:col-span-2"
    >
      <Card className="flex min-h-0 h-full flex-col bg-card p-6 text-card-foreground transition-shadow duration-300 hover:shadow-md">
        <motion.div variants={itemVars} className="flex justify-between items-center mb-6 w-full px-1">
          <WidgetTitle>Revenue</WidgetTitle>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Week <span className="text-[10px] opacity-40 ml-1">▼</span>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVars} className="flex-1 w-full min-h-[160px] mt-auto relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={revenueData}
              margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              onMouseMove={(v) => {
                if (v && v.activeTooltipIndex !== undefined) {
                  setActiveBar(v.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveBar(null)}
            >
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={{ fill: "var(--muted-foreground)", fontWeight: 500 }}
                tickMargin={12}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0 && payload[0]?.value !== undefined) {
                    const data = payload[0].payload as RevenueDataItem;
                    return (
                      <div className="bg-card rounded-lg p-3 shadow-m border border-border flex flex-col items-center animate-in fade-in zoom-in duration-200 -mt-12">
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                          {data.dayFull || data.day}
                        </span>
                        <span className="text-base font-black text-foreground leading-none font-display">
                          {formatMoney((payload[0].value as number) * 100)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="currentWeek"
                radius={[12, 12, 12, 12]}
                maxBarSize={45}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {revenueData.map((entry, index) => {
                  // Logic: Highlight if hovered, ELSE highlight if it's today AND nothing is hovered.
                  const isHighlighted = activeBar !== null ? activeBar === index : index === todayIndex;

                  // Use brand cobalt for highlighted bars and muted border for others
                  return (
                    <Cell
                      key={`${entry.day}-${index}`}
                      fill={isHighlighted ? "var(--brand)" : "var(--border)"}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </Card>
    </motion.div>
  );
}
