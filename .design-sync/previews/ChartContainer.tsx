import { ChartContainer, ChartTooltip, ChartTooltipContent } from 'opus-dashboard-ui'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

const config = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
}

const data = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5100 },
  { month: 'Mar', revenue: 4800 },
  { month: 'Apr', revenue: 6300 },
  { month: 'May', revenue: 7200 },
  { month: 'Jun', revenue: 6900 },
]

export const RevenueBar = () => (
  <ChartContainer config={config} className="h-[220px] w-full" style={{ minWidth: 360 }}>
    <BarChart data={data}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
    </BarChart>
  </ChartContainer>
)
