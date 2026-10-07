# OPUS Mobile

Expo SDK 57 / React Native studio dashboard inside the OPUS monorepo. It uses the
existing `opus-dashboard/convex` backend, Better Auth email OTP and active staff
membership. English/Macedonian, Clarity/Studio themes and bottom tabs match the web dashboard.

Release configuration, legal links, launch assets and store/erasure operations are
documented in [the mobile release guide](../docs/MOBILE_RELEASE.md). Version 1.0.3
adds functional Sentry crash/performance diagnostics without replay or consent UI.
The compatible backend is live; App Store preparation, native tests and final
review submission are recorded separately in that guide.

## Local setup

Use Node.js 22.13 or later. Each application installs its own dependencies.

```bash
cd opus-dashboard
npm install
npm run dev
```

In another terminal:

```bash
cd opus-mobile
npm install
cp .env.example .env.local
# Set the public URLs below before starting Expo.
npm start
```

For a browser or iOS simulator using a local backend:

```dotenv
EXPO_PUBLIC_CONVEX_URL=http://localhost:3210
EXPO_PUBLIC_DASHBOARD_URL=http://localhost:3000
```

Use the actual running dashboard port (the standard local dashboard uses `3000`).
Convex's `SITE_URL` must match that dashboard URL; follow the dashboard's existing
auth setup. `npm run web` opens port `8081`. On a physical device, URLs must be
reachable from the device: `localhost` means the phone. Use a configured HTTPS
development proxy/dashboard and its matching `SITE_URL` and trusted origins.
For Expo Go on the same local network, set `EXPO_PUBLIC_NATIVE_DASHBOARD_URL`
to the computer’s private LAN dashboard URL and use a LAN-reachable
`EXPO_PUBLIC_CONVEX_URL`. Add that exact dashboard origin to
`AUTH_LOCAL_MOBILE_ORIGINS` in **opus-dashboard/.env.local**. This local auth
exception works only for explicitly listed private HTTP IPs, a `local:` Convex
deployment, non-production Next.js and no Vercel runtime. It is ignored in
production. Keep `SITE_URL` on loopback for that local backend and web preview.
Restart Expo after changing URLs.

Android emulators can use `adb reverse tcp:3000 tcp:3000` and
`adb reverse tcp:3210 tcp:3210` with the loopback URLs above.
Never put secrets in `EXPO_PUBLIC_*` variables.

## Functional flows

- Version 1.0.3 includes native/JavaScript crash reporting, release health,
  app-hang detection, startup/navigation timing and frame/stall measurements.
  Production performance traces are sampled at 20%. PostHog, session replay,
  screenshots, view hierarchies, console logs and analytics consent UI are absent.
  See [mobile monitoring](../docs/MOBILE_MONITORING.md) for privacy and operation.
  The new SDK requires the matching 1.0.3 native binary before OTA updates.
- Email OTP sign-in, secure native session storage, session restoration and sign-out.
- Studio access derived on the server from the authenticated active staff membership.
  Accounts without access are directed to invitations/setup on the web dashboard.
- Real-time overview and calendar, day/team filters and appointment details.
- Calendar opens an hourly timeline around the current studio time (other dates
  open around the first appointment, or 09:00). The live time marker and **Now**
  button use the studio timezone. Scroll without live updates moving the viewport;
  tap an appointment for details or an empty future time to prefill a booking.
  Overlaps appear side by side, with a list view available for the same filters.
  A time on the grid is a booking suggestion; the form checks live availability.
  A compact date/Now/add toolbar leaves the timeline visible. Tap the date or
  team filter to open date, team and view controls in a dismissible bottom sheet.
- Week shows a Monday–Sunday timeline with horizontal day navigation and a fixed
  time rail. Month shows booking counts and the selected day's appointments.
  Both preserve team filters and appointment modals; arrows move by the active
  period. **Now** returns to today in Week, or to the current day timeline.
  Calendar range reads are indexed by studio and bounded to 42 days.
- Appointment details and new bookings open as native form-sheet modals and
  styled dialogs on web, with animated transitions, centered titles, swipe dismissal
  and separately scrolling content. Primary actions stay in a fixed footer.
  Closing returns to the previous view and preserves its scroll position.
- Server-generated working-hour availability; new bookings with name and optional
  email/phone. Existing clients are matched by their contact details.
- Audited completion, cancellation and no-show actions without an arrival step. Booking writes
  reuse the existing conflict checks and configured notification queue.
- Pro client search, segments, pagination, history and booking from a client profile.
  Free studios keep booking/contact access without the paid directory.
  iOS has no external subscription purchase link; billing stays on the web.
- Service management modals: create/edit pricing, duration, public descriptions,
  team assignments and one switch for booking availability/website visibility;
  currency comes from the web-managed studio default for new services, and existing
  denominations are preserved. Removal requires confirmation.
- Team management modals: profiles, roles, assigned services, weekly hours/breaks,
  activation and confirmed soft removal. Existing Free/Pro capacity and owner
  protections apply. On Pro, owners/managers can add a sign-in email while creating
  a member and queue the personal invitation in the same save. Existing members'
  access is managed in the same editor. Appointment notifications use linked accounts.
  Invitation delivery depends on the existing email provider configuration.
- Staff keep read-only service/team views. Personal theme is persisted on the
  server; language preference is stored locally.
- Loading/empty/error states, lost-connection notice and disabled booking actions
  while disconnected. Records are not replaced with fictional fallback data.
- Personal push preferences shared with the web dashboard: alert types, own/studio
  appointment scope, reminder timing, sound, private previews and studio-time quiet
  hours. Each phone/browser explicitly opts in. Notification taps recheck current
  staff access, and signing out revokes that installation. See
  [`../docs/PUSH_NOTIFICATIONS.md`](../docs/PUSH_NOTIFICATIONS.md) for setup and
  delivery validation; Expo Go does not validate remote push.
- Branded app/adaptive/monochrome icons and launch screen, explicit back/close
  controls, legal/support links and an authenticated account-deletion request.

Business-wide opening hours, advanced media/settings and onboarding remain on the web dashboard.
Rescheduling, native billing, native consumer apps and marketplace
work remain deferred. Delivery is conditional on the existing provider configuration.

## Auth deployment

Native auth uses `@better-auth/expo` and the `opus-studio://` scheme. OTP requests
must use the dashboard `/api/auth` proxy, which preserves the existing signed IP,
country, CAPTCHA and rate-limit protections. Required Turnstile checks are served
on that same dashboard hostname through `/api/auth/mobile-captcha` and rendered
in a native WebView (an iframe in Expo web). Failed checks never bypass verification.

The compatible Expo auth plugin and mobile backend were deployed on October 6,
2026. Release builds use `studio.opus.mk` and the existing production Convex
deployment. The separate local configuration above remains for development.
Provider delivery and physical-device checks are independent of compilation.

Local Expo web origins `http://localhost:8081` and `http://127.0.0.1:8081` are allowed
only with a local Better Auth site/development Next.js server. For another web
preview origin, configure **the same exact** `AUTH_MOBILE_WEB_ORIGINS` comma-separated
allowlist in Next.js and Convex. Cross-site browser cookie policies can prevent
session restoration; prefer local same-host previews or a same-site HTTPS host.
Native sessions use SecureStore and do not depend on browser cookies.

## Structure

```text
src/app/                  Expo Router layouts and thin route entry points
src/components/ui/        Data-independent native primitives
src/components/{domain}/  Domain screen compositions
src/providers/            Auth/studio session and appearance preferences
src/hooks/                Shared React hooks
src/lib/                  Auth client, typed references, formatters and palettes
../shared/mobile.ts        JSON-only backend/client contracts
../shared/calendar.ts      Shared studio-date ranges and appointment layout
../opus-dashboard/convex/mobile.ts  Studio-scoped reads and booking adapters
```

## Checks

```bash
npm run release:check
npx expo install --check
npm run export
```

Run the mobile backend, auth proxy and booking tests from `opus-dashboard`:

```bash
npm test -- --run tests/convex/account-deletion.test.ts tests/convex/mobile-management.test.ts tests/mobile-management-input.test.ts tests/mobile-calendar-timeline.test.ts tests/convex/mobile.test.ts tests/mobile-auth-cors.test.ts tests/auth-protection.test.ts tests/auth-rate-limit.test.ts tests/convex/quick-booking.test.ts tests/convex/clients.test.ts tests/convex/dashboard-theme.test.ts
```

Export bundles iOS, Android and web JavaScript/assets; it does not prove a device
run or a signed app-store build. EAS build profiles are prepared; project registration,
signing, physical-device validation and release remain separate operator steps.
Native directories are generated by Expo and are not committed.

The SDK dependency tree has inherited npm audit advisories. Compatibility checks
do not establish a clean security audit; review upstream fixes before release.
Avoid `npm audit fix --force`, which proposes incompatible SDK downgrades.

References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Better Auth Expo](https://better-auth.com/docs/integrations/expo),
[Convex Expo auth](https://labs.convex.dev/better-auth/framework-guides/expo).
