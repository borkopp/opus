# OPUS

## Current product direction

OPUS is currently a beauty appointment SaaS for small beauty businesses in Macedonia.

> OPUS helps small beauty studios manage appointments and turn cancellations and empty calendar slots into booked appointments.

The dashboard and automatic studio-website booking journey are the priority. Hospitality and the `opus-mk` marketplace are dormant and must not appear as active product surfaces. Autonomous AI features, loyalty, international expansion, and native consumer apps are deferred.

Read [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md) for the authoritative scope, priorities, golden journey, and expansion rules.

## Active repository surfaces

| Path              | Purpose                                                                                                      | Local port             |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `opus-dashboard/` | Beauty-business dashboard, automatic `{slug}.opus.mk` websites, guest booking, and the shared Convex backend | `3000` / Convex `3210` |
| `opus-mk/`        | Dormant marketplace package retained for possible future work; do not modify by default                      | `3001`                 |
| `opus-landing/`   | Truthful beauty-focused `opus.mk` marketing website                                                          | `3000`                 |

`opus-dashboard/convex` is the backend source of truth. `opus-mk/convex` points to that shared backend.

The repository also contains dormant or deferred foundations, including hospitality and ingestion tools. Preserve those foundations, but do not infer active scope from them.

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
npx convex env set AUTH_EMAIL_MODE resend
npx convex env set RESEND_API_KEY
npx convex env set AUTH_EMAIL_FROM 'noreply@opus.mk'
npx convex env set AUTH_TRUSTED_ORIGINS http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
```

Local sign-in codes are sent through Resend. The key command prompts for the value so it does not enter shell history. To use terminal delivery on an isolated local deployment instead, set `AUTH_EMAIL_MODE` to `console`; console delivery is rejected for non-local sites.

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

## Quality checks

Run the checks for each affected package:

```bash
# opus-dashboard
npm run lint
npm run typecheck
npm test
npm run build

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
