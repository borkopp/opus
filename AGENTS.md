# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## Required Product Scope

Before product work, read [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md). It is the product-direction authority for this repository.

Future agents must:

1. Treat beauty appointment booking for small studios in Macedonia as the only active vertical.
2. Preserve dormant hospitality schemas, data, and reusable backend foundations without exposing hospitality in active UI, routes, discovery, onboarding, metadata, or marketing.
3. Avoid introducing unrelated product ideas or expanding P2 work.
4. Prioritize reliability of the documented golden booking journey.
5. Keep marketing claims aligned with behavior that is genuinely operational and configured.
6. Ask for explicit user authorization before changing product scope or enabling another vertical.
7. Keep this repository focused on the web applications; native clients were removed from the monorepo.
8. Keep `opus-mk/` dormant and untouched unless the user explicitly resumes marketplace work.

---

## What This Project Is

**OPUS** is currently a beauty appointment SaaS for small beauty businesses in Macedonia.

Canonical positioning: **OPUS helps small beauty studios manage appointments and turn cancellations and empty calendar slots into booked appointments.**

---

## Monorepo Structure

Independent Next.js applications, with the studio and owner apps sharing Convex:

| App               | Purpose                                                                       | Dev port                       |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| `opus-dashboard/` | Beauty-business dashboard plus automatic tenant websites and guest booking    | 3000 (frontend), 3210 (Convex) |
| `opus-mk/`        | Dormant beauty marketplace retained for future work; do not modify by default | 3001                           |
| `opus-landing/`   | Beauty-focused `opus.mk` marketing site — no backend, no auth                 | 3000                           |
| `opus-owner/`     | Private platform-owner overview at `admin.opus.mk`; read-only analytics       | 3002                           |

`opus-mk/convex` is a symlink to `../opus-dashboard/convex`. Both apps share the same Convex deployment.

`opus-owner/` has its own build and deployment and shares only two small contracts
under `shared/`. Its analytics functions live in the existing Convex backend and
require the single verified platform-owner email on every read. See
[`docs/OWNER_OVERVIEW.md`](docs/OWNER_OVERVIEW.md) before changing owner access,
metric definitions or deployment. The explicitly authorized owner report may
enumerate organization roots and global storage metadata; tenant-owned tables
still require their named `orgId` index. This is not a general admin-role bypass.

---

## Development Commands

All commands run from within each app directory (`cd opus-dashboard`, etc.).

```bash
# opus-dashboard
npm run dev           # Runs frontend (port 3000) + Convex backend (port 3210) in parallel
npm run dev:frontend  # Next.js only
npm run dev:backend   # Convex only
npm run build         # Next.js production build (standalone output)
npm run lint          # ESLint

# opus-mk
npm run dev           # Next.js on port 3001 (webpack, not turbopack)
npm run build
npm run lint

# opus-landing
npm run dev           # Next.js with turbopack on port 3000
npm run build
```

`opus-dashboard` has Vitest coverage through `npm test`; the marketplace and landing packages currently rely on lint and production builds.

**Note on opus-mk:** This package is paused. If the user explicitly resumes it, read its local Next.js documentation before writing Next.js-specific code.

---

## Tech Stack

| Layer        | Technology                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Backend / DB | Convex (real-time DB, mutations, queries, actions, scheduled jobs)                                |
| Frontend     | Next.js 16 (App Router, PPR)                                                                      |
| Auth         | Better Auth email OTP through Convex (`staff_members` is the permission boundary)                 |
| AI frontdesk | OpenAI Luna with Instagram Login messaging; availability requires verified provider configuration |
| Styling      | Tailwind CSS v4, shadcn/ui                                                                        |

---

## Architecture: How the Apps Connect

```
Browser / Customer
      │
      ▼
proxy.ts (opus-dashboard/proxy.ts)
      │  parses `{slug}.opus.mk` and rewrites to `/sites/{slug}`
      │  without fetching tenant data in the proxy
      ▼
Next.js App Router
  ├── (dashboard)/   — authenticated owner/staff UI (Better Auth)
  ├── (website)/     — public studio website and guest booking flow
  └── api/           — integration endpoints, including the Instagram webhook proxy
      │
      ▼
Convex Backend (convex/)
  ├── schema.ts      — single source of truth for all data shapes
  ├── bookings/      — booking mutations, slot conflict checks
  ├── ai/            — configured Instagram frontdesk, studio context and confirmed DM bookings
  ├── notifications/ — provider-backed queue; availability depends on configuration
  └── lib/           — shared helpers (auth, orgId resolution)
      │
      ▼
External APIs: Resend plus Sender for production transactional email; configured Twilio for Pro appointment SMS; configured OpenAI and Meta integrations for the Instagram frontdesk; WhatsApp remains deferred
```

---

## Database Rules (Non-Negotiable — Violations Are Security Bugs)

**1. `orgId` on everything.** Every table has `orgId`. Every query must filter by `orgId` via a named index. Never query without it.

```typescript
// ✅
ctx.db.query("bookings").withIndex("by_org", (q) => q.eq("orgId", orgId));
// ❌ Never
ctx.db.query("bookings").collect();
```

**2. Soft deletes only.** Set `isDeleted: true` + `deletedAt: Date.now()`. Never call `ctx.db.delete()`.

**3. Money in minor units (integers).** `2500` = £25.00. Never floats, never formatted strings.

**4. Timestamps as Unix milliseconds.** `Date.now()` everywhere. Never ISO strings.

**5. Booking writes use conflict checks inside mutations.** Check `by_staff_start` index before inserting — Convex mutations are serialised, use this guarantee.

**6. Write to `audit_log` on every significant mutation.** Bookings, cancellations, and AI actions. The log is append-only — never update or delete audit rows.

---

## Authentication & Authorisation

- Better Auth handles passwordless email OTP and exposes identity through `ctx.auth`. Always derive user identity and `orgId` server-side — never accept either as a client-supplied argument.
- `staff_members` table is the permission boundary (roles: `owner`, `manager`, `staff`).
- Three distinct user types: `users` (platform), `staff_members` (org employees), `customers` (booking subjects — not authenticated accounts). Never mix them.

---

## Convex Coding Rules

- All mutation arguments must use `v.*` validators. No unvalidated input.
- Never call Twilio, Resend, or Sender from inside a mutation — use Convex **Actions** for all external API calls.
- No business logic in React components — logic lives in Convex functions.
- Always query via named indexes (`.withIndex(...)`). Never use `.filter()` as the primary access path — it's a full table scan.
- `ConvexError` for user-facing errors; `throw new Error` for internal failures.
- Never edit `convex/_generated/` — auto-generated by Convex CLI.
- Every new table in `schema.ts` needs an index on `orgId`.

---

## Code Organization & Reuse

### File Layout (follow this strictly)

```
components/ui/           — Base UI primitives (shadcn + custom atoms like <Price>, <DebouncedInput>)
components/{domain}/     — Shared domain components used by 2+ routes (e.g. components/bookings/, components/ai-inbox/)
app/**/_components/      — Route-scoped components used only by that route's page
hooks/                   — Shared React hooks used by 2+ components (use-*.ts naming)
lib/                     — Pure functions, configs, type helpers — no React, no hooks
```

### Rules

**1. Extract when used in two places.** If a component or hook is needed by a second route or feature, move it out of `_components/` into `components/{domain}/` or `hooks/`. Don't copy-paste.

**2. Check before building.** Before writing a new component, scan `components/` for an existing one that covers the pattern. Extend the existing component rather than creating a parallel one.

**3. Pages compose — they don't implement.** Page files (`page.tsx`) should import and arrange components, not contain business UI logic or large JSX trees. If a page file grows past ~100 lines, extract the logical sections into `_components/`.

**4. `lib/` is React-free.** Pure functions, config objects, and type utilities only. React components and hooks go in `components/` or `hooks/` respectively.

**5. Shared hooks in `hooks/`.** Stateful logic reused across 2+ components (e.g. data-fetching wrappers, complex form state) goes in `hooks/use-*.ts`. Don't inline the same `useState`/`useEffect` pattern in multiple components.

**6. `components/ui/` is for primitives only.** Don't put domain-aware components (ones that import Convex queries or know about bookings/staff/etc.) into `components/ui/`. That directory is for generic, data-agnostic UI atoms.

---

## AI Frontdesk

Instagram AI frontdesk implementation was explicitly authorized on September 24, 2026. It uses OpenAI Luna and may complete new bookings only after the customer confirms the exact appointment summary. See [docs/AI_FRONTDESK.md](docs/AI_FRONTDESK.md) for setup and validation boundaries. Keep claims conditional on verified provider configuration.

WhatsApp remains deferred, and the removed public web-chat API must stay disabled. Broader AI campaigns still require explicit authorization.

- Every AI response must include a `confidenceScore` (0–1). Below `org_settings.aiConfidenceThreshold` (default `0.7`) → flag as `handed_off`, notify a human.
- AI must never directly mutate bookings. AI calls Convex Actions, which validate and call mutations.
- Every AI message and action must be written to both `ai_messages` and `audit_log`.
- Never inject raw database IDs into model prompts — resolve to human-readable labels and temporary references first.

---

## Notifications

Never call Twilio, Resend, or Sender directly from mutations. Write to the `notifications` queue table; a scheduled Convex Action handles delivery and retries.

Pro client appointment SMS was authorized on September 24, 2026. See
[`docs/SMS_NOTIFICATIONS.md`](docs/SMS_NOTIFICATIONS.md) for setup and delivery
boundaries. SMS requires configured Twilio and an enabled studio setting; verify
the Pro plan before queueing and sending. SMS campaigns and WhatsApp remain deferred.

---

## Deployment

**Local:** Each app runs independently. `opus-dashboard` runs frontend + Convex backend together.

**Target production topology:** `opus-landing/` is deployed to Vercel at `opus.mk`; `opus-dashboard/` is deployed as a separate Vercel project at `studio.opus.mk` and `*.opus.mk`. A VPS is not required for those web surfaces once Vercel has provisioned the wildcard domain and certificate. Follow [`docs/TENANT_WEBSITES.md`](docs/TENANT_WEBSITES.md); do not improvise per-tenant DNS records or reintroduce custom-domain settings.

---

## Key Domain Glossary

| Term                    | Meaning                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `org`                   | A business on the platform                                    |
| `staff_member`          | A user scoped to an org with a role                           |
| `customer`              | End-client of the business — not a platform user              |
| `service`               | A bookable item (e.g. "Men's Haircut — 30 min — £25")         |
| `availability_rule`     | Recurring weekly hours for a staff member                     |
| `availability_override` | One-off date-specific exception                               |
| `booking`               | Confirmed appointment tying customer + staff + service + slot |
| `ai_conversation`       | Thread of AI ↔ customer messages on a channel                 |
| `handoff`               | AI confidence drops below threshold, human takes over         |
