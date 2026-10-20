# Studio analytics

The web dashboard's `/beauty/analytics` workspace combines appointment charts,
the client directory and configurable reports. It replaces the Clients
navigation entry; existing `/beauty/clients` links redirect to Analytics.
This capability was authorized on October 20, 2026.

## Access and data boundaries

Live analytics, the full client directory, client profiles and report exports
require Pro. Backend reads derive the studio from the signed-in user's active
staff membership and check the current plan. Owners, managers and staff with
broader studio access can use the workspace; accounts restricted to their own
appointments cannot read studio-wide analytics or client records. Each data read
uses the studio's named `orgId` indexes. A downgrade blocks subsequent live reads
without deleting customers or appointment history.

Free studios see an explicitly labelled preview with synthetic charts and a
limited sample client list. Sample names are blurred, and no real customer names,
contact details or booking records are loaded for this preview. Contact details
needed to create and manage appointments remain available through the existing
booking journey.

## Periods and metrics

The analytics controls select 1–12 consecutive calendar months, a staff member
and currency. Month boundaries use the studio's booking wall clock. Comparison
uses the immediately preceding range with the same number of calendar months;
an incomplete current month is therefore compared with a full preceding month.
Appointment counts, status breakdowns and client counts include all currencies;
monetary values use only the selected currency, without conversion.

- Completed appointment value is the sum of stored prices on completed,
  non-deleted appointments. It is not collected revenue, a payment balance or
  profit.
- Completed visits count completed, non-deleted appointments in the selected
  period. Future appointments marked completed and appointments for deleted
  clients are excluded.
- Clients count distinct clients with completed visits in the selected period.
- Returning clients have a completed studio visit before the selected period;
  new clients have their first completed studio visit within it. This
  classification considers prior visits with any staff member and currency.
- Appointment statuses describe recorded bookings in the period, including
  cancellations and no-shows. A booking's scheduled start determines its period.
- Service counts include each service in a completed booking. A booking with
  multiple services contributes once to each service, so service counts can
  exceed completed visits. The booking's full price is never duplicated across
  services.

A single-month trend shows daily points; longer ranges show monthly points.

Automatic appointment completion is enabled by default for all active beauty
studios, including Free studios. Each appointment uses a durable scheduled job
at its studio-timezone end; there is no recurring completion poll. The global
emergency stop is `BOOKING_AUTO_COMPLETION_ENABLED=false`. Existing future
appointments require the explicit setup operation described in
[`BOOKING_COMPLETION.md`](BOOKING_COMPLETION.md); untouched past appointments
retain their recorded statuses. Staff can correct completed appointments to
no-shows, which removes them from completion metrics. Automatic completion
records scheduled activity and does not prove attendance or payment.

The client directory remains an **all-time** view. Its search, segment and sort
controls apply to the directory, independently of the period charts. Opening a
client shows their existing studio-scoped profile, appointment history and
upcoming appointments. Directory totals continue to use completed appointments
and keep different currencies separate.

## Reports

The report builder uses the current month range, staff and currency selection.
Staff can choose summary, trend, service and client sections, and whether to
include the preceding-period comparison in the summary. The client section is
optional and off by default. It includes clients with completed visits in the
selected period, their names, visit counts, selected-currency appointment value,
new/returning classification, first studio visit and last visit in the period.
It excludes contact details, private notes and internal record identifiers.

Reports are downloaded as CSV or a printable HTML document. The printable
document can be opened in a browser and printed or saved as PDF using the
browser's print controls. Exporting does not send a report to customers, create
a scheduled report or change appointments. Reports include every row in the
selected sections; the five-service chart limit and client-directory pagination
do not truncate exports. Each export uses a server action to fetch current
analytics and check membership and Pro access again. Previously displayed query
results are not used to authorize the export.

The backend returns an explicit error instead of a partial report when its
bounds are exceeded: 10,000 bookings in the current/comparison window, 10,000
completed appointments in studio history, 5,000 client records, 200 staff
records or 500 services. These bounds apply to queried records, including
soft-deleted records before metric filtering.

An analytics loading error is isolated from the client directory. Paid studios
can continue searching clients and viewing profiles while charts and reports
show a retry state. Retrying analytics does not reset client search or an open
profile. The client directory retains its own existing membership, plan and
database limits.

No analytics provider credentials or AI model are needed. The live dashboard
requires the compatible Convex analytics backend before the frontend release.
Local checks establish implementation behavior, not a production deployment or
real studio adoption.
