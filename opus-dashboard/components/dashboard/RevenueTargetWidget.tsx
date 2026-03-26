"use client"

import { Target } from "lucide-react"
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

export function RevenueTargetWidget({ revenueTodayMinorUnits, formatMoney }: { revenueTodayMinorUnits: number, formatMoney: (v: number) => string }) {
  // Assume daily target is £400 (40000 minor units) for now
  const dailyTargetMinorUnits = 40000;

  const revenue = revenueTodayMinorUnits / 100;
  const target = dailyTargetMinorUnits / 100;

  // Cap visual revenue at target so it doesn't break the shape
  const visualRevenue = Math.min(revenue, target);
  const remaining = Math.max(target - revenue, 0);

  const percentage = Math.round((revenue / target) * 100);

  // Colour shifts: red → amber → green
  let progressColor = "hsl(var(--destructive))";
  if (percentage >= 100) progressColor = "#10B981"; // Success Green
  else if (percentage >= 80) progressColor = "hsl(var(--primary))"; // Primary Green
  else if (percentage >= 50) progressColor = "#F59E0B"; // Amber

  const chartData = [{
    name: "Revenue",
    revenue: visualRevenue,
    remaining: remaining
  }];

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: progressColor,
    },
    remaining: {
      label: "Remaining",
      color: "hsl(var(--secondary))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col h-full bg-card rounded-[24px]">
      <CardHeader className="items-center">
        <CardTitle className="text-xl font-semibold font-display text-primary flex items-center gap-2"> Today's Goal
        </CardTitle>
        <CardDescription>Are we on track today?</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 items-center justify-center pt-10">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[200px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={180}
            endAngle={0}
            innerRadius={90}
            outerRadius={130}
          >
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 15}
                          className="fill-foreground text-3xl font-bold font-outfit"
                        >
                          {formatMoney(revenueTodayMinorUnits).replace(/\.00$/, '')}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground text-sm font-semibold uppercase tracking-wider font-outfit"
                        >
                          Target {formatMoney(dailyTargetMinorUnits).replace(/\.00$/, '')}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="revenue"
              stackId="a"
              cornerRadius={5}
              fill={progressColor}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="remaining"
              fill="hsl(var(--muted))"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>

      {/* <CardFooter className="flex-col gap-2 text-sm justify-center pb-5">
        <div className="flex items-center gap-2 font-bold text-center">
          <span className="text-[16px]" style={{ color: progressColor }}>
            {percentage}% Achieved
          </span>
        </div>
      </CardFooter> */}
    </Card>
  )
}
