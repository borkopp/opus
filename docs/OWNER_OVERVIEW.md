# Private owner overview

## Current release — 30 September 2026

The business activity expansion is deployed at `https://admin.opus.mk` through
Vercel production deployment `dpl_HvCUP3BXd3mYgdF1ekFDGgxdPTuQ` (READY).
`ownerActivity:page` and the additive `audit_log.by_org_resource` index are
deployed to the existing production Convex deployment `calm-dachshund-294`.

Verified in the owner's existing signed-in browser session: production bookings
and their details, audit records, and team sign-in records load successfully.
Anonymous activity requests return 401; foreign-origin activity requests return 403. The temporary local preview route returns 404 in production. The landing,
studio login, and an existing published tenant website return HTTP 200.
Before release, 30 targeted tests, owner lint/typecheck/build, backend typecheck,
and synthetic desktop/mobile UI checks passed. No OTP bypass or new tracking
was added. Only the owner app and shared owner contracts were uploaded to Vercel;
unrelated dashboard frontend edits were excluded.

## Original release — 11 September 2026

The owner app is deployed and `admin.opus.mk` is verified on the independent
Vercel project `opus-owner`. The additive analytics module/index is deployed to
the existing production Convex deployment. Production auth trusts the exact
studio and admin origins; the studio `SITE_URL` is unchanged.

This release was uploaded through the Vercel CLI from the working-tree sources,
not connected to automatic Git deployment. The new source files must be retained
in future repository releases, particularly before another dashboard backend
deployment. Future owner releases should upload the repository with project root
`opus-owner/` and include `shared/`.

Verified: production build and dependency install, owner app lint/typecheck,
seven backend owner tests, three auth-proxy tests, desktop/mobile UI and filters
with a clearly separate fixture, live unauthorized/foreign-origin/other-email
rejection, and HTTP 200 for the existing landing and studio login. The owner
package's dependency audit reports zero known vulnerabilities after updating its
independent Next.js runtime to 16.3.4. The owner completed real email-code sign-in
at `admin.opus.mk` and confirmed that the overview loads. No bypass session or
test OTP was added to production. An unpublished tenant subdomain also returned
its expected safe 404, without exposing the owner dashboard.

Broader pre-existing dashboard checks are not fully green: the
`booking-email-flow.test.ts` invalid-phone fixture fails whole-app typechecking,
and an `activation.test.ts` fixture exceeds the Free-plan staff limit. The
backend-only TypeScript check passes; 55 of 56 selected booking/tenant/activation
regression tests passed. These unrelated fixtures and studio dependencies were
left unchanged.

`opus-owner/` is a separate Next.js application for the OPUS platform owner. Its
production address is **https://admin.opus.mk** and its local port is **3002**.
It has one overview page and an email-code sign-in screen at the same `/` URL.
There is no link to it in the business dashboard, landing page or tenant sites.

## Isolation and access

- Deploy it as its own Vercel project with root directory `opus-owner/`.
- Keep `opus.mk`, `studio.opus.mk` and `*.opus.mk` on their existing projects.
  Assign the exact `admin.opus.mk` domain to the owner project. `admin` was
  already reserved in the tenant slug registry, so no tenant routing changes
  are needed. Follow the exact DNS verification records Vercel supplies; do not
  move the wildcard or change nameservers for this app.
- It uses the existing Convex deployment and Better Auth email delivery. No
  separate database, replicated customer data or new OTP service is needed.
- The allowlist is exactly `borko.petrevski@gmail.com`, defined once in
  [`shared/owner-access.ts`](../shared/owner-access.ts). It is a server-side rule,
  not an editable profile field, business-owner role, client email or public
  environment variable. Gmail aliases and other addresses are rejected.
- The owner auth proxy permits only sign-in code requests, code verification and
  sign-out. It requires the configured exact origin. Other auth endpoints are
  unavailable on this app. Existing studio sign-in remains unchanged.
- The existing auth provider hashes OTPs, expires them after five minutes,
  limits verification to five attempts, and stores rate limits in the database.
- Every analytics entry point and internal page read checks the persisted
  Better Auth user, verified email and unexpired session. This also checks at
  the end of collection. The owner needs no studio membership.
- Production cookies remain host scoped; cross-subdomain cookies are not enabled.
  Localhost ports share browser cookies, so local sign-out can also sign out
  another local OPUS session. Use separate browser profiles if necessary.
- Responses are private/no-store. Metadata and response headers forbid indexing
  and framing. No analytics SDK, public analytics endpoint, deploy key or admin
  token is added to the browser.

## What it shows

- Existing beauty businesses, recent creations and six months of creation counts.
- Saved public website state (published, unpublished, suspended), and a link to
  each published studio website. Marketplace publication is not used.
- Free/Paid plan distribution. These are plan flags, not billing receipts or MRR.
- Active services and staff, non-deleted customer records and bookings per studio.
- Bookings created in the last 30 days, currently cancelled bookings from that
  group, and businesses with at least one new booking.
- Retained file count and bytes across the **entire Convex deployment**; image
  file count/bytes use storage MIME metadata.
- Per-business linked image counts/bytes, external images with unknown sizes,
  and missing file references when identifiable.
- Search, plan/website filters, sorting by creation/storage/recent bookings and
  a paginated business table.

### Business activity expansion — 30 September 2026

The deployed owner app includes a read-only business activity panel. Future
releases must retain `convex/ownerActivity.ts` and the additive
`audit_log.by_org_resource` index in the backend, and deploy them before the
owner app when updating the shared contract.

Use **View activity** on a business or the business selector to inspect:

- **Bookings:** paginated, non-deleted booking records, with a status filter;
  client name/email/phone, current service names and assigned staff, stored
  booking channel, recorded creation actor, appointment times, creation/update
  timestamps, price snapshot and currency, notes, cancellation reason and
  recovery-offer attribution when present. Appointment value is not payment
  revenue. Legacy channels are labelled as legacy, not advertised as available.
- **Audit history:** paginated recorded actions, time, actor and resource reference.
  Only recognized scalar changes are exposed from `before`/`after`; arbitrary
  provider payloads, auth tokens, IP addresses and user agents are not returned.
  Price changes use minor units. It is not a complete history of every action.
- **Team sign-ins:** retained non-deleted team seats, linked account email, role,
  active status, newest retained auth session creation time and its expiry.
  There is no permanent `lastLoginAt` field. Removed/signed-out sessions may
  leave no timestamp; this must not be described as "never logged in".
  An unexpired session does not establish that someone is online. Session
  tokens are never returned, and auth reads use the component's `userId` index
  for accounts linked from the selected studio's staff only.

The booking creator is resolved from the existing `booking.created` audit entry,
not inferred from the assigned provider. Older `dashboard` entries cannot identify
the individual staff member, and missing creators are labelled explicitly.
Deleted or foreign client/staff/service references are not resolved into contact
data. Names reflect current records because historical name snapshots are not stored.

Activity reads are independently paginated in batches of up to 25 records and
250 KB; deleted records can leave a short or empty page with a continuation.
Each request checks the same verified platform-owner access and eligible beauty
business roots as the overview. Tenant lists and booking audit lookup use named
organization indexes. The supplied business ID selects the report and never
grants access. Reads perform no writes and introduce no tracking. Times use
Europe/Skopje. Activity refresh is manual, and reads across pages are not a
single database snapshot. Session expiry clears the private UI.

Deleted businesses, unclaimed scraped listings and dormant hospitality businesses
are excluded from business metrics. Claimed imports use their original creation
timestamp because a separate signup timestamp is not stored. Signup chart months
use UTC. Customers count per business, not deduplicated people across businesses.

Storage totals include detached files, old uploads and legacy data because they
still consume storage. Linked images include non-deleted gallery, logo, service,
staff and customer avatar references. Stored files are matched using their actual
Convex download URLs, not by assuming the URL token is a database ID. The same
stored file counts once globally and once in each business that references it.
External files are not downloaded to estimate their sizes. No upload, cleanup,
deletion or file ownership migration is introduced.

Storage units are decimal KB/MB/GB. Database size, bandwidth, provider billing,
payment revenue, page views and uptime are not measured by this overview.

## Reading strategy

`convex/ownerAnalytics.ts` is the explicitly authorized platform-reporting
exception to normal single-tenant access. It enumerates beauty organization roots
through `by_industry_created` and storage through Convex's global `_storage`
system table. Every business-owned table still uses its named `by_org` index.
These enumeration functions are internal and owner guarded, never ordinary public
tenant queries.

Collection is on demand on page open or manual refresh. There are no live scans,
cron jobs or writes in the booking path. Backend reads are paginated and byte
bounded; failure never returns a partial total as complete. The current scan
budget is 10,000 read pages or eight minutes; the web request has a five-minute
ceiling, subject to the hosting plan. At larger scale, replace full scans with
scheduled snapshots before expanding these limits. This is intended for the
current small-studio phase, not a warehouse for millions of rows.

Pages are read sequentially rather than as a single database snapshot. The screen
shows the collection time and explains that writes during collection can appear
on the next refresh. Refreshes do not run automatically in the background.

## Local setup

1. `cd opus-owner && npm ci`
2. Copy `.env.example` to `.env.local`; use the dashboard's public local Convex
   addresses and `OWNER_SITE_URL=http://localhost:3002`.
3. Keep the existing dashboard Convex dev process running so the additive owner
   module and index are synchronized. If it is not running, start
   `npm run dev:backend` in `opus-dashboard/`.
4. `npm run dev`, then open http://localhost:3002.

The existing local Better Auth origin list also permits port 3002. Local OTP
delivery follows the existing auth configuration; console codes are only supported
by the existing local-only mode. Never enable a fixed or console OTP in production.

## Production setup

First release the additive Convex index and owner analytics functions from
`opus-dashboard/`. The owner app itself never runs `convex deploy` and must not
receive `CONVEX_DEPLOY_KEY`.

Create a Vercel project rooted at `opus-owner/`, use Node 24, and enable inclusion
of source files outside the root directory so it can import the two small
`shared/` contracts. Its own `vercel.json` specifies `npm ci` and `npm run build`.

Set these environment variables on the **owner Vercel project**:

```dotenv
NEXT_PUBLIC_CONVEX_URL=https://<production-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<production-deployment>.convex.site
OWNER_SITE_URL=https://admin.opus.mk
NEXT_PUBLIC_ROOT_DOMAIN=opus.mk
TURNSTILE_SITE_KEY=<public-widget-key>
AUTH_PROXY_SECRET=<same-private-proxy-secret-as-dashboard-and-Convex>
```

Account OTP protection was added on October 3, 2026. The owner app retains its
exact email allowlist and same-origin guard, then signs country/IP/hostname and
request contents for the shared backend. It uses the same Managed Turnstile
widget with `admin.opus.mk` allowed. CAPTCHA is required outside MK, RS, and AL;
rate limits apply everywhere. Keep the Siteverify secret only in Convex. See
[`AUTH_ABUSE_PROTECTION.md`](AUTH_ABUSE_PROTECTION.md) for policy and live checks.
The small shared auth/security and widget helpers live in `shared/`; the owner
app continues to build independently from the dashboard.

Use the production addresses already used by the studio application. Unlike the
dashboard build, the owner build does not have a Convex deploy command to inject
them. Preserve all existing values while adding `https://admin.opus.mk` to
`AUTH_TRUSTED_ORIGINS` in the **production Convex environment**. Keep
`SITE_URL=https://studio.opus.mk` unchanged. Keep auth provider secrets in Convex.

Attach `admin.opus.mk` to the owner Vercel project and complete any exact-domain
DNS verification requested by Vercel. Do not enable public arbitrary preview
origins against production auth/data. Preview environments should use development
Convex data, their exact origin and Vercel deployment protection.

Verify owner OTP sign-in, rejection of another email, unauthenticated analytics
rejection, sign-out, publication counts and one known file size. Confirm the
landing, studio login and one tenant site still serve their existing content.

The independent domain arrangement follows [Vercel's project/domain guidance](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
Byte totals use [Convex storage metadata](https://docs.convex.dev/file-storage/file-metadata).

## Checks

From `opus-owner/`: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`,
`npm run build`. From `opus-dashboard/`: run
`npm test -- tests/convex/owner-analytics.test.ts` and the existing tenant/booking
checks for a release. The owner tests cover direct backend authorization,
persisted versus spoofed identity, verification/expiry, tenant pagination,
publication semantics and storage deduplication.
