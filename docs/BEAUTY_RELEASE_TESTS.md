# Beauty booking release gate

This gate checks the active beauty journey described in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md), plus self-service restaurant/café onboarding and reservations in a separate disposable environment. It does not deploy the application or alter the existing local environment.

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

The hospitality suite also checks the shared dashboard navigation: three owner destinations, two staff destinations, exactly one active primary link, fixed mobile bottom navigation with content clearance, and no horizontal overflow. It captures populated reservations, tables and venue setup at desktop, 390px and 320px; exercises the legacy table-management link, separate combination settings, the multi-business switcher, read-only host table access, Macedonian/Albanian navigation and account-menu sign-out. Lifecycle clicks run normally without forced clicks or waiting for success messages; visual captures alone wait for transient messages to expire.

## Backend coverage

[`beauty-journey.test.ts`](../opus-dashboard/tests/convex/beauty-journey.test.ts) runs real backend handlers with `convex-test`, a controlled clock, and a stubbed email-provider response. It covers Free and Pro journeys, wrong/reused OTPs, slot conflicts without leftover customer writes, notification queue processing, rescheduling, cancellation, and audit events.

It also checks owner/manager/assigned-staff and cross-tenant restrictions through a Pro downgrade, client ownership across two studios, the exact cancellation deadline, and reschedule choices that preserve saved combined duration and price despite later catalogue edits. Breaks, buffers, competing appointments, inactive staff, and a slot becoming occupied after selection are covered. A failed reschedule must leave the original booking intact. Pro entitlement is a test fixture here; payment verification is not exercised.

Run that focused suite with:

```bash
npx vitest run tests/convex/beauty-journey.test.ts
```

The full `npm test` command also includes the existing authentication, publication/readiness, booking integrity, availability, settings, notifications, and other regression suites.

## Isolation and provider boundaries

[`run-beauty-e2e.mjs`](../opus-dashboard/scripts/run-beauty-e2e.mjs) and [`e2e-environment.mjs`](../opus-dashboard/scripts/e2e-environment.mjs) create a temporary application copy, an empty local Convex database/storage directory, a localhost mailbox, and their own frontend/backend processes on available ports. Installed dependencies are copied into the disposable application so production standalone packaging can trace them within the temporary monorepo; `.env` files are not copied. Its process environment is allowlisted: production provider credentials, deployment selectors, and `NODE_OPTIONS` are not inherited. All application endpoints and generated credentials belong to this disposable run. Cleanup stops the owned processes and removes its temporary files.

Browser tests receive real, randomly generated OTPs from the local mailbox; they do not use `AUTH_TEST_OTP` or bypass verification. Better Auth, booking verification, templates, notification queues, and scheduled processing run normally. Only the copied Resend transport endpoint is redirected to the authenticated localhost mailbox. Its acceptance of a message is not evidence of real-world email delivery.

Tests respect the real authentication send limit. Mailbox delivery history paces UI requests after three auth OTP sends, waiting for the 60-second idle window to reset with a one-second margin. This history survives worker restarts. Rate-limit errors are not retried or suppressed, and application rate limits are unchanged.

Address search uses a dummy public Mapbox token and a browser interception of the geocoding provider response, returning a valid Skopje address. Application requests and business mutations are not mocked. Internal, tenant-scoped inspection queries are copied from `tests/e2e/support/fixtures.ts` into the disposable backend only; they are not part of the deployable `convex/` source.

Browser interaction uses a disposable Next.js development server so the existing localhost authentication policy applies. With `--build`, successful browser tests are followed by a separate production webpack build of the same isolated source. This checks production compilation, not browser execution under production CAPTCHA, edge protection, or hosting configuration.

## CI, evidence, and failures

Current verification, 13 October 2026, after the shared hospitality dashboard redesign: application/backend TypeScript, ESLint and isolated production webpack builds passed. Vitest reported **966 passing tests** and two skipped optional live-provider tests. All **five beauty and two hospitality Chromium journeys passed without retries**. The restaurant journey initially exposed success messages blocking the Finish visit control; reservation feedback was fixed and the complete hospitality suite and production build passed again. Independent review also fixed closure edits shifting repeated-hour timestamps, with twelve focused regression cases. Responsive screenshots were reviewed at desktop, 390px and 320px. Production and deployment remain untouched.

Previous verification, 13 October 2026, after shortening venue onboarding: application and Convex TypeScript checks, ESLint, and the isolated production webpack build passed. Vitest reported **945 passing tests** and two skipped optional live-provider tests. All **five beauty and two hospitality Chromium tests** passed without retries using the same self-service access rules. The final hospitality suite and build were rerun after visual polish. New business accounts choose their vertical before onboarding; the beauty journey retains its existing setup and booking behavior. Restaurant/café onboarding requires only name and type before reaching the private dashboard; coverage includes validation, draft restoration, the responsive setup guide, deferred publication, shared-table combinations, guest management, optional client accounts, workspace switching, and restricted host access. The existing local dashboard remains on port 3000. Production configuration and deployment were untouched.

Historical baseline before self-service onboarding, 12 October 2026: `npm run test:release` passed on macOS. Application and Convex TypeScript checks and ESLint passed; Vitest reported **880 passing tests** and two skipped optional live-provider tests. All **five beauty/default-off Chromium tests and two hospitality Chromium tests** passed without retries. The isolated Next.js 16.3.8 production webpack build completed. The existing dashboard development server remained available on port 3000, and its actual backend still reported hospitality disabled.

[`beauty-journey.yml`](../.github/workflows/beauty-journey.yml) runs `npm run test:release` on relevant pull requests and pushes to `main` or `codex/hospitality-vertical`, and supports manual dispatch. It installs Chromium and its Linux system dependencies. The workflow is configured in source; a successful remote CI run has not yet been established by this document.

On failure, inspect:

- `opus-dashboard/playwright-report/` — HTML report.
- `opus-dashboard/test-results/` — failing-test screenshots, traces, and error context.
- `opus-dashboard/test-results/infrastructure-opus-beauty-e2e-*/` — sanitized backend, backend-push, frontend, and optional production-build logs.

The failure output prints the infrastructure-log location. CI uploads the report and test results as `beauty-journey-failure`, retained for seven days. Local E2E pass/fail evidence must be recorded from the completed run; implementation of the gate alone is not a passing result.

This gate does not establish production deployment, DNS/TLS, real Resend/Sender delivery, live Mapbox results, production CAPTCHA, payment checkout/webhooks, AI Receptionist/Meta/OpenAI delivery, push delivery, native-device behavior, or app-store readiness. Those require their own configured-provider and environment checks. It also does not add anonymous guest cancellation: the covered client cancellation follows the optional account-claim flow.
