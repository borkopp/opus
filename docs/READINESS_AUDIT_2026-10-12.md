# OPUS readiness audit for restaurants and cafés

Date: 12 October 2026. Scope: current beauty product, shared platform, dormant restaurant/café foundations, and defects found during the audit. Hospitality remains disabled. This report does not authorize expanding product scope.

Implementation follow-up: the user subsequently authorized building the restaurant/café plan, including explicit table combinations. On October 13, self-service business-type selection and restaurant/café onboarding without pilot controls were authorized; deployment remains unauthorized. The local implementation and its separate test gate are documented in [HOSPITALITY_IMPLEMENTATION.md](HOSPITALITY_IMPLEMENTATION.md). The assessment below preserves the original audit findings; it should not be read as a claim that the new implementation or its providers have been activated in production.

## Decision

**OPUS has reusable infrastructure for a restaurant/café product, but it is not ready to enable that vertical in production.** The beauty product is substantially implemented and has meaningful backend coverage. The audit nevertheless found tenant-boundary leaks, lifecycle failures, inconsistent scheduling rules, dormant APIs that still performed work, and vulnerable web dependencies.

The appropriate next step is to release and verify the stabilization fixes, then build one small restaurant reservation journey behind an explicit vertical boundary. The existing hospitality tables provide a starting data model; they do not constitute a working reservation product. No rewrite of authentication, billing or the entire monorepo is warranted.

## Evidence and limits

The review combined source tracing, isolated Convex integration tests, unit tests, TypeScript, ESLint, production builds, dependency audit results, and selected local browser checks. It examined the active dashboard/backend, landing, owner app, mobile integration, and dormant hospitality boundaries. `opus-mk/` was not modified.

The initial local browser checks covered the authenticated overview, calendar and appointment composer, service/team management, booking/studio settings, desktop website editor, tenant-host routing, and the public booking flow through details. That initial pass used an existing returning-client session and submitted no appointment. The follow-up [beauty release gate](BEAUTY_RELEASE_TESTS.md) adds fresh owner, guest, and optional-account journeys using an isolated database and local email mailbox, including actual booking submissions, conflicts, rescheduling, and cancellation. At 390px and 320px, the checked booking states have no horizontal page overflow.

After the dependency upgrades, an isolated Next 16.3.8 production-build server also rendered the shared booking page and published tenant website. Tenant routing returned 200, direct `/sites/{slug}` access on the central host remained 404, and the tenant booking route redirected to its configured central booking origin. The first local server bound to `127.0.0.1` caused a Next rewrite-host normalization mismatch; the same artifact bound to `localhost` passed. No host guard was weakened. Temporary servers and browser tabs were closed; the existing development server was preserved.

This is not proof that every combination of role, plan, language, browser and device has been exercised. Real provider OTP delivery, two-studio browser account/invitation journeys, signed billing activation, real Instagram delivery, and native-device push remain release checks. The new browser tests use real generated OTPs delivered through a local transport; that does not establish provider delivery. The two optional live-provider test files were skipped. No production configuration or production data was changed or audited.

Existing uncommitted assistant/client/dashboard UI changes were preserved. Fixes remain local and uncommitted; no push or deployment was performed. The running local Convex watcher regenerated API declarations for the new shared validation helper.

## Flow assessment

| Flow | Assessment after fixes | Remaining work before expansion |
| --- | --- | --- |
| Sign-in, membership and studio switching | Server-side membership boundary and extensive account tests; revoked-membership onboarding and rejoined-studio switching fixed | Exercise real OTP/invitations, revocation and switching across two studios |
| New studio onboarding | Coherent short launch journey with owner, location, first service and hours; automated full browser launch/resume/publication | Keep publication readiness and editing rules consistent; establish the checked-in CI gate remotely |
| Services, staff, hours and time off | CRUD, entitlements and server validation covered; tenant schedule leakage and invalid hours fixed | Treat staff access and bookable resources as separate concepts for restaurants |
| Publication and OPUS Sites | Draft/publication separation, tenant-host checks, owner controls and plan-aware translations | Validate migration/rollback of published sites and provider-backed translation with actual configuration |
| Guest and returning-client booking | Automated guest confirmation, same-slot race, claim, inline account creation and returning-session scenarios | Real delivery and production auth/hosting verification; broaden browser/device coverage as needed |
| Staff and mobile booking lifecycle | Creation, cancellation, completion, no-show and rescheduling covered; timestamp/grid/risk defects fixed | Consolidate duplicate engines and explicitly define rescheduling identity/history |
| Client directory and analytics | Tenant/plan checks and completed-appointment-derived statistics exist; currency display fixed | Paginate large histories and reconcile legacy customer counters |
| Billing and plan downgrade | Signed provider state, catalogue/currency validation, capacity and downgrade tests exist | Real checkout → signed webhook → entitlement → downgrade verification; revenue cannot be inferred from plan flags |
| Email and personal push | Queued delivery, retries, preferences and permission checks; stale reminder and no-show defects fixed | Verify acceptance versus delivery, retries and device-token/browser subscription lifecycle |
| Manual opening recovery | Staff-approved, consent-aware, bookable offer flow with expiry and atomic acceptance | Real recipient/provider verification and volume tests; retain manual approval |
| Promote | Manual artwork/QR/replies with availability recheck; no auto-publishing | Export/share checks on supported devices; sharing must remain distinct from reservation |
| Instagram receptionist | Explicit confirmation, atomic booking and handoff boundaries; queued human reply revocation fixed | Provider/account approvals and complete external-studio DM journey |
| Business analyst and photo import | Read-only analyst and owner-reviewed import boundaries covered | Evaluate configured provider quality, failures and cost on representative inputs |
| Platform-owner app | Separate application and persisted owner allowlist; 15 tests pass | Large-data collection budget and fresh production owner-session verification |
| Native studio app | 30 release/navigation/privacy tests, typecheck and lint pass | Signed builds/device journeys plus retained dependency findings; web checks do not establish native readiness |
| Restaurant/café reservations | Dormant tables/settings/reservations retained; no active complete owner/customer workflow | Define and implement reservation rules, lifecycle, public UI and conflict tests before activation |

## Defects fixed

P1 denotes a security/access or serious integrity problem. P2 denotes a broken flow or correctness defect. These are local fixes awaiting release verification.

| Priority | Before | Change and evidence |
| --- | --- | --- |
| P1 | A studio could supply another studio's staff ID and read weekly schedules or private time-off notes | Tenant-leading indexes and ownership checks in `convex/availability.ts` and `availabilityOverrides.ts`; cross-studio regression |
| P1 | Dormant anonymous marketplace chat/retrieval still invoked model providers; message endpoints allowed reads/forged writes by conversation ID | Central disabled boundary in `convex/lib/productScope.ts`, marketplace actions/message endpoints and embedding workers; tests assert no writes or provider calls |
| P1 | Routine service edits/imports and reputation jobs could spend on dormant marketplace embeddings when credentials existed | All embedding entry points now return without model or scheduling work while marketplace is disabled |
| P1 | The sole usable owner could lose access because the last-owner guard counted unlinked or deleted-account owner seats | `convex/staff.ts` now requires another active owner with a live linked account; valid ownership handoff still passes |
| P1 | A queued human Instagram reply could send after its author lost studio access | Optional author staff/user IDs and delivery-time permission revalidation in `convex/ai/*`; unverifiable legacy queued staff replies fail into handoff |
| P2 | Revoked/deactivated membership left `activeOrgId` stale and blocked creating a new studio or resuming a valid owner membership | Onboarding resolves live membership in `convex/activation.ts` |
| P2 | Switching back after re-invitation selected an old soft-deleted membership | `convex/users.ts` selects the active membership rather than the first historical row |
| P2 | Publication depended on the owner personally offering services and hours | `convex/lib/activation.ts` accepts any valid active service/provider pair while preserving initial owner confirmation |
| P2 | A studio with a sole 35-minute service on a 15-minute start grid could be refused publication despite being bookable | Readiness no longer requires duration to be a multiple of start interval; regression proves slots, booking, publication and public-site access |
| P2 | Publication readiness could accept hours with no possible slot because breaks, closing buffers or start-grid alignment consumed the usable time | Recurring readiness now checks free segments against actual slot rules; three negative and two exact-fit positive regressions. A fully booked date does not suspend the website |
| P2 | Backend accepted impossible override dates, invalid/reversed hours, fractional weekdays and invalid breaks | Shared `convex/lib/availabilityValidation.ts`, reused by web and native management; valid `24:00` closing preserved |
| P2 | Advertised service slots beginning at 09:15 on a 30-minute grid could fail native booking creation | Staff writes accept the advertised working-window grid as well as existing manual-calendar starts; mobile integration regression |
| P2 | Legacy exposed booking creation bypassed hours/breaks, compared the wrong time representation and applied disabled surge rules | Shared atomic availability validation; whole-minute valid timestamps; correct wall-clock and enabled-surge handling |
| P2 | Public clients with zero legacy `totalVisits` could obtain no-show risk above 100% | Risk derives from same-studio non-deleted completed/no-show appointments on lifecycle changes |
| P2 | Booking/service amounts were labelled using the studio's current default currency | Generic `Price` now receives saved record currency and display locale; no protected settings query in the primitive |
| P2 | Email jobs could be claimed before due/backoff time; delayed reminders could reach completed/no-show/started or rescheduled appointments | Claim and delivery checks in `convex/notifications.ts`, with lifecycle regressions |
| P2 | No-show notices addressed staff as if they were the absent client and retained stale recipient permissions | Correct staff-facing wording and current permission/lifecycle checks |
| P2 | Unsupported WhatsApp jobs could still enter the queue | New jobs accept email/push only; completion safely skips unsupported historical preferences without introducing new outreach |
| P2 | Public reviews exposed global identity/CRM/booking references and reviews of unavailable or hospitality organizations | Public-safe projection and active/published organization boundary in `convex/reviews.ts`; erased reviewers anonymized; bounded result limits |
| P2 | Review duplication/account review status could select an old tombstone; owner replies lacked an audit entry | Active-only review lookups, deleted-booking rejection and append-only reply audit entries |
| P2 | Overview copy promised 24/7 automatic Instagram booking regardless of configuration | Conditional setup copy in all three dashboard languages, including explicit customer confirmation |
| P2 | The visible calendar Reschedule action did nothing in the horizontal view and was unavailable in other views | Shared reschedule dialog wired to all five views; authenticated slot query preserves saved duration and applies current conflicts/breaks/buffers; browser and backend regressions |
| P2 | Client names stayed hidden in horizontal calendar appointments because `xs:inline` referenced an undefined breakpoint | Use the configured `sm` breakpoint; browser journey locates appointments by their visible client names |
| P2 | Every horizontal calendar staff row claimed eight hours of availability regardless of configured hours or appointments | Removed the hardcoded availability figure; actual selectable times remain derived from backend availability |

Regression suites added: `booking-integrity.test.ts`, `studio-lifecycle.test.ts`, `reviews-boundary.test.ts`, `marketplace-dormancy.test.ts`, and `unit/price.test.ts`. Existing notification, AI and App Review tests were extended. Independent peer review of the changed access, booking, review and integration logic found no additional blocking regression.

## Improvements worth doing next

### Golden journey release gate implemented

The previous credential-dependent, skipped onboarding spec has been replaced by a disposable full-journey harness. `npm run test:release` runs TypeScript, ESLint, Vitest, Chromium journeys, and an isolated production webpack build. The checked-in `.github/workflows/beauty-journey.yml` runs the gate for relevant PRs and pushes; remote CI execution still requires a push.

Coverage includes owner setup → service/staff/hours → publish → fresh guest OTP → confirmed booking → calendar appearance → same-slot race → staff reschedule/cancel → client cancellation, plus inline account creation and returning-client booking. Connected backend tests repeat permission-sensitive parts for owner, manager and assigned-only staff, Free/Pro/downgrade, and two tenants, including the exact cancellation boundary. See [BEAUTY_RELEASE_TESTS.md](BEAUTY_RELEASE_TESTS.md) for commands, isolation, coverage, artifacts, and provider limits. Browser execution uses the existing localhost development-auth policy; the separate production build verifies compilation without claiming production browser/auth delivery.

### Reduce parallel implementations

`createBooking`, `createManualBooking`, public verified/account booking, and `ai/booking.ts` retain separate orchestration. The legacy `createBookingForAI` has no current app caller. Sharing availability checks has reduced immediate drift, but these entry points should converge on a small validated domain service with different authorization/contact policies at its edges.

Do not remove historical schemas, customer data, dormant hospitality tables or account compatibility paths. Inventory callers before retiring exposed legacy APIs. Keep the new marketplace gate closed until its conversation ownership model is rebuilt; changing the flag alone would restore insecure historical assumptions.

### Clarify customer and appointment semantics

Legacy `totalVisits`, spend and last-visit counters are updated differently by different creation/completion paths. The Pro directory correctly calculates statistics from completed appointments; use a single documented definition elsewhere and plan any backfill explicitly. Keep currencies separate and describe appointment value as appointment value, not collected revenue.

Rescheduling currently cancels an old booking and creates another ID. That can work, but introduce explicit lineage/stable business identity before reservation history, deposits or external channels depend on it. Decide which reports count an appointment, a creation event, a cancellation and a reschedule.

`review_request` currently sends a generic thank-you with no review action. Choose thank-you, real review collection, or no post-visit follow-up; the audit did not silently change that product decision. AI-confirmed appointments deliberately omit booking emails in existing tests while producing calendar/dashboard/push events. Decide whether configured staff email parity is desired, without emailing a customer merely because an unverified phone number matched a record.

### Remove hidden scaling limits

Client search currently collects the studio's clients and completed bookings before pagination. Reminder reconciliation considers only 250 upcoming bookings. Recovery has explicit limits of 20 staff, 1,000 customers and 10,000 bookings. Owner analytics has a documented multi-page scan/time budget.

These are bounded small-studio designs, not evidence of restaurant-volume performance. Introduce cursor-based batches, progress/checkpoints and appropriate aggregate data where necessary. Test that records after the first batch still receive reconciliation and notifications.

### Keep dormant administration explicit

`convex/marketplace/scraped.ts` retains shared-admin-key import/publication/bulk operations and a global media scan. It is separate from the newly disabled public marketplace APIs. Before expansion, retire it or give it explicit audited owner access and tenant-safe behavior. Credentials for an authorized feature must not turn on unrelated background work.

Some documentation retains older assumptions: no consumer accounts, booking timestamps described only as Unix instants, old gap-recovery consent wording, obsolete test failures, and dated provider configuration snapshots. Reconcile operational documentation with `PRODUCT_SCOPE.md` and separate historical deployment evidence from the current release checklist.

## Restaurant and café design

### Reuse

Keep the existing tenant root, server-derived membership/roles, optional global client identity with tenant-private customer records, audit infrastructure, website hosting/design framework, provider queue/retry machinery, billing reconciliation and personal notification preferences. Give each vertical explicit capabilities and entry points, shared between frontend and backend.

### Build separately

Beauty reserves one staff member for services. A restaurant reserves capacity over time. Keep a restaurant reservation domain rather than treating tables as employees or dishes as appointment services. The existing `floor_plans`, `tables`, `reservation_settings` and `reservations` tables are useful foundations; `reservations.tableId` currently represents one table.

Before implementation, decide:

1. Party size limits, table capacity, whether combined tables are needed initially, and who selects the table.
2. Service periods, last seating, dining duration, reset/cleaning buffer, walk-in allocation and temporary table closures.
3. Reservation states: requested/confirmed, arrived/seated, completed, cancelled and no-show, with allowed actor transitions.
4. Which temporary holds exist and how they expire; simultaneous web/walk-in/manual requests must compete atomically for the same capacity.
5. Owner setup and publication requirements, guest details/verification, customer changes/cancellations and staff overrides.
6. Restaurant notification wording, plan entitlements and metrics such as covers, table occupancy and no-shows. Beauty service revenue metrics are not restaurant takings.

Overnight service needs deliberate treatment. Current scheduling generally works within a single day, and booking timestamps are UTC-shaped local wall-clock values. Define the operating date for a Friday service ending Saturday at 01:00 and behavior across daylight-saving missing/repeated hours. Preserve existing beauty records; use explicit conversions and versioned contracts if the temporal representation changes.

### Smallest useful pilot

Start with one restaurant/café, a simple table list, fixed dining durations, party-size-aware availability, guest booking and a staff reservation list with seating/cancellation/no-show controls. A visual floor-plan editor, joined-table optimization, deposits, POS/orders, menus, campaigns, waitlist automation and restaurant AI are optional later scopes. They are not prerequisites for proving the reservation journey.

Activation should require: explicit authorization; beauty regression gates; complete restaurant setup and guest/staff lifecycle; cross-tenant rejection; atomic table overlap tests; overnight/DST policy; accurate publication/marketing; and an explicit rollback path. Update the enabled-vertical boundary, regression suite and product scope together.

## Validation results

| Surface | Result |
| --- | --- |
| Dashboard/backend | 814 tests passed, 2 optional live tests skipped, across 73 passing and 2 skipped files; TypeScript and ESLint passed |
| Dashboard production build | Next 16.3.8 webpack build passed, including isolated standalone packaging as part of `npm run test:release` |
| Automated beauty browser gate | 4 Chromium tests passed: complete guest lifecycle across all calendar views, inline/returning client account booking, retired chat rejection, and replay privacy; fresh isolated backend with real OTPs and local provider transport |
| Patched-build runtime | Shared booking page, tenant website and central-host rejection passed on an isolated local server |
| Landing | TypeScript, ESLint and Next 16.3.8 production build passed |
| Owner | 15 tests, TypeScript, ESLint and Next 16.3.8 webpack production build passed |
| Native studio | 30 existing navigation/release/privacy tests, TypeScript and ESLint passed; no signed build or device validation |
| Native URL guard | 3 existing guard tests and 12 temporary checks against installed Expo cold-start/listener code passed; OS APIs were stubbed |
| Mailer upgrade | Offline MIME/calendar-attachment smoke and Node 20-target backend bundle passed; no SMTP/API send |
| Change hygiene | `git diff --check` passed; existing unrelated changes preserved |

Checks ran from each application directory. Dashboard/owner production builds used `npm run build -- --webpack`; landing's `npm run build` already selects webpack. Owner's default Turbopack attempt hit a local sandbox process/port restriction, and its webpack build passed. Build-time font fetching required network access. These were environment constraints, not unresolved compilation failures.

### Dependency security

The three web packages now pin Next and `eslint-config-next` to **16.3.8**. The dashboard also upgrades Nodemailer to **10.0.9** and Vitest to **4.1.11**. Lockfiles include compatible patched transitives such as Sharp, PostCSS, DOMPurify, Hono and NanoID where applicable.

| Package | `npm audit --omit=dev` before | After |
| --- | --- | --- |
| Dashboard | 11 findings: 1 critical, 5 high, 4 moderate, 1 low | 0 |
| Landing | 7 findings: 1 critical, 4 high, 1 moderate, 1 low | 0 |
| Owner | 3 findings: 1 critical, 2 high | 0 |
| Native studio | 31 dependency findings propagated from 4 underlying advisory packages | Retained; assessment below |

These are registry advisory results on 12 October 2026, not a guarantee of no security vulnerabilities. Dashboard's broad HTTPS image allowlist makes the [Next image-optimizer SSRF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) relevant. No application `ImageResponse`/`next/og` entry point was found for the critical SVG advisory, so the critical audit classification is not a demonstrated application exploit. The updates also address [image optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [cache poisoning](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p), [Sharp/librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) and [Nodemailer parser](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-v53p-9fqp-m79j) issues. Exploitation was not attempted.

Nodemailer 10 requires Node 20 or newer. [Convex Node actions support Node 20/22/24](https://docs.convex.dev/functions/runtimes), and the repository's dashboard Dockerfile uses Node 22. The existing awaited mailer API is compatible with the [version 10 migration](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0). Real configured-provider delivery remains a release check.

The native package was not force-downgraded or given incompatible dependency overrides:

| Advisory package | Actual dependency path and assessment | Follow-up |
| --- | --- | --- |
| `decode-uri-component@0.2.2` | Router → `query-string`; the existing `safeNativePath` rejects malformed UTF-8 and links above 4,096 characters before native cold/warm routing. Normal Router query parsing uses `URLSearchParams`, but bundled legacy navigation code retains the vulnerable parser | Upgrade through a compatible upstream release. A direct 0.5.0 override changes CommonJS callable exports to ESM and can break the existing consumer; do not assume universal unreachability. [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| `node-forge@1.4.0` | Expo CLI and certificate tooling. Installed device update verification uses native iOS/Android cryptography rather than this JavaScript package | No patched release identified; track upstream. Tooling/certificate-processing risk remains. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| `braces@3.0.3` | Metro file watching via `micromatch`; no application-supplied glob input path identified | No patched release identified; track upstream rather than downgrading Expo. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| `uuid@7.0.3` | Xcode project tooling calls `v4()` without an output buffer; the advisory concerns `v3`/`v5`/`v6` with caller-provided buffers | The observed call site does not match the advisory's trigger; no forced override. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

Push routing accepts bounded notification IDs and resolves server-authorized targets; it does not navigate arbitrary notification payload URLs. This assessment reduces ambiguity about the native audit output but does not replace signed-device or dependency-maintenance work.
