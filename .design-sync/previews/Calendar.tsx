import { Calendar } from 'opus-dashboard-ui'

export const SingleDate = () => (
  <Calendar
    mode="single"
    defaultMonth={new Date(2026, 5, 1)}
    selected={new Date(2026, 5, 18)}
    className="rounded-md border"
  />
)

export const Range = () => (
  <Calendar
    mode="range"
    defaultMonth={new Date(2026, 5, 1)}
    selected={{ from: new Date(2026, 5, 9), to: new Date(2026, 5, 13) }}
    className="rounded-md border"
  />
)
