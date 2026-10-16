# Restaurant and café implementation — current local foundation

Status: on 13 October 2026, the user authorized normal self-service restaurant/café onboarding alongside beauty, with no pilot allowlist or hospitality enablement environment variables. Both choices are available in the local application and release source. **Nothing is deployed; production remains unchanged until an explicitly authorized release.** See [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md).

**Direction update, 17 October 2026:** the first-version plan now centers on a
website editor, custom domains, digital menu, QR codes and flexible optional
reservations. See [HOSPITALITY_V1_PLAN.md](HOSPITALITY_V1_PLAN.md). That request
authorizes planning/documentation only. The behavior below describes the
existing reservation implementation; new menu/editor/domain/QR capabilities and
independent website publication are not implemented by the scope update.

## Development branch and release boundary

Continue hospitality feature work on `codex/hospitality-vertical`. This branch preserves the reservation implementation, shared onboarding/navigation, audit fixes, dependency updates, and beauty/hospitality regression suites. `main` receives only the separately reviewed beauty billing and AI Receptionist presentation changes plus the Git deployment safeguards; SMS backend retirement and all hospitality/backend work remain on this development branch.

The dashboard, landing and owner Vercel configurations disable automatic deployment of `codex/hospitality-vertical`. Their ignored-build command also cancels builds for commits whose message contains `[skip deploy]`; branch checkpoint commits use that marker. The owner safeguard was aligned on October 17 before the hospitality checkpoint push; it does not enable Git integration or deploy the owner app. Ordinary unmarked `main` commits retain their configured deployment behavior, including the dashboard's Convex deployment step. Do not merge this branch or remove the deployment safeguard until a release is explicitly authorized. These are Git deployment controls, not hospitality feature flags or application environment variables.

GitHub Actions runs the isolated release checks on pushes to this branch and on relevant pull requests. Continue using `npm run test:release` from `opus-dashboard/` before release, and keep local `.env`, databases, build output and browser artifacts untracked.

## Access and isolation

After business-account email verification, `/onboarding` asks the user to choose **Beauty** or **Restaurants and cafés** before creating an organization. Beauty continues through its existing setup. Hospitality asks for the venue name, then an explicit Café or Restaurant card choice. **These are the only two required details before opening the dashboard.** No address, phone, hours, tables or publication is required to enter it. A tab-private draft preserves progress across refresh before creation; the saved organization is authoritative afterwards. Existing businesses resume their workspace, while client authentication and invitation acceptance retain their dedicated destinations.

The dashboard's setup guide links directly to venue details, hours/rules, tables and preview/publication. It updates from server readiness as work is completed. Combinations and team invitations can be added later. Creating a venue does not publish it: public booking and staff creation remain governed by reservation readiness, and only an owner can publish. Older venues with missing or invalid reservation settings can open their dashboard without triggering failing day queries; they see a settings-review notice.

## Dashboard navigation

Hospitality reuses beauty's dashboard header, appearance, page headings, desktop navigation and mobile bottom tabs. Its three destinations are **Reservations**, **Tables**, and **Venue setup**. The account menu retains business identity, language, cookie preferences and sign-out without exposing beauty subscription, notification, or AI controls.

- **Reservations** (`/hospitality`): service-date selector, daily counts, guest name/phone search, status filters, attention indicators, and direct arrival/seating/completion controls. Rescheduling, moving tables, changing duration, cancellation, no-show and owner-only anonymization are grouped in each reservation's action menu. Cleaning controls remain visible.
- **Tables** (`/hospitality/tables`): live service grouped by area for all staff. Each physical table shows its current party and combination, expected finish/overdue state, cleaning deadline, and next reservation with arrival status. Staff can open the exact visit, finish a whole party, and mark individual tables ready after their reset buffer. Owners and managers retain separate Tables, Areas and Combinations management sections and a graphical floor-plan editor.
- **Venue setup** (`/hospitality/setup`): Venue details, Hours & rules, Closures, owner-only Team, and Website. Desktop uses the existing settings sidebar; narrow screens use a section selector. Staff can view table status and manage visits but cannot edit venue resources or settings. The old `/hospitality/setup?tab=tables` link redirects to table management.

Service periods and everyday reservation settings appear first in Hours & rules. Less frequently changed staff timing settings are grouped under Staff adjustments. These are presentation changes; backend validation, publication readiness, tenant boundaries and revision checks remain authoritative.

Review fixes: closure edits preserve the saved UTC instant and each endpoint's first/second occurrence during daylight-saving fall-back. Separate occurrence controls appear only when the selected local time repeats. Inactive areas no longer hide a table's occupied/cleaning state. Reservation success feedback uses one non-interactive message at the top so consecutive visit actions and mobile navigation remain clickable.

The live table query derives state from tenant-scoped allocations and unresolved reservations, using server time. It refreshes every 30 seconds and when the browser regains focus; database changes remain reactive. Overdue seated parties and cleaning holds carry across service dates until explicit release. Closures and inactive resources remain visible, and inconsistent or unconverted assignments show **Needs review**, not availability or unsafe release controls. Guest contact details are not returned by this query. Switching businesses clears retained table data.

Staff can move or change the duration of a current confirmed reservation after its booked start, while preserving its original arrival and saved buffer. Expired confirmed visits cannot be revived. A seated party that overruns can move and extend its duration in one atomic action, without first extending on a table needed by the next party. Destination capacity, service hours, closures, revisions and conflicts are rechecked; vacated physical tables retain cleaning holds. The duration field means total minutes from the booked arrival, including time already spent.

No deployment-level enablement flag, pilot email list or per-organization pilot grant participates in authorization. Any historical stored pilot field is inert and retained only for document compatibility. Restaurant/café type, active membership and role checks still apply. Currently, public websites and new guest reservations additionally require explicit publication and current reservation readiness, including resolved legacy allocations. Phase 1 of the new plan separates public content readiness from booking readiness; it must adapt server queries and publication reconciliation as well as the UI.

## Graphical floor-plan editor

The user authorized this local feature on 14 October 2026. All staff open **Floor plan** from Tables at `/hospitality/tables/floor-plan` for live service. Owners and managers use **Edit layout** (`?mode=edit`) to arrange the venue. Staff cannot enter the editor or change resources.

Each area has its own room dimensions, physical table geometry and decorative fixtures. The editor supports dragging, resizing and rotating tables; rectangular, round and booth shapes; multi-selection and group movement; alignment and distribution; arrangement, grid snapping, zoom and pan; numeric position controls; and locking objects. Walls, bars, doors, plants and text labels can be added, duplicated and removed. Configured combinations can be highlighted, but drawing tables next to each other never creates a bookable combination. Table and area creation use the existing resource forms and authorization.

Layout edits remain a draft until **Save layout**. Undo/redo operates on that draft, and switching areas, following links or leaving through the editor's controls prompts before discarding changes. A tab-private recovery copy, scoped to the authenticated staff member, organization and area, restores unsaved work after refresh or navigation back to the editor when browser storage is available. It retains the original server revision; saving or explicitly discarding clears the recovery copy. It is not a server-side draft or a cross-device backup. A changed server revision or table membership preserves the local draft and requires reloading before saving, preventing one editor from overwriting another. Moving an object does not move a guest or change table availability.

The backend saves the whole layout atomically, checks active tenant membership and manager/owner access, validates finite geometry and every rotated footprint against the room bounds, and requires the exact complete set of nondeleted tables in that area, including inactive tables. Fixture and table identifiers share one unique editor namespace. Room dimensions are 200–4000 units; table dimensions are 40–600; fixture dimensions are 10–4000. Each save accepts at most 200 tables and 200 fixtures. Physical table IDs, capacities, combinations, status, reservations and allocations remain unchanged. Only geometry/shape/locks and the area's dimensions/fixtures/revision are patched, with an append-only audit entry. Drawing overlaps are advisory rather than new reservation constraints.

This addition is local release source. Verification is recorded below; the editor is not evidence of a deployed feature.

## Live floor service and walk-ins

The floor plan opens in live service mode for owners, managers and staff. Selecting a table shows the current visit, cleaning hold and next reservation, including combined-party scope, late arrivals and overruns. Staff can record arrivals, seat reservations, move or extend visits, cancel/no-show, finish a whole party and mark only the selected table ready after its buffer. The same reservation dialogs serve both the daily list and the floor. Layout geometry is read-only during service; keyboard selection, pan/zoom and the table list remain available. Narrow-screen selection brings the detail panel into view.

**Seat a walk-in** asks for party size and duration, with optional name, phone and notes. The backend offers only the selected table or an explicitly configured combination containing it, then rechecks physical conflicts, closures, active resources, service time and cleaning buffers when seating. Creation, arrival and seating happen atomically at exact server time, including between slot-grid times and across overnight service dates. Retries keep their request identity and resolve the original visit before checking current time again. Typed contacts do not receive verified guest email. Staff operations do not require website publication or a completed public profile.

Live database changes are reactive; server-time states refresh every 30 seconds and on browser focus. Stale or disconnected views disable actions. Guest identities and retained query data stay within the selected tenant, and inconsistent allocations remain visible as Needs review.

## Reservation guest and party amendments

**Edit guest & party** is available on modern confirmed or seated reservations from the day list and the selected floor-plan table. Staff can correct name, phone, email, party size and special requests, or clear optional fields. New reservations store their submitted contact details on the visit; older records keep their existing customer fallback until amended. Contact changes apply only to this reservation; they never change the shared customer or another reservation. The original verified email, linked guest account and management proof keep their ownership and notification destination. A staff-typed email remains unverified. Guest anonymization scrubs the new reservation contact data and prevents restoring erased identities.

A party-size change rechecks configured capacity, explicit combinations, closures and active allocations in the mutation. Current tables remain selected when valid; a different assignment requires staff selection. Moving a seated party leaves cleaning holds on vacated tables. Updates preserve the visit's identity, start, duration and saved buffer, advance allocation revisions, and record an audit event. Detail-only corrections remain possible without requalifying the visit against newly changed service settings. Stale edits cannot overwrite another staff member; the dialog offers an explicit reload that replaces the draft. Finished/cancelled/no-show visits and legacy records cannot be amended through this flow.

## Reservation search and status filters

The Reservations list searches the selected service date and its carried-over visits by displayed guest name or phone. Name matching ignores case and accents; phone matching ignores spaces and punctuation and recognizes full Macedonian local and international formats. Search uses the existing authorized staff projection, including visit-specific contact corrections and anonymization, without looking through other dates, tenants or hidden customer fields. Search text stays in component state, outside URLs and browser storage; switching businesses resets it.

**All**, **Upcoming**, **Arrived**, **Seated**, **Completed**, **Cancelled** and **No-show** filters combine with search. A **Pending** option appears for historical pending records. Upcoming includes late confirmed visits that still await arrival; arrived visits are confirmed visits with a recorded arrival. Seated and completed carryovers remain in their respective filters, including unresolved cleaning holds. Counts reflect the current search and update with live visit changes; the daily summary continues to report the whole selected service date. Clear/reset controls and separate empty-day/no-match states keep filtering recoverable. Following an exact reservation link reveals and focuses its card even under incompatible filters. Controls support English, Macedonian and Albanian and wrap on narrow screens.

The staff browser journey exposed an overly restrictive Add reservation button: it required the public venue profile even though manual booking already supports private venues. The workspace now reports operational creation readiness separately, requiring valid hours/rules, usable table capacity and reconciled legacy allocations. Website publication still requires the complete public profile. This correction lets staff take phone/manual reservations before publishing without weakening server conflict or publication checks.

## Reservation attention indicators

Each reservation can show a text-and-icon attention badge alongside its lifecycle status. **Late arrival** applies to confirmed visits without a recorded arrival once the venue's arrival grace period has elapsed; its minute count is measured from the scheduled start. **Ending soon** applies to seated visits with up to 15 minutes remaining. **Overdue** starts at the saved scheduled end and shows elapsed minutes. Arrival clears lateness, and finishing or cancelling a visit clears its timing indicator. Historical records without a valid versioned UTC interval do not receive inferred timing indicators. Lateness never automatically changes a visit to no-show.

**Cleaning needed** counts the visit's active physical-table cleaning holds, including tables vacated by a still-seated party and unresolved carryovers. Each table shows its remaining buffer or **Ready for reset**. Staff can mark a table ready only once its server-derived deadline permits release; reaching that deadline never frees a table automatically. Releasing one table of a combination removes only that table's cleaning indicator.

Timing comes from the server and shares the floor view's rules, including the existing 15-minute default when an older settings record omits arrival grace. The Reservations list refreshes every 30 seconds while visible and when the browser regains focus, retaining rows and filters during refresh without carrying rows into another selected date or business. An offline notice identifies potentially stale indicators and disables list actions. Search and status filters continue to apply normally, and English, Macedonian and Albanian labels wrap on narrow screens. These signals do not change reservation allocation, capacity, saved duration, publication, or beauty booking behavior.

## Planned next phases

The October 17 direction replaces the earlier reservation-only priority list:

1. Separate website/menu publication, online booking acceptance and staff readiness.
2. Add the structured digital menu and public browsing.
3. Adapt OPUS Sites into the hospitality website editor.
4. Add Off / Weekly services / Selected dates reservations and simple event content.
5. Add stable website/menu QR downloads and printable materials.
6. Add verified custom domains while retaining central OPUS authentication.
7. Validate the combined journeys and prepare an explicitly authorized release.

These are pending phases, not implemented features or authorization to start
coding. [HOSPITALITY_V1_PLAN.md](HOSPITALITY_V1_PLAN.md) defines reuse, contracts,
acceptance criteria and the POS exclusion. Real email delivery/management links,
English/Macedonian/Albanian review, representative service testing and legacy
reconciliation remain release requirements alongside beauty regression checks.

## Persistent local test venue

The local development backend at `http://127.0.0.1:3210` can retain **OPUS Test Kitchen & Café** as a separate test organization from a beauty studio. This fixture is local data, not a production seed or an account grant. Select an available business with the dashboard's business switcher.

- Staff operations: `http://localhost:3000/hospitality`
- Tables and combinations: `http://localhost:3000/hospitality/tables`
- Live floor plan: `http://localhost:3000/hospitality/tables/floor-plan`
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
| Graphical floor plan | `convex/floorPlans.ts`, `lib/floor-plan.ts`, `components/reservations/floor-plan/` |
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

On 16 October 2026, reservation attention indicators passed application/backend TypeScript, full ESLint, **1,185 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. Browser coverage verifies late/ending-soon/overdue badges, arrival/completion clearing, cleaning deadlines and explicit reset, search/status coexistence, a browser clock skewed by one day, and time-only automatic refresh without another write or focus event. Desktop, 390px and 320px captures were reviewed. Regression tests also cover the corrected missing-grace default across list/details/floor, recorded arrival at timestamp zero, partial combination release and overnight carryovers. The first browser run correctly rejected test data that was still within the venue's grace period; the fixture now derives lateness from the saved grace setting, and the full rerun passed. Everything remains local; no push or deployment was performed.

On 16 October 2026, reservation search and status filters passed application/backend TypeScript, full ESLint, **1,136 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. A final focused staff journey and build also passed after adding dialog-close focus recovery. Coverage includes name accents, progressive and complete local/international phone searches, service-date isolation, live status counts/transitions, no-match/reset controls, exact-link focus, query privacy, and keyboard recovery after arrival/cancellation. Desktop, 390px and 320px captures were reviewed. Tests also verified manual staff booking before public-profile completion while keeping publication blocked, and replaced brittle fixed-time test assumptions with actual offered slots. Changes remain local on `codex/hospitality-vertical`; nothing was pushed or deployed.

On 16 October 2026, live floor service and guest/party amendments passed application/backend TypeScript, full ESLint, **1,082 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. The journeys exercise owner and host service, table/combination conflicts, immediate walk-ins, capacity amendments, visit-specific contacts, explicit clears, stale draft reload, original verified proof/account access, and completion/cleaning. Desktop, 390px and 320px captures were reviewed. Metadata amendments now reject invalid occupancy rather than repairing it implicitly, and table updates verify tenant ownership. The development frontend and backend run locally on ports 3000 and 3210. Nothing was pushed or deployed.

On 14 October 2026, the graphical floor-plan editor passed application/backend TypeScript, ESLint, **1,049 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. The editor journey checks geometry, fixtures, persistence, concurrent editors, stale-save protection, draft recovery and explicit discard while proving existing reservations, allocations, combinations and public availability remain unchanged. Desktop, 390px and 320px captures were reviewed. The extended run exposed unstable combined-table display ordering; the live query now orders labels by table sort order and natural label without changing stored allocation IDs, with a regression test. These checks remain local; nothing was pushed or deployed.

On 14 October 2026, the live table service implementation passed **994 unit/backend tests** (two optional live-provider tests skipped), application/backend TypeScript, ESLint, all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. The 28 new regression cases cover service-time edits, overdue move-and-extension, live allocation state, tenant isolation, server-clock boundaries, cleaning and partial release, anonymized guests, and legacy/missing allocations. Browser checks operate combined tables from the live view, follow the exact reservation link, move the party, finish the visit and release each table. Desktop, 390px and 320px captures were reviewed. These changes remain local to the hospitality branch; no production deployment or main-branch change was made.

The prior branch-preparation [GitHub release check](https://github.com/borkopp/opus/actions/runs/38454990651) passed on 13 October 2026 at commit `49a8eaf8`; that CI result predates the live-service changes above.

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

Verification at the dashboard redesign, 13 October 2026: **966 unit/backend tests passed; two optional live-provider tests skipped; all five beauty and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and isolated production webpack builds passed.** The final hospitality suite and build include the closure-time and success-message fixes. Desktop, 390px and 320px captures of populated reservations, tables and venue setup were reviewed, including multiple businesses and restricted host access. Navigation and language checks cover English, Macedonian and Albanian. No production configuration changed, and nothing was pushed or deployed.

Previous verification, 13 October 2026, after shortening venue onboarding: **945 unit/backend tests passed; two optional live-provider tests skipped; all five beauty and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and the isolated production webpack build passed.** The final hospitality suite and build were rerun after visual polish. Desktop, 390px and 320px screenshots of name/type steps and the empty dashboard were reviewed. Browser checks cover name/type validation and focus, Back/refresh draft restoration, immediate private-dashboard access, the mobile setup-guide disclosure, deferred setup/publication, hospitality redirects from the beauty upgrade route, and reservation client accounts remaining separate from business users and staff memberships. Backend tests also cover dashboard access for missing, legacy and malformed settings without weakening public readiness. Production configuration was not changed, and nothing was pushed or deployed.

Historical baseline before self-service onboarding: the complete local release gate passed on 12 October 2026: **880 unit/backend tests passed; two optional live-provider tests skipped; five beauty/default-off and two hospitality Chromium tests passed without retries; application/backend TypeScript, ESLint, and the isolated production webpack build passed.** Desktop, 390px and 320px captures were reviewed, including Macedonian confirmation copy. The actual existing local backend returned `false` for `reservationPublic.isEnabled` after the work. No production deployment, Git push, pilot grant, or real-data conversion was performed.

The new public and staff interfaces use the existing English/Macedonian/Albanian locale foundation. Public pages expose a language control and preserve locale through the shared cookie. Some backend validation/provider messages remain English. High-volume venue load and real provider delivery have not been benchmarked or verified by the local gate.

The client account lists up to 100 recent reservations per venue and explains that bound. Older proof links still open their reservation while valid. Broader account-history pagination is a follow-up if venue usage needs it. An overdue seated/cleaning allocation blocks further availability until staff explicitly release it; staff must finish and mark tables ready as part of service operations.

Before a production release, verify the intended hosting/auth environment and real email delivery, review any legacy inventory, review translated copy with venue staff, and run a representative service with the actual tables and operating rules. Deposits/payments, POS implementation or integration, orders/table-request inboxes, bill splitting, waitlist automation, revenue reporting, hospitality AI, and native hospitality workflows remain outside the planned first version. Existing beauty release and provider checks still apply; historical passing checks above do not cover the new phases.
