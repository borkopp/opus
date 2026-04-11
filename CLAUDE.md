# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**OPUS** is a multi-tenant SaaS white-label Business Operating System for service-based businesses (barbers, salons, spas, consultants, trainers). Three revenue layers: monthly subscriptions, payment processing margin via Braintree, and future fintech products.

Each business gets a branded experience: custom subdomain or domain, their own color scheme, optionally their own mobile app.

---

## Monorepo Structure

Three independent Next.js applications sharing a single Convex backend:

| App | Purpose | Dev port |
|-----|---------|----------|
| `opus-dashboard/` | Business owner dashboard — bookings, staff/service management, analytics | 3000 (frontend), 3210 (Convex) |
| `opus-mk/` | Public marketplace — users search available businesses/services and book with or without an account; RAG AI powers recommendations with more AI features planned | 3001 |
| `opus-landing-page/` | Marketing site — no backend, no auth | 3000 |

`opus-mk/convex` is a symlink to `../opus-dashboard/convex`. Both apps share the same Convex deployment.

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

# opus-landing-page
npm run dev           # Next.js with turbopack on port 3000
npm run build
```

No test framework is configured — there are no test commands.

**Note on opus-mk:** This app uses Next.js 16.2.1 with breaking changes. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code for it.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend / DB | Convex (real-time DB, mutations, queries, actions, scheduled jobs) |
| Frontend | Next.js 16 (App Router, PPR) |
| Auth | Clerk (`ctx.auth` in Convex; `staff_members` table is the permission boundary) |
| Payments | Stripe Connect (split payouts) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Messaging | Twilio (SMS/WhatsApp), Resend (email) |
| Styling | Tailwind CSS v4, shadcn/ui |

---

## Architecture: How the Apps Connect

```
Browser / Customer
      │
      ▼
proxy.ts (app/proxy.ts in opus-dashboard)
      │  resolves hostname → orgId via Convex orgs table
      │  (by_slug index for subdomains, by_custom_domain for custom domains)
      ▼
Next.js App Router
  ├── (dashboard)/   — authenticated owner/staff UI (Clerk)
  ├── (booking)/     — public white-labeled booking flow
  └── api/           — Stripe webhooks, AI webhooks
      │
      ▼
Convex Backend (convex/)
  ├── schema.ts      — single source of truth for all data shapes
  ├── bookings/      — booking mutations, slot conflict checks
  ├── payments/      — Stripe webhook handlers, payout logic
  ├── ai/            — Claude conversation handlers
  ├── notifications/ — outbound message queue + scheduler
  └── lib/           — shared helpers (auth, orgId resolution)
      │
      ▼
External APIs: Stripe, Clerk, Twilio, Resend, Anthropic
```

---

## Database Rules (Non-Negotiable — Violations Are Security Bugs)

**1. `orgId` on everything.** Every table has `orgId`. Every query must filter by `orgId` via a named index. Never query without it.

```typescript
// ✅
ctx.db.query("bookings").withIndex("by_org", (q) => q.eq("orgId", orgId))
// ❌ Never
ctx.db.query("bookings").collect()
```

**2. Soft deletes only.** Set `isDeleted: true` + `deletedAt: Date.now()`. Never call `ctx.db.delete()`.

**3. Money in minor units (integers).** `2500` = £25.00. Never floats, never formatted strings.

**4. Timestamps as Unix milliseconds.** `Date.now()` everywhere. Never ISO strings.

**5. Booking writes use conflict checks inside mutations.** Check `by_staff_start` index before inserting — Convex mutations are serialised, use this guarantee.

**6. Write to `audit_log` on every significant mutation.** Bookings, payments, cancellations, AI actions. The log is append-only — never update or delete audit rows.

---

## Authentication & Authorisation

- Clerk handles auth. Always derive `orgId` from `ctx.auth` — never accept it as a client-supplied argument.
- `staff_members` table is the permission boundary (roles: `owner`, `manager`, `staff`).
- Three distinct user types: `users` (platform), `staff_members` (org employees), `customers` (booking subjects — not Clerk users). Never mix them.

---

## Convex Coding Rules

- All mutation arguments must use `v.*` validators. No unvalidated input.
- Never call Stripe, Twilio, or Resend from inside a mutation — use Convex **Actions** for all external API calls.
- No business logic in React components — logic lives in Convex functions.
- Always query via named indexes (`.withIndex(...)`). Never use `.filter()` as the primary access path — it's a full table scan.
- `ConvexError` for user-facing errors; `throw new Error` for internal failures.
- Never edit `convex/_generated/` — auto-generated by Convex CLI.
- Every new table in `schema.ts` needs an index on `orgId`.

---

## AI Agent Rules

The AI front-desk uses Claude to handle inbound messages autonomously (WhatsApp, Instagram DM, web chat).

- Every AI response must include a `confidenceScore` (0–1). Below `org_settings.aiConfidenceThreshold` (default `0.7`) → flag as `handed_off`, notify a human.
- AI must never directly mutate bookings. AI calls Convex Actions, which validate and call mutations.
- Every AI message and action must be written to both `ai_messages` and `audit_log`.
- Never inject raw database IDs into Claude prompts — resolve to human-readable labels first.

---

## Notifications

Never call Twilio or Resend directly from mutations. Write to the `notifications` queue table; a scheduled Convex Action handles delivery and retries.

---

## Payments

- All processing through Stripe Connect. Never store card details.
- On `payment_intent.succeeded` webhook: read `payout_splits`, create `payouts` rows, initiate Stripe transfers.
- Always verify Stripe webhook signatures before processing.

---

## Deployment

**Local:** Each app runs independently. `opus-dashboard` runs frontend + Convex backend together.

**Production (Hetzner VPS):** Docker images built via GitHub Actions on push to `main`, pushed to GHCR, deployed via SSH + `docker compose up`.

```
Ports: opus-dashboard → 3006, opus-mk → 3007
Env files on VPS: /opt/opus/.env.dashboard, /opt/opus/.env.mk
```

`NEXT_PUBLIC_*` vars are build-time ARGs (inlined into the Docker image). Server-side secrets live only in the VPS `.env` files, never baked into images.

---

## Key Domain Glossary

| Term | Meaning |
|------|---------|
| `org` | A business on the platform |
| `staff_member` | A user scoped to an org with a role |
| `customer` | End-client of the business — not a platform user |
| `service` | A bookable item (e.g. "Men's Haircut — 30 min — £25") |
| `availability_rule` | Recurring weekly hours for a staff member |
| `availability_override` | One-off date-specific exception |
| `booking` | Confirmed appointment tying customer + staff + service + slot |
| `payment_intent` | Mirrors a Stripe PaymentIntent, updated by webhooks |
| `payout_split` | How a payment is divided between recipients |
| `ai_conversation` | Thread of AI ↔ customer messages on a channel |
| `handoff` | AI confidence drops below threshold, human takes over |
