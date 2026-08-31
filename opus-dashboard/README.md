# OPUS Dashboard

The dashboard is the business-facing surface for the current beauty appointment product in Macedonia. It covers onboarding, services, staff, availability, customers, the calendar, and appointment lifecycle management.

Read the repository-wide [product scope](../docs/PRODUCT_SCOPE.md) before product work. Hospitality and P2 features remain dormant; the Expo/React Native and SwiftUI applications come last and are outside the current web phase.

## Development

```bash
npm install
npm run dev
```

The combined command starts Next.js on port 3000 and the shared Convex backend on port 3210. Use `npm run dev:frontend` or `npm run dev:backend` to run one side only.

## Transactional email

Public tenant-site bookings require a six-digit email code before the booking mutation runs. Confirmations, calendar attachments, client reminders, and selected-team notifications are delivered from the Convex notification queue through Resend.

Configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `BETTER_AUTH_SECRET`, and `SITE_URL` on the Convex deployment. `BOOKING_OTP_SECRET` is an optional dedicated OTP hashing/encryption secret; when it is absent, the backend uses `BETTER_AUTH_SECRET`. See [`env.example`](env.example) for the complete local contract.

Owners configure client reminders, team new-booking emails, team reminder times, and exact dashboard recipients under **Settings → Notifications**.

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

The shared backend lives in `convex/`. Preserve tenant isolation, soft deletes, audit logging, integer minor-unit money values, and mutation-level booking conflict checks.
