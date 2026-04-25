# OPUS Dashboard — UI Kit

Owner-facing SaaS: bookings, staff, AI inbox, finance, analytics. Recreates `opus-dashboard`.

## Components
- `Sidebar.jsx` — grouped left nav with workspace switcher, counts, user footer
- `TopBar.jsx` — sticky top bar with search, notifications, primary action
- `StatCard.jsx` — KPI tile (with optional terracotta glow for AI metrics)
- `Schedule.jsx` — today's appointments with status badges (done / now / upcoming)
- `Inbox.jsx` — AI-assisted message list with "AI handled" markers
- `RevenueChart.jsx` — 7-day bar chart (pure SVG, terracotta gradient)

## Flow
Click sidebar items to route the main content area. Home shows the KPI grid + Schedule + Revenue + Inbox. Other routes show the corresponding component or a stub placeholder.

## Source
Modeled after `opus-dashboard/` in `github.com/borkopp/opus`.
