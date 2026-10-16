# OPUS

## Current product direction

OPUS's deployed product is beauty appointment software for small businesses in Macedonia.

> OPUS helps small beauty studios manage appointments and turn cancellations and empty calendar slots into booked appointments.

Preserve the beauty dashboard and automatic studio-website booking journey.
Restaurant/café signup, guest reservations and staff table operations are
implemented locally on `codex/hospitality-vertical`; they are not deployed.
Hospitality's planned first version adds a website editor, verified custom
domains, digital menu, QR codes and optional flexible reservations. The October
17, 2026 request is planning/documentation only: these additions are not yet
implemented. POS and POS integrations, orders and guest payments are excluded.
The `opus-mk` marketplace remains dormant; loyalty, international expansion and
native consumer apps remain deferred. Existing authorized beauty AI capabilities
retain their own configured-provider boundaries.

Read [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md) for the authoritative scope, priorities, golden journey, and expansion rules.
See [`docs/HOSPITALITY_V1_PLAN.md`](docs/HOSPITALITY_V1_PLAN.md) for the phased plan
and [`docs/HOSPITALITY_IMPLEMENTATION.md`](docs/HOSPITALITY_IMPLEMENTATION.md) for
the existing local reservation implementation and verification history.

## Active repository surfaces

| Path              | Purpose                                                                                                      | Local port             |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `opus-dashboard/` | Beauty dashboard/websites, local restaurant/café reservations, and the shared Convex backend | `3000` / Convex `3210` |
| `opus-mk/`        | Dormant marketplace package retained for possible future work; do not modify by default                      | `3001`                 |
| `opus-landing/`   | Truthful beauty-focused `opus.mk` marketing website                                                          | `3000`                 |
| `opus-owner/`     | Private read-only platform overview for the OPUS owner at `admin.opus.mk`                                     | `3002`                 |
| `opus-mobile/`    | Authorized Expo / React Native studio dashboard using the shared Convex backend                              | `8081`                 |

`opus-dashboard/convex` is the backend source of truth. `opus-mk/convex` points to that shared backend.

The repository also contains dormant or deferred foundations, including marketplace
ingestion tools and legacy hospitality records. Preserve stored data, but do not
infer operational features from schema fields alone.

## Technology

- Next.js 16, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui
- Convex queries, mutations, actions, scheduled jobs, and real-time data
- Better Auth passwordless email OTP with `staff_members` as the tenant permission boundary
- Mapbox for marketplace location features when configured
- Optional or deferred provider integrations retained in the codebase

## Getting started

Install and run commands from the package being changed.

### Dashboard and backend

```bash
cd opus-dashboard
npm install
npm run dev
```

This starts the dashboard on `http://localhost:3000` and the Convex development backend on `http://localhost:3210`.

Configure the local Convex deployment once before signing in:

```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set AUTH_EMAIL_MODE providers
npx convex env set RESEND_API_KEY
npx convex env set AUTH_EMAIL_FROM 'login@auth.opus.mk'
npx convex env set AUTH_TRUSTED_ORIGINS http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
```

Local sign-in codes use the configured provider order; when no provider-order variables are set, Resend remains the safe default. The key command prompts for the value so it does not enter shell history. To use terminal delivery on an isolated local deployment instead, set `AUTH_EMAIL_MODE` to `console`; console delivery is rejected for non-local sites. See [`docs/EMAIL_PROVIDERS.md`](docs/EMAIL_PROVIDERS.md) before enabling Sender or changing production sender domains.

### Dormant marketplace

`opus-mk/` is retained but paused. Only run or change it when marketplace work is explicitly requested. If needed, start the shared backend first, then run:

```bash
cd opus-mk
npm install
npm run dev
```

The retained marketplace runs on `http://localhost:3001`.

### Landing page

```bash
cd opus-landing
npm install
npm run dev
```

### Mobile dashboard preview

```bash
cd opus-mobile
npm install
npm start
# Press i for iOS, a for Android, or w for the web preview.
```

The mobile app matches the dashboard themes and uses bottom tabs. It connects to
the existing Convex backend with email OTP and server-checked appointment actions.
See [`opus-mobile/README.md`](opus-mobile/README.md) for setup and boundaries.

## Quality checks

Run the checks for each affected package:

```bash
# opus-dashboard
npm run lint
npm run typecheck
npm test
npm run build

# opus-mobile
npm run lint
npm run typecheck
npm run doctor
npm run export

# opus-landing (and opus-mk only when explicitly affected)
npm run lint
npm run build
```

## Core engineering rules

- Scope tenant data by `orgId` and enforce access from authenticated staff membership.
- Use soft deletes for business data and keep `audit_log` append-only.
- Store money as integer minor units and timestamps as Unix milliseconds.
- Keep external provider calls in Convex actions, outside mutations.
- Perform availability and conflict checks inside serialized booking mutations.
- Preserve dormant foundations without exposing them as active product behavior.
- Keep marketing claims aligned with behavior that is operational and verified.

## Deployment

The target web topology is `opus-landing/` on Vercel at `opus.mk` and `opus-dashboard/` on a separate Vercel project at `studio.opus.mk` plus `*.opus.mk`. See [`docs/TENANT_WEBSITES.md`](docs/TENANT_WEBSITES.md) for the environment, domain, and verification runbook. No per-business DNS change or VPS deployment is part of publishing a studio website.

Hospitality custom domains are a planned extension with separate verification and
hosting setup. This does not change the current subdomain behavior or authorize
deployment, DNS changes, or a merge of the hospitality branch to `main`.

The separate `opus-owner` Vercel project serves the private owner overview at
`admin.opus.mk`. It uses email-code access limited to the platform owner and does
not deploy or alter the studio frontend. See [`docs/OWNER_OVERVIEW.md`](docs/OWNER_OVERVIEW.md).
