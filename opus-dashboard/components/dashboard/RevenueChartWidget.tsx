"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, XAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function RevenueChartWidget({ revenueData, formatMoney }: any) {
  const [activeBar, setActiveBar] = useState<number | null>(null);

  // Identify today
  const today = new Date().getDay();
  const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = daysMap[today];
  const todayIndex = revenueData?.findIndex((d: any) => d.day.startsWith(todayName));

  return (
    <Card className="flex flex-col h-full bg-[#111111] dark:bg-card p-6 min-h-[300px] col-span-1 lg:col-span-2 rounded-[32px] transition-all duration-300">
      <div className="flex justify-between items-center mb-8 w-full px-1">
        <h2 className="text-xl font-semibold font-display text-white dark:text-primary leading-none">Revenue</h2>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 dark:bg-secondary border border-white/10 dark:border-border/40 text-[11px] font-bold text-white/70 dark:text-primary cursor-pointer hover:bg-white/10 transition-colors">
          Week <span className="text-[10px] opacity-40 ml-1">▼</span>
        </div>
      </div>

      <div className="flex-1 w-full h-[180px] mt-auto relative">
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
              tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
              tickMargin={12}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0 && payload[0]?.value !== undefined) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white rounded-2xl p-4 shadow-2xl border border-black/5 flex flex-col items-center animate-in fade-in zoom-in duration-200 -mt-12">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest leading-none mb-1.5">
                        {data.dayFull || data.day}
                      </span>
                      <span className="text-base font-black text-zinc-950 leading-none font-outfit">
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
              isAnimationActive={false} // Disable animation to ensure color changes are instant and visible
            >
              {revenueData?.map((entry: any, index: number) => {
                // Logic: Highlight if hovered, ELSE highlight if it's today AND nothing is hovered.
                const isHighlighted = activeBar !== null ? activeBar === index : index === todayIndex;

                // #FF725C is the primary terracotta/salmon color
                // #2A2A2A is a neutral gray that stands out on #111
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isHighlighted ? "#FF725C" : "#2A2A2A"}
                    style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
