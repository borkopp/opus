# Beauty booking release gate

This gate checks the active beauty journey described in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md), plus self-service restaurant/café onboarding and reservations in a separate disposable environment. It does not deploy the application or alter the existing local environment.

The October 17 website/menu first-version plan is **not implemented or covered
by the existing results**. As its phases land, extend the hospitality suite with
menu-only publication, draft/live content, flexible service/date booking,
stable QR exports and verified custom-domain routing/provider doubles while
retaining all beauty checks. See
[HOSPITALITY_V1_PLAN.md](HOSPITALITY_V1_PLAN.md#phase-7--integrated-validation-and-release-preparation).
Real DNS/TLS, provider delivery and hosted authentication remain separate release
verification; a local test or documentation change cannot establish them.

## Run locally

Use Node.js 22 and run commands from `opus-dashboard/`:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

The complete release command runs application and Convex TypeScript checks, ESLint, all Vitest tests, both browser suites, and a production webpack build of the isolated application:

```bash
npm run test:release
```

To run the browser gate and production build without repeating the earlier checks:

```bash
npm run test:e2e -- --build
```

Run the restaurant/café journey independently with `npm run test:e2e:hospitality`. Both environments use empty databases and the same default self-service access rules, without hospitality feature flags or pilot accounts. See [HOSPITALITY_IMPLEMENTATION.md](HOSPITALITY_IMPLEMENTATION.md) for coverage, readiness checks, migration boundaries, and operational limitations.

Other arguments are forwarded to Playwright, for example `npm run test:e2e -- --grep "beauty launch"`. Run through this wrapper; the Playwright configuration refuses an ordinary direct invocation or reuse of an existing development deployment. No account, studio, OTP, or provider credentials need to be supplied.

The harness uses a pinned official local Convex backend. It reuses a matching cached binary or downloads it from the official GitHub release. An offline installation can set `OPUS_E2E_CONVEX_BINARY` to an existing local executable. Node.js 20, 22, and 24 are accepted by the harness; CI uses 22.

## What the browser checks

[`beauty-journey.spec.ts`](../opus-dashboard/tests/e2e/beauty-journey.spec.ts) exercises real application pages and Convex handlers:

1. Owner email OTP sign-in, business-type selection, seven-step beauty onboarding, reload/resume, address selection, first service and hours, and website publication.
2. Published tenant subdomain to shared booking-origin navigation, with the internal `/sites/{slug}` route inaccessible directly on the studio host.
3. Two fresh guests selecting the same appointment at 390px and 320px widths, without creating accounts. A wrong OTP creates no booking; concurrent valid confirmations create exactly one booking. Reloading does not duplicate it.
4. The winning guest claims the appointment through the actual confirmation-email link and signs into an optional client account.
5. The owner sees the appointment in all five calendar views (Horizontal, Day, Agenda, Week, and Month) and reschedules it through the time-selection dialog. The client's appointment reflects the new time.
6. Client cancellation within policy releases the slot; another guest books it and the studio cancels it. The test checks persisted booking, customer, and audit state.

[`booking-account.spec.ts`](../opus-dashboard/tests/e2e/booking-account.spec.ts) creates a second studio through the UI and checks optional account creation during booking: a fresh guest opts in, verifies the actual emailed code, and receives exactly one confirmed appointment linked to the client account. The same signed-in client sees the appointment and books another slot using their saved details without another OTP.

The E2E suite also checks that missing, unpublished and unconverted hospitality venues do not expose public reservation forms; hospitality requires no enablement configuration. It checks that the retired public chat endpoint stays disabled and that the replay masking policy hides private text, inputs, and later DOM updates. The browser gate uses Chromium, one worker, and no retries.

The separate hospitality suite verifies the short onboarding: venue name → explicit Café or Restaurant choice → private dashboard. It checks empty/short-name and missing-type validation with focus recovery, Back/refresh draft restoration, no venue creation before the final action, and dashboard access without an address, tables or service hours. It then follows the dashboard setup guide, configures the actual reservation requirements, publishes and exercises the existing guest, combination and staff journeys. Name, type and empty-dashboard screens are captured at desktop, 390px and 320px widths.

The hospitality suite also checks the shared dashboard navigation: three owner destinations, two staff destinations, exactly one active primary link, fixed mobile bottom navigation with content clearance, and no horizontal overflow. It captures populated reservations, tables and venue setup at desktop, 390px and 320px; exercises the legacy table-management link, separate combination settings, the multi-business switcher, host table access without resource editing, Macedonian/Albanian navigation and account-menu sign-out. Lifecycle clicks run normally without forced clicks or waiting for success messages; visual captures alone wait for transient messages to expire.

The floor-plan editor is exercised while a confirmed combined-table reservation exists. The journey checks arrangement, pointer dragging, keyboard nudging, table shape/dimensions/rotation, fixtures, undo/redo, saved reload, combination highlights, a concurrent second editor, stale-save protection, tab-private draft recovery and explicit discard. It compares reservations, allocations, combinations, operational table fields and public slots before and after editing, and captures the editor at desktop, 390px and 320px. Focused tests cover tenant/role isolation, atomic revision checks, membership changes, geometry limits, rotated resizing, locks, layout commands and recovery parsing.

The saved floor plan is also exercised as a live service view. Owner and host journeys seat actual-now walk-ins on explicit combinations, reject a combination blocked by an upcoming reservation, change duration and move a party, preserve cleaning holds, finish visits and release physical tables separately. A second browser observes reactive state; staff cannot enter layout editing. Geometry and capacity remain unchanged by visit operations.

Reservation amendment journeys edit a verified guest's name, contact details, party size and requests while preserving the shared customer, original verified address, account and delivered management proof. Staff exercise blocked capacity, explicit single-table-to-combination changes, a stale draft and explicit reload, clearing optional fields, and completion/reset after amendment. Populated edit dialogs are captured at desktop, 390px and 320px. Backend cases cover atomic conflicts, tenant/role boundaries, allocation integrity, inactive resources, overdue and off-grid visits, legacy/erased guests, contact snapshots and privacy erasure.

Reservation search coverage combines guest-name and formatted-phone searches with service-date selection and status filters. The staff journey records arrival, seats and finishes a visit, and cancels another while verifying reactive counts and filtered rows. It checks clear/reset, no-match recovery, exact reservation-link focus under incompatible filters, query privacy in URLs/storage, and desktop/390px/320px layouts. Pure helper tests cover late arrivals, no-shows, legacy pending visits, anonymized identity, contact snapshots, accent-insensitive names and local/international Macedonian phone formats.

Reservation attention coverage exercises late arrivals, seated visits ending soon or overdue, completion into cleaning, buffer-gated table reset, and clearing indicators through real staff actions. It combines indicators with name/phone and status filters, skews the browser clock by a day, and captures desktop/390px/320px layouts. A short real server deadline must become resettable through the normal periodic refresh without another database write, focus event or reload. Only test-created visit/allocation timestamps are shifted by an internal fixture in the disposable backend; live local data and production are untouched. Pure/backend tests cover exact grace/end/buffer boundaries, consistent defaults for missing grace settings, UTC overnight/DST intervals, legacy and terminal exclusions, partial combination release, vacated tables, carryovers, tenant isolation and erased guests.

## Backend coverage

[`beauty-journey.test.ts`](../opus-dashboard/tests/convex/beauty-journey.test.ts) runs real backend handlers with `convex-test`, a controlled clock, and a stubbed email-provider response. It covers Free and Pro journeys, wrong/reused OTPs, slot conflicts without leftover customer writes, notification queue processing, rescheduling, cancellation, and audit events.

It also checks owner/manager/assigned-staff and cross-tenant restrictions through a Pro downgrade, client ownership across two studios, the exact cancellation deadline, and reschedule choices that preserve saved combined duration and price despite later catalogue edits. Breaks, buffers, competing appointments, inactive staff, and a slot becoming occupied after selection are covered. A failed reschedule must leave the original booking intact. Pro entitlement is a test fixture here; payment verification is not exercised.

Run that focused suite with:

```bash
npx vitest run tests/convex/beauty-journey.test.ts
```

The full `npm test` command also includes the existing authentication, publication/readiness, booking integrity, availability, settings, notifications, and other regression suites.

The dashboard test runner explicitly uses its own TypeScript configuration, including for the pure mobile calendar and price-input helpers it tests. A clean checkout needs only `npm ci` in `opus-dashboard` for this gate; installing `opus-mobile` dependencies is not required.

## Isolation and provider boundaries

[`run-beauty-e2e.mjs`](../opus-dashboard/scripts/run-beauty-e2e.mjs) and [`e2e-environment.mjs`](../opus-dashboard/scripts/e2e-environment.mjs) create a temporary application copy, an empty local Convex database/storage directory, a localhost mailbox, and their own frontend/backend processes on available ports. Installed dependencies are copied into the disposable application so production standalone packaging can trace them within the temporary monorepo; `.env` files are not copied. Its process environment is allowlisted: production provider credentials, deployment selectors, and `NODE_OPTIONS` are not inherited. All application endpoints and generated credentials belong to this disposable run. Cleanup stops the owned processes and removes its temporary files.

Browser tests receive real, randomly generated OTPs from the local mailbox; they do not use `AUTH_TEST_OTP` or bypass verification. Better Auth, booking verification, templates, notification queues, and scheduled processing run normally. Only the copied Resend transport endpoint is redirected to the authenticated localhost mailbox. Its acceptance of a message is not evidence of real-world email delivery.

Tests respect the real authentication send limit. Mailbox delivery history paces UI requests after three auth OTP sends, waiting for the 60-second idle window to reset with a one-second margin. This history survives worker restarts. Rate-limit errors are not retried or suppressed, and application rate limits are unchanged.

Address search uses a dummy public Mapbox token and a browser interception of the geocoding provider response, returning a valid Skopje address. Application requests and business mutations are not mocked. Internal, tenant-scoped inspection queries are copied from `tests/e2e/support/fixtures.ts` into the disposable backend only; they are not part of the deployable `convex/` source.

Browser interaction uses a disposable Next.js development server so the existing localhost authentication policy applies. With `--build`, successful browser tests are followed by a separate production webpack build of the same isolated source. This checks production compilation, not browser execution under production CAPTCHA, edge protection, or hosting configuration.

## CI, evidence, and failures

Latest local verification, 16 October 2026: reservation attention indicators passed application/backend TypeScript, full ESLint, **1,185 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. The staff journey covers timing badges, lifecycle changes, cleaning reset gating, combined filters, a browser clock skewed by one day, and automatic refresh after a real server deadline without a new write or focus event. Desktop/390px/320px captures were reviewed. Missing-grace defaults now agree across Reservations and the floor, and a recorded arrival at timestamp zero no longer appears late. The first browser run exposed a fixture still within the configured grace period; after correcting the fixture, both hospitality journeys and the build passed. Nothing was pushed or deployed.

Earlier local verification, 16 October 2026: reservation search/status filters passed application/backend TypeScript, full ESLint, **1,136 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. The final focused staff journey and build passed after dialog-close focus recovery was added. Tests cover name/phone matching, selected-date isolation, live status changes/counts, clear/reset, hidden reservation links, private query handling and keyboard focus. Desktop/390px/320px captures were reviewed. The browser run exposed and fixed a staff creation button incorrectly tied to public-profile completion; backend and browser tests now verify private-venue manual booking while publication remains blocked. The guest concurrency journey chooses actual offered times rather than assuming a fixed clock time lies on the configured slot grid. Nothing was pushed or deployed.

Earlier local verification, 16 October 2026: live floor service and reservation guest/party amendments passed application/backend TypeScript, full ESLint, **1,082 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. Browser coverage confirms staff capacity changes, explicit combinations, competing/stale edits, cleared contacts and requests, preserved verified guest/account/proof access, and the complete walk-in/move/cleaning lifecycle. Desktop/390px/320px captures were reviewed. The earlier interrupted beauty run was rerun successfully; no unrelated beauty changes were needed. Nothing was pushed or deployed.

Local verification, 14 October 2026: the graphical floor-plan editor passed application/backend TypeScript, ESLint, **1,049 unit/backend tests** (two optional live-provider tests skipped), all **five beauty and two hospitality Chromium journeys**, and an isolated production webpack build. Concurrent editor and draft recovery checks pass; booking data and public availability are unchanged by layout saves. The extended journey uncovered and fixed unstable combination label ordering in the live table view. Desktop/390px/320px layouts were reviewed. No push or deployment was performed.

Local verification, 14 October 2026: the live hospitality table view and service-time reservation edits passed application/backend TypeScript, ESLint, **994 unit/backend tests** (two optional live-provider tests skipped), **five beauty and two hospitality Chromium journeys**, and isolated production compilation. The hospitality journey now opens a combined-table visit from Tables, checks the reservation anchor/focus, moves it, finishes it and releases physical tables individually from the live view; desktop/390px/320px checks pass. See [HOSPITALITY_IMPLEMENTATION.md](HOSPITALITY_IMPLEMENTATION.md) for remaining priorities.

Current verification, 13 October 2026, after the shared hospitality dashboard redesign: application/backend TypeScript, ESLint and isolated production webpack builds passed. Vitest reported **966 passing tests** and two skipped optional live-provider tests. All **five beauty and two hospitality Chromium journeys passed without retries**. The restaurant journey initially exposed success messages blocking the Finish visit control; reservation feedback was fixed and the complete hospitality suite and production build passed again. Independent review also fixed closure edits shifting repeated-hour timestamps, with twelve focused regression cases. Responsive screenshots were reviewed at desktop, 390px and 320px. Production and deployment remain untouched.

Previous verification, 13 October 2026, after shortening venue onboarding: application and Convex TypeScript checks, ESLint, and the isolated production webpack build passed. Vitest reported **945 passing tests** and two skipped optional live-provider tests. All **five beauty and two hospitality Chromium tests** passed without retries using the same self-service access rules. The final hospitality suite and build were rerun after visual polish. New business accounts choose their vertical before onboarding; the beauty journey retains its existing setup and booking behavior. Restaurant/café onboarding requires only name and type before reaching the private dashboard; coverage includes validation, draft restoration, the responsive setup guide, deferred publication, shared-table combinations, guest management, optional client accounts, workspace switching, and restricted host access. The existing local dashboard remains on port 3000. Production configuration and deployment were untouched.

Historical baseline before self-service onboarding, 12 October 2026: `npm run test:release` passed on macOS. Application and Convex TypeScript checks and ESLint passed; Vitest reported **880 passing tests** and two skipped optional live-provider tests. All **five beauty/default-off Chromium tests and two hospitality Chromium tests** passed without retries. The isolated Next.js 16.3.8 production webpack build completed. The existing dashboard development server remained available on port 3000, and its actual backend still reported hospitality disabled.

[`beauty-journey.yml`](../.github/workflows/beauty-journey.yml) runs `npm run test:release` on relevant pull requests and pushes to `main` or `codex/hospitality-vertical`, and supports manual dispatch. It installs Chromium and its Linux system dependencies. The [branch-preparation CI run](https://github.com/borkopp/opus/actions/runs/38454990651) passed on 13 October 2026 at `49a8eaf8`. That run predates the local live-service changes verified above.

On failure, inspect:

- `opus-dashboard/playwright-report/` — HTML report.
- `opus-dashboard/test-results/` — failing-test screenshots, traces, and error context.
- `opus-dashboard/test-results/infrastructure-opus-beauty-e2e-*/` — sanitized backend, backend-push, frontend, and optional production-build logs.

The failure output prints the infrastructure-log location. CI uploads the report and test results as `beauty-journey-failure`, retained for seven days. Local E2E pass/fail evidence must be recorded from the completed run; implementation of the gate alone is not a passing result.

This gate does not establish production deployment, DNS/TLS, real Resend/Sender delivery, live Mapbox results, production CAPTCHA, payment checkout/webhooks, AI Receptionist/Meta/OpenAI delivery, push delivery, native-device behavior, or app-store readiness. Those require their own configured-provider and environment checks. It also does not add anonymous guest cancellation: the covered client cancellation follows the optional account-claim flow.
