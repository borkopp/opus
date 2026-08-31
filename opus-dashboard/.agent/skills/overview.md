# OPUS Dashboard Overview

This file is a focused implementation guide for `opus-dashboard`. The repository-wide [`AGENTS.md`](../../../AGENTS.md), dashboard [`AGENTS.md`](../../AGENTS.md), and [`docs/PRODUCT_SCOPE.md`](../../../docs/PRODUCT_SCOPE.md) are authoritative and must be read before product work.

## Current Product Scope

OPUS is a beauty appointment SaaS for small beauty studios in Macedonia.

> OPUS helps small beauty studios manage appointments and turn cancellations and empty calendar slots into booked appointments.

`beauty_wellness` is the only active vertical. Hospitality schemas and reusable backend foundations may remain dormant, but restaurants, table reservations, menus, and other hospitality behavior must not appear in active UI, routes, metadata, onboarding, or marketing.

The current web surfaces are:

- `opus.mk` — the marketing site from `opus-landing`;
- `studio.opus.mk` — the authenticated owner and staff dashboard from this project;
- `{business-slug}.opus.mk` — the automatically provisioned public studio website and guest booking flow from this project.

The marketplace in `opus-mk` is dormant for the current phase and has an independent publication state. Native clients are outside this web-focused monorepo and must not be reintroduced here.

OPUS does not process customer payments. Customers arrange payment directly with the studio.

## Technology

| Layer | Technology |
|---|---|
| Backend and database | Convex queries, mutations, actions, scheduled jobs, and storage |
| Dashboard and studio sites | Next.js 16 App Router |
| Authentication | Better Auth passwordless email OTP through Convex |
| Tenant routing | The project-root `proxy.ts`, deployed behind `studio.opus.mk` and `*.opus.mk` |
| Styling | Tailwind CSS v4 and shadcn/ui |
| Optional providers | Resend and other provider-backed foundations only when configured and verified |

Autonomous AI, automated campaigns, loyalty, international expansion, and native clients are deferred. Preserve dormant foundations without presenting them as operational.

## Project Structure

```text
opus-dashboard/
├── app/
│   ├── (dashboard)/                 # Authenticated owner/staff UI
│   ├── (website)/sites/[slug]/      # Internal target for public tenant rewrites
│   ├── login/ and signup/           # Better Auth entry points
│   ├── onboarding/                  # Beauty-business activation
│   └── api/                         # Auth and retained integration endpoints
├── components/
│   ├── public-site/                 # Public studio website and booking UI
│   ├── bookings/                    # Shared booking UI
│   └── ui/                          # Data-agnostic primitives
├── convex/
│   ├── schema.ts                    # Data-shape source of truth
│   ├── website.ts                   # Website readiness and owner publication
│   ├── publication.ts               # Automatic website status recomputation
│   ├── publicSite.ts                # Public-safe website query
│   ├── publicBooking.ts             # Guest booking and availability
│   └── lib/                         # Auth, activation, publication, and slug helpers
├── lib/
│   ├── tenant-sites.ts              # Shared hostname and URL helpers
│   └── public-site-server.ts        # Host-bound public data loader
└── proxy.ts                         # The single Next.js host router and auth guard
```

Never add another `app/proxy.ts`. Next.js supports one Proxy file at the project root, alongside `app`.

## Automatic Studio Websites

Wildcard DNS and TLS are configured once for `*.opus.mk`. Publishing does not create a DNS record or Vercel domain per business. A valid, unique slug immediately maps to `https://{slug}.opus.mk` after the website is published.

The project-root `proxy.ts` must keep these concerns separate:

1. A routeable tenant hostname rewrites to `/sites/{slug}` while preserving the requested path.
2. `studio.opus.mk`, reserved subdomains, and non-tenant hosts remain on dashboard routes.
3. Dashboard routes use the Better Auth cookie as an optimistic navigation guard.
4. Convex functions remain the authorization and publication boundary.

Do not fetch tenant data in Proxy. Host parsing is deterministic; `publicSite.getBySlug` decides whether the requested beauty studio is publicly available.

Tenant slugs must:

- use the shared `convex/lib/tenantSites.ts` helpers;
- be unique, routeable DNS labels;
- reject reserved platform labels such as `studio`, `www`, `api`, and `app`;
- remain stable after first publication unless a deliberate migration is implemented.

Custom domains are not part of the current product. Do not add custom-domain settings, mutations, lookups, routing, DNS instructions, or provisioning APIs. A legacy stored field may remain temporarily only when required for safe data compatibility.

## Website and Marketplace State Are Independent

Direct studio websites use:

- `websiteStatus`: `unpublished`, `published`, or `suspended`;
- `websitePublishedAt`: the first website publication timestamp.

The dormant marketplace continues to use `listingStatus`. Never make website publication publish a marketplace listing, schedule marketplace embeddings, or otherwise couple these states.

Website readiness reuses the beauty activation requirements for business identity, location, provider, service, availability, and booking settings. Changes to those requirements recompute `websiteStatus`; they do not recompute marketplace visibility.

Public website queries must return only published, non-deleted `beauty_wellness` organizations and public-safe fields. Do not expose dormant hospitality, AI, audit, authorization, or internal operations data.

## Golden Booking Journey

Reliability of this journey takes priority over optional work:

1. An owner signs in with email OTP and completes beauty onboarding.
2. The business configures services, staff, and working hours.
3. The owner publishes the studio website and receives `{slug}.opus.mk`.
4. A guest opens the website without creating an account.
5. The guest selects a service, eligible staff member, date, and available time.
6. The guest enters contact details and confirms.
7. The appointment appears in the studio dashboard.
8. Conflicting or manipulated slots are rejected inside the serialized booking mutation.
9. Authorized staff manage the appointment lifecycle.

## Multi-Tenancy and Data Integrity

These rules are non-negotiable:

- Scope organization-owned data by `orgId` using named indexes.
- Derive staff identity and active organization server-side; never trust client-supplied identity or authorization state.
- Use `staff_members` as the organization permission boundary.
- Keep `users`, `staff_members`, and unauthenticated booking `customers` distinct.
- Soft-delete business data with `isDeleted` and `deletedAt`; never hard-delete it.
- Store money as integer minor units and timestamps as Unix milliseconds.
- Validate every Convex mutation argument with `v.*`.
- Perform availability and overlap checks inside the booking mutation.
- Append audit rows for significant lifecycle mutations; never edit or delete audit history.
- Use `ConvexError` for user-facing failures and `Error` for unexpected internal failures.
- Never edit `convex/_generated/` manually.

Public booking inputs include an `orgId`, service, staff member, and time because guests are unauthenticated. The mutation must independently verify that the website or compatible public channel is published, every referenced record belongs to that organization, and the requested slot is still valid.

## External Providers and Dormant Foundations

Never call an external provider from a Convex mutation. Queue work or use an Action.

Do not claim that email, SMS, WhatsApp, reminders, or AI actions were delivered unless the relevant provider is configured and the result is verified. AI front-desk code is P2 and must not be expanded or advertised during web stabilization without explicit authorization.

## Code Organization

- Pages compose route sections; substantial UI belongs in route-scoped `_components` or shared domain components.
- Reuse a component or hook when a second consumer appears instead of copying it.
- Keep `components/ui` generic and data-agnostic.
- Keep `lib` React-free; hooks belong in `hooks/use-*.ts`.
- Keep tenant branding data-driven. Do not hardcode a business name, logo, color, service, or staff member in shared public-site components.
- Preserve unrelated working-tree changes and validate only the affected packages.

## Do Not

- Do not expose or expand hospitality.
- Do not touch or repurpose the dormant marketplace while implementing studio websites.
- Do not couple `websiteStatus` to `listingStatus`.
- Do not add custom-domain functionality.
- Do not add native application code.
- Do not present deferred AI or messaging foundations as active.
- Do not process or advertise online payments.
- Do not bypass server-side tenant, role, publication, availability, or conflict checks.

## Glossary

| Term | Meaning |
|---|---|
| `org` | A beauty business on OPUS and the root of its tenant data |
| `staff_member` | An owner, manager, or staff user scoped to an organization |
| `customer` | The booking subject; not an authenticated platform account |
| `service` | A bookable treatment with duration, price, and eligible staff |
| `availability_rule` | Recurring weekly working time for a staff member |
| `availability_override` | A date-specific exception to recurring availability |
| `booking` | A confirmed appointment connecting customer, service, staff, and slot |
| `websiteStatus` | Publication state for `{slug}.opus.mk` |
| `listingStatus` | Separate dormant marketplace visibility state |
