# Dashboard design

Clarity is the production dashboard appearance. Its geometry comes from the
approved 01 design in `/dashboard-preview`. The original Studio reference is
retained there; production has no variant switcher or Studio theme yet.

## Organization

- `components/dashboard/clarity.module.css`: overview and navigation layout,
  responsive rules, and chart styling.
- `app/globals.css`: scoped Clarity semantic tokens and shared dashboard controls.
  Portalled dialogs, booking drawers, menus, and forms inherit these tokens.
- `DashboardHeader`, `DashboardAccountMenu`, `DashboardPageHeader`: shared shell.
- `components/dashboard/overview/OverviewLayout`: presentation and composition.
- `components/dashboard/overview/widgets/`: one component per metric/widget.
- `hooks/use-dashboard-overview`: reporting period, calendar selection, refresh.
- `convex/dashboardOverview`: authenticated, indexed overview reads.
- Route-specific settings, staff, services, notifications and assistant workspaces
  remain next to their pages. Existing mutations and access checks are preserved.

## Data and interaction

The overview uses studio wall-clock dates. Revenue comes from completed bookings,
with minor-unit amounts and seven non-overlapping chart buckets. Currency mixtures
are explicitly unavailable rather than silently summed. Client and service
analytics use the existing 30-day query; combined services retain a single price.
Weekly occupancy uses the existing availability-aware analyst calculation.

New appointments and open slots invoke the existing quick-booking drawer.
Appointment links open the selected date and booking in the calendar, where the
existing completion, cancellation, no-show and rescheduling actions remain.

The business assistant and manual opening-recovery widgets use real access and
configuration state. The deferred AI front desk is visibly marked `mock`, with a
TODO. Deferred settings have the same label; no new channel is enabled.

## Preview and verification

`/dashboard-preview/implementation` renders the production overview components
with clearly marked sample data, without connecting to a studio. It and the
original three-design reference return 404 outside development. This is a visual
harness, not an authentication bypass or a replacement for production queries.

Targeted coverage includes revenue boundaries, currency handling, studio dates,
weighted occupancy, tenant isolation, and appointment population. Authenticated
browser testing requires signing in to the local studio.
