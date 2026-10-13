# Restaurant and café implementation

Status: on 13 October 2026, the user authorized normal self-service restaurant/café onboarding alongside beauty, with no pilot allowlist or hospitality enablement environment variables. Both choices are available in the local application and release source. **Nothing is deployed; production remains unchanged until an explicitly authorized release.** See [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md).

## Development branch and release boundary

Continue hospitality feature work on `codex/hospitality-vertical`. This branch preserves the reservation implementation, shared onboarding/navigation, audit fixes, dependency updates, and beauty/hospitality regression suites. `main` receives only the separately reviewed beauty billing and AI Receptionist presentation changes plus the Git deployment safeguards; SMS backend retirement and all hospitality/backend work remain on this development branch.

The dashboard and landing Vercel configurations disable automatic deployment of `codex/hospitality-vertical`. Their ignored-build command also cancels builds for commits whose message contains `[skip deploy]`; the branch-preparation commits use that marker. Ordinary unmarked `main` commits retain automatic deployment, including the dashboard's Convex deployment step. Do not merge this branch or remove the deployment safeguard until a release is explicitly authorized. These are Git deployment controls, not hospitality feature flags or application environment variables.

GitHub Actions runs the isolated release checks on pushes to this branch and on relevant pull requests. Continue using `npm run test:release` from `opus-dashboard/` before release, and keep local `.env`, databases, build output and browser artifacts untracked.

## Access and isolation

After business-account email verification, `/onboarding` asks the user to choose **Beauty** or **Restaurants and cafés** before creating an organization. Beauty continues through its existing setup. Hospitality asks for the venue name, then an explicit Café or Restaurant card choice. **These are the only two required details before opening the dashboard.** No address, phone, hours, tables or publication is required to enter it. A tab-private draft preserves progress across refresh before creation; the saved organization is authoritative afterwards. Existing businesses resume their workspace, while client authentication and invitation acceptance retain their dedicated destinations.

The dashboard's setup guide links directly to venue details, hours/rules, tables and preview/publication. It updates from server readiness as work is completed. Combinations and team invitations can be added later. Creating a venue does not publish it: public booking and staff creation remain governed by reservation readiness, and only an owner can publish. Older venues with missing or invalid reservation settings can open their dashboard without triggering failing day queries; they see a settings-review notice.

## Dashboard navigation

Hospitality reuses beauty's dashboard header, appearance, page headings, desktop navigation and mobile bottom tabs. Its three destinations are **Reservations**, **Tables**, and **Venue setup**. The account menu retains business identity, language, cookie preferences and sign-out without exposing beauty subscription, notification, or AI controls.

- **Reservations** (`/hospitality`): service-date selector, daily counts, guest rows, and direct arrival/seating/completion controls. Rescheduling, moving tables, changing duration, cancellation, no-show and owner-only anonymization are grouped in each reservation's action menu. Cleaning controls remain visible.
- **Tables** (`/hospitality/tables`): current table status grouped by area for all staff. Owners and managers also have separate Tables, Areas and Combinations management sections. This is the current floor state; future allocations and visit actions remain in Reservations.
- **Venue setup** (`/hospitality/setup`): Venue details, Hours & rules, Closures, owner-only Team, and Website. Desktop uses the existing settings sidebar; narrow screens use a section selector. Staff can view table status and manage visits but cannot edit venue resources or settings. The old `/hospitality/setup?tab=tables` link redirects to table management.

Service periods and everyday reservation settings appear first in Hours & rules. Less frequently changed staff timing settings are grouped under Staff adjustments. These are presentation changes; backend validation, publication readiness, tenant boundaries and revision checks remain authoritative.

Review fixes: closure edits preserve the saved UTC instant and each endpoint's first/second occurrence during daylight-saving fall-back. Separate occurrence controls appear only when the selected local time repeats. Inactive areas no longer hide a table's occupied/cleaning state. Reservation success feedback uses one non-interactive message at the top so consecutive visit actions and mobile navigation remain clickable.

No deployment-level enablement flag, pilot email list or per-organization pilot grant participates in authorization. Any historical stored pilot field is inert and retained only for document compatibility. Restaurant/café type, active membership and role checks still apply. Public websites and new guest reservations additionally require explicit publication and current reservation readiness, including resolved legacy allocations.

## Persistent local test venue

The local development backend at `http://127.0.0.1:3210` can retain **OPUS Test Kitchen & Café** as a separate test organization from a beauty studio. This fixture is local data, not a production seed or an account grant. Select an available business with the dashboard's business switcher.

- Staff operations: `http://localhost:3000/hospitality`
- Tables and combinations: `http://localhost:3000/hospitality/tables`
- Venue setup: `http://localhost:3000/hospitality/setup`
- Guest reservations: `http://localhost:3000/reserve/opus-test-kitchen-cafe`
- Local tenant website: `http://opus-test-kitchen-cafe.localhost:3000`

The venue has three two-seat tables, **A**, **B**, and **C**, in Main room. Staff-defined combinations **A + B** and **B + C** each accept parties of three or four. A reservation on either combination consumes B, so the other combination cannot be allocated during the same visit and reset interval. To exercise this, create a four-person phone reservation with A + B, then check the same time for another party of four. Cancel the first reservation to release its future allocation, or seat/finish the visit and mark the tables ready to exercise cleaning.

Test rules: daily 08:00–23:00 service in Europe/Skopje, last seating 21:45, 60-minute visits, 15-minute reset buffer and slot intervals, parties of 1–4, zero advance/cancellation notice, walk-ins enabled, and no scheduled reminders. Venue type can be changed between Restaurant and Café in Venue setup. Address and phone are labeled demo data. The venue starts with no reservations or invitations.

`SITE_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`, and `NEXT_PUBLIC_CLIENT_ACCOUNT_URL` point to the port-3000 local frontend, including links in reservation emails. The frontend overrides are in ignored `.env.local`; no production configuration files or credentials were changed. Existing email providers are retained: guest verification and reservation operations can send email, so use your own inbox for testing. Local setup does not itself verify provider delivery.

To stop new public reservations, unpublish the venue in **Venue setup → Website**. Existing visits remain manageable by authorized staff and guests. Publishing again requires readiness checks; no environment-variable setup is needed.

Local publication makes the website available from the running development server; it is not a deployment.

## Account access

New venue creation requires a signed-in account with a verified Better Auth email. A beauty owner may create a separate venue; a beauty studio is never converted. Existing membership, role, invitation, organization-switching, and tenant-private customer foundations are reused. Owners publish and manage access, managers configure operations, and staff handle visits. Tables are resources, not bookable employees.

Beauty entry points reject hospitality organizations server-side. Restaurant setup and navigation do not load beauty service, calendar, activation, paid-plan, or AI interfaces. Public tenant-host checks remain in force, and unpublished sites are not discoverable. Reservation pages and management links are excluded from analytics. The dormant marketplace, native consumer applications, and AI restaurant booking remain unchanged and disabled.

## Implemented journeys

1. **Owner onboarding and setup:** enter the venue name, choose Café or Restaurant, and open the dashboard. Later, enter profile/contact details, configure timezone and service periods, add areas and physical tables, define optional combinations, set closures and policies, invite the team, preview the actual website, and publish only after server readiness checks pass. No fake beauty services or employee availability are created.
2. **Guest booking:** tenant website → central reservation page → party size and operating date → server-derived time → contact details → real email OTP → atomic confirmation. No account or temporary table hold is required. A conflicting confirmation leaves no orphan reservation or customer write.
3. **Guest management:** the confirmation provides an expiring, revocable proof link. Viewing the link performs no mutation. The guest explicitly changes or cancels within policy, retaining the reservation ID and increasing its revision. Arrival closes guest changes. Optional client sign-in can claim the reservation after an email-ownership check; returning clients use their verified session.
4. **Staff operations:** phone, manual, and walk-in entry; day list; arrival; seating; rescheduling; table changes; dining-duration changes; cancellation; no-show; completion; and explicit table readiness after cleaning. Every write rechecks capacity and the current revision inside a mutation. Stale edits do not overwrite another staff member's action.
5. **Notifications:** reservation-specific templates reuse the provider queue, retries, delivery-time validation, and preference machinery. Stale reminders and revoked invitations are suppressed. Reminder reconciliation continues across batches, including beyond the first 250 visits. Reservation reminders do not depend on beauty paid-plan entitlements.
6. **Daily overview and privacy:** day counts and covers come from active/completed visits, with cancellations and no-shows reported separately. They do not represent revenue. Owners can explicitly anonymize a guest's tenant-private contact data and reservation snapshots, revoke proof links, and suppress pending contact while preserving the visit's capacity and operating state. Historical audit/provider records are retained; this is not a claim of complete erasure from every system.

Guest confirmations and proof links go only to the email verified for that reservation. Entering an email in a staff-created reservation does not verify it and does not send a guest confirmation; those visits are managed by staff. Staff alerts follow current staff access and preferences. Local tests use a mailbox transport and do not prove real provider delivery.

## Capacity and time rules

- Staff explicitly define combinations such as A+B and B+C, with capacity and minimum party size. The system never infers A+B+C or arbitrary joins.
- A reservation owns one allocation per physical table. A+B blocks B+C for the overlapping occupied interval, including the reset buffer. Automatic selection considers suitable single tables and configured combinations; guests never select a physical table.
- Temporary closures, active areas/tables, party limits, service periods, last seating, booking horizon, advance notice, dining duration, and buffers are enforced by the backend. Staff may bypass guest advance-notice restrictions, but cannot bypass physical conflicts or service limits.
- Seating requires a valid imminent/current visit. Occupied tables remain blocked until explicit release. Moving a seated visit retains cleaning holds on the tables it leaves. Completion starts cleaning rather than silently making the table bookable.
- Version 2 reservations store actual UTC instants plus an IANA timezone and an operating `serviceDate`. A Friday evening service can end on Saturday. Nonexistent daylight-saving minutes have no slots; repeated minutes carry distinct UTC offsets. Beauty's historical timestamp representation is unchanged.
- Rescheduling preserves the reservation's saved dining duration and applies the current reservation rules and reset buffer to the new slot. Once seated, moves and duration changes retain the visit's saved buffer. Both advertised choices and mutation validation use the same applicable values. IDs remain stable; revisions, timestamps, and audit entries record lifecycle changes.

## Data and code map

| Area | Location |
| --- | --- |
| Domain and atomic allocations | `opus-dashboard/convex/lib/reservationEngine.ts`, `reservationTime.ts`, `convex/reservations.ts` |
| Gates, setup and readiness | `convex/lib/hospitalityAccess.ts`, `hospitalityReadiness.ts`, `hospitalitySettingsValidation.ts`, `convex/hospitality.ts` |
| Guest and account boundary | `convex/reservationPublic.ts`, `convex/lib/reservationGuestSecurity.ts` |
| Email queue and reminders | `convex/reservationNotifications.ts`, `convex/lib/reservationEmailNotifications.ts`, `reservationEmailTemplates.ts` |
| Staff application | `app/(dashboard)/hospitality/`, `components/reservations/` |
| Public booking and management | `app/reserve/`, `components/reservations/public/` |
| Tenant website routing | `app/(website)/sites/[slug]/`, `lib/reservation-server.ts` |
| Reviewed legacy conversion | `convex/reservationMigrations.ts` |

Schema extensions are additive. Existing hospitality records, tables, floor plans, and single-table reservation references remain. New `table_combinations`, `reservation_closures`, and `reservation_allocations` use tenant-leading indexes. Soft deletion and append-only audit records are preserved. Customer identity stays private to its organization; public responses and email use the reservation's guest-name snapshot rather than leaking an existing CRM name.

Management tokens are hashed for lookup, expire, and can be revoked. Email delivery retains encrypted proof material only where needed. The browser receives proof in a URL fragment, removes it from the address bar, and keeps it in tab-scoped storage. Contact details and special requests do not enter sign-in redirect URLs. Optional account continuity rechecks availability after returning.

## Legacy conversion

`reservationMigrations.inventory` and `dryRun` are internal, read-only tools. `apply` is an internal atomic mutation; it was exercised only with test data. No existing venue data was migrated.

A review must explicitly supply the original timestamp model (`utc` or `wall_utc`), timezone, operating date, selected actual instant, expected record version, physical tables, and disposition for every unresolved legacy visit. A repeated daylight-saving hour requires choosing the intended instant. Conflicts, nonexistent times, stale reviews, incomplete batches, and invalid capacity are rejected. Historical or duplicate records require an explicit terminal disposition. Apply preserves reservation identity and audits the conversion.

Before publishing an old venue, review the inventory, reconcile duplicates, approve a dry-run result, apply the reviewed conversion in an authorized environment, then satisfy publication readiness. Unresolved live legacy visits block publication and new reservations.

## Verification and activation boundary

From `opus-dashboard/`:

```sh
npm run typecheck
npx tsc -p convex/tsconfig.json --noEmit
npm run lint
npm test
npm run test:e2e -- --build
npm run test:e2e:hospitality
```

`npm run test:release` combines the application checks, all unit/backend tests, the retained beauty browser journeys and isolated production build, and the separate hospitality browser suite. Both suites use the normal self-service access rules in disposable applications and empty databases, without hospitality feature flags or privileged signup addresses. They do not inherit `.env` files or alter the existing server. Both suites use real generated OTPs through a local mailbox, with no authentication bypass and no retries.

The restaurant browser journey covers business-type selection, owner setup and publication, overlapping combinations racing for the same tables at 390px/320px, wrong OTP rejection, proof-link reload, guest rescheduling and cancellation, optional account claiming, returning-client booking, and staff arrival → seating → move → cleaning → completion → guest anonymization. A second browser journey creates a beauty studio and a separate café for the same owner, switches both ways, sends a real queued staff invitation, signs the invitee in with OTP, and verifies restricted host access. Backend suites additionally cover roles and tenants, unverified accounts, unpublished and unconverted venues, overnight/DST boundaries, stale revisions, closures, saved-duration policies, migration dry-runs, notification pagination and invitation revocation.

Current verification, 13 October 2026, after the shared hospitality dashboard redesign: **966 unit/backend tests passed; two optional live-provider tests skipped; all five beauty and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and isolated production webpack builds passed.** The final hospitality suite and build include the closure-time and success-message fixes. Desktop, 390px and 320px captures of populated reservations, tables and venue setup were reviewed, including multiple businesses and restricted host access. Navigation and language checks cover English, Macedonian and Albanian. No production configuration changed, and nothing was pushed or deployed.

Previous verification, 13 October 2026, after shortening venue onboarding: **945 unit/backend tests passed; two optional live-provider tests skipped; all five beauty and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and the isolated production webpack build passed.** The final hospitality suite and build were rerun after visual polish. Desktop, 390px and 320px screenshots of name/type steps and the empty dashboard were reviewed. Browser checks cover name/type validation and focus, Back/refresh draft restoration, immediate private-dashboard access, the mobile setup-guide disclosure, deferred setup/publication, hospitality redirects from the beauty upgrade route, and reservation client accounts remaining separate from business users and staff memberships. Backend tests also cover dashboard access for missing, legacy and malformed settings without weakening public readiness. Production configuration was not changed, and nothing was pushed or deployed.

Historical baseline before self-service onboarding: the complete local release gate passed on 12 October 2026: **880 unit/backend tests passed; two optional live-provider tests skipped; five beauty/default-off and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and the isolated production webpack build passed.** Desktop, 390px and 320px captures were reviewed, including Macedonian confirmation copy. The actual existing local backend returned `false` for `reservationPublic.isEnabled` after the work. No production deployment, Git push, pilot grant, or real-data conversion was performed.

The new public and staff interfaces use the existing English/Macedonian/Albanian locale foundation. Public pages expose a language control and preserve locale through the shared cookie. Some backend validation/provider messages remain English. High-volume venue load and real provider delivery have not been benchmarked or verified by the local gate.

The client account lists up to 100 recent reservations per venue and explains that bound. Older proof links still open their reservation while valid. Broader account-history pagination is a follow-up if venue usage needs it. An overdue seated/cleaning allocation blocks further availability until staff explicitly release it; staff must finish and mark tables ready as part of service operations.

Before a production release, verify the intended hosting/auth environment and real email delivery, review any legacy inventory, review translated copy with venue staff, and run a representative service with the actual tables and operating rules. Broader floor-plan design, deposits/payments, POS/orders, waitlist automation, revenue reporting, hospitality AI, and native hospitality workflows remain outside this release. Existing beauty release and provider checks still apply.
