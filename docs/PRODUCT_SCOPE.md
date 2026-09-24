# OPUS Product Scope

This document is the product-direction authority for the repository. Read it before changing product behavior, navigation, onboarding, public copy, or roadmap claims.

## Canonical positioning

> OPUS helps small beauty studios manage appointments and turn cancellations and empty calendar slots into booked appointments.

For the current phase, OPUS is a beauty appointment SaaS for small beauty businesses in Macedonia. It is not a general local-business marketplace or an international, multi-vertical operating system.

## Target customer

The first customers are small teams, usually one to five people, that currently accept appointments through Instagram, phone calls, messages, or notebooks:

- nail salons;
- lash and brow studios;
- beauty and hair salons;
- makeup artists;
- massage and wellness studios.

## The only active vertical

`beauty_wellness` is the only enabled product vertical. The dashboard, onboarding, public studio websites, booking flow, navigation, metadata, and marketing must all present a coherent beauty-only product.

The active web surfaces are:

- `opus-dashboard/` for business onboarding, services, staff, availability, customers, calendar, appointment management, automatic `{slug}.opus.mk` studio websites, and guest booking;
- `opus-landing/` for the truthful beauty-focused `opus.mk` marketing site.

The separate `opus-owner/` app is an internal, read-only platform overview at
`admin.opus.mk`, accessible only to the OPUS owner's verified email. It does not
add a customer vertical or a business-facing feature. See [`OWNER_OVERVIEW.md`](OWNER_OVERVIEW.md).

`opus-mk/` is retained as a dormant marketplace package, but marketplace discovery and marketplace publication are paused. Do not delete its schemas or reusable backend foundations, and do not expose or expand the marketplace unless the user explicitly resumes that work.

The enabled-vertical boundaries live in `opus-dashboard/lib/product-scope.ts`, `opus-dashboard/convex/lib/productScope.ts`, and `opus-mk/lib/product-scope.ts`. Deferred dashboard capability flags also live in `opus-dashboard/lib/product-scope.ts`. Do not casually bypass them with a new local condition.

## Golden booking journey

Reliability of this path takes priority over optional features:

1. A beauty business completes onboarding.
2. It creates or configures services.
3. It configures staff members and working hours.
4. It publishes a usable website at `{business-slug}.opus.mk`.
5. A customer opens the link without needing an account.
6. The customer selects a service, staff member when applicable, date, and available time.
7. The customer enters their details and confirms the appointment.
8. The appointment appears in the business calendar and dashboard.
9. Conflicting or duplicate appointments are rejected inside the booking mutation.
10. Authorized staff can reschedule, cancel, complete, or mark the appointment as a no-show.
11. Customer-facing confirmation, unavailable, empty, loading, and error states resolve clearly.

## Priorities

### P0 — required now

- beauty-business onboarding;
- services and prices;
- staff, business hours, and staff availability;
- guest public booking;
- automatic, beauty-only studio websites on OPUS subdomains;
- calendar and appointment lifecycle management;
- tenant isolation and booking-conflict protection;
- clear mobile-responsive states;
- accurate Macedonian and English beauty copy.

### P1 — retain when already sufficiently functional

- customer records;
- booking confirmations and reminders when a real provider is configured;
- cancellation recovery;
- waitlist or gap-filling workflows.

### P2 — explicitly deferred

- autonomous AI campaigns and channels beyond the authorized Instagram frontdesk;
- automated gap analysis and campaigns;
- loyalty;
- international expansion;
- native consumer applications;
- marketplace discovery and marketplace expansion.

P2 code may remain as a dormant foundation. It must not be advertised as operational or expanded without explicit instruction.

### Authorized manual opening recovery

Manual opening recovery was explicitly authorized on September 16, 2026. The
existing `/gap-optimizer` page now supports paid beauty studios with a published
website. It reconciles bookable openings over the next seven days, ranks concrete
service offers using completed appointments, and requires owner or manager
approval for every email. Calendar changes can refresh suggestions; they cannot
approve or send an offer automatically.

Clients must have email-offer permission, and acceptance uses the studio website's
email verification and atomic booking checks. Queueing, provider acceptance,
delivery, expiry, and attributed bookings are distinct outcomes. No AI model is
required for this workflow. Waitlists, learned acceptance probabilities, and
autonomous campaigns remain deferred. The legacy `automatedGapOptimizer` flag
names this manual capability; it does not authorize campaigns.

See [GAP_RECOVERY.md](GAP_RECOVERY.md) for configuration, limits, and validation.

### Authorized Pro appointment SMS

Client appointment SMS was explicitly authorized on September 24, 2026 for
the Pro plan. Pro beauty studios can enable confirmations, reschedules,
cancellations, and configurable reminders under Settings → Notifications.
SMS requires a configured Twilio provider and explicit studio activation.
Free studios cannot enable or send SMS, including after a plan downgrade.
Email reminders remain independently configurable on Pro. This authorization does
not enable SMS campaigns, recovery offers, WhatsApp, or SMS verification.

See [SMS_NOTIFICATIONS.md](SMS_NOTIFICATIONS.md) for setup and validation.

### Pro client directory

The staff client directory was authorized on September 24, 2026. Active staff,
managers and owners of Pro beauty studios can search their studio's clients by
name, email or phone and view contact details, appointment history and upcoming
appointments. Visit totals and appointment value use completed, non-deleted
appointments only; appointment value is not a payment balance. Multiple currencies
remain separate. Read access is checked against the current studio and plan on
the server. Free studios retain client contact details needed for booking, but
cannot access the directory or its statistics.

### Pro client email reminders

Client appointment reminders by email are Pro-only, as authorized on September
24, 2026. Settings offers 24, 3, 2, and 1 hour before the appointment. Free
studios cannot enable or change client reminder schedules. Booking and reminder
reconciliation skip Free studios' client reminders, and delivery checks the
current plan so queued reminders stop after a downgrade. Email verification,
appointment confirmations and changes, and team emails remain available on Free.

### Authorized business analyst

The read-only business analyst was explicitly authorized on September 16, 2026.
It lives in the beauty dashboard at `/beauty/assistant` and is restricted to
paid-plan owners and managers. It answers questions using tenant-scoped booking
analytics, attaches inspectable reports, and proposes experiments. It cannot
change appointments, contact customers, launch campaigns, or infer profit from
appointment prices. This authorization does not enable the AI front desk or the
dormant marketplace.

New analyses require the Convex `BUSINESS_ANALYST_ENABLED=true` flag and a
`BUSINESS_ANALYST_OPENAI_API_KEY`. Availability must be verified before marketing it as live.
See [BUSINESS_ASSISTANT.md](BUSINESS_ASSISTANT.md) for metric definitions,
allowances, configuration, and rollout checks.

### Authorized Instagram AI frontdesk

Instagram frontdesk implementation was explicitly authorized on September 24,
2026, including appointment creation in DMs after a separate customer
confirmation, and owner-written studio context for product, aftercare and policy
questions. The user selected OpenAI GPT-6 Luna for this workload.

Paid beauty studios can configure context and connect their own professional
Instagram account under Settings → AI front desk. A signed webhook durably
records messages; the assistant answers from studio facts, checks live slots,
and proposes appointments. Only a later explicit customer confirmation can
create a booking, after atomic availability and price checks. Missing facts,
low-confidence answers, attachments and provider failures require human review
in the AI inbox. Owners and staff can take over and reply there.

This is a configured-provider capability, not an unconditional live promise.
`AI_FRONTDESK_ENABLED`, OpenAI access, Meta app configuration and a verified
studio connection must all be ready before automatic replies operate. WhatsApp,
voice, public web chat, campaigns, cancellations and rescheduling by AI are not
enabled by this authorization. The former unauthenticated web-chat endpoints
are retired. See [AI_FRONTDESK.md](AI_FRONTDESK.md) for setup and rollout checks.

## Hospitality freeze

Hospitality was explored during earlier product directions and remains in parts of the schema and backend. It is postponed, not deleted. Preserve historical data and reusable foundations, but do not expose restaurants, cafes, table reservations, floor plans, events, or QR menus in active UI, routes, filters, demo data, metadata, or marketing.

Published legacy hospitality records must still be excluded at the server-side public discovery and booking boundary. Old dashboard hospitality URLs must resolve to a safe unavailable state instead of showing unfinished screens.

## Truthful product claims

- Do not imply that SMS, WhatsApp, email, AI actions, or reminders completed unless the required provider is configured and the behavior has been verified.
- Do not publish pricing, trial periods, business metrics, testimonials, or availability claims that are not backed by the live product.
- Do not introduce unrelated product ideas during stabilization work.

## Conditions for scope expansion

A new vertical or major P2 surface may be activated only after all of the following:

1. the user gives explicit authorization for that scope change;
2. the golden beauty booking journey is stable and covered by relevant checks;
3. the new vertical has an end-to-end owner and customer journey, not only schema or mock UI;
4. tenant, authorization, availability, conflict, and audit-log rules are enforced server-side;
5. marketing and metadata describe only behavior that is genuinely operational;
6. the enabled-vertical boundary, regression tests, and this document are deliberately updated together.

Future agents must not introduce or re-enable another vertical based on dormant code, an old overview, or an inferred roadmap. Ask for explicit authorization before changing product scope.

## Native applications come last

Native applications are intentionally deferred until the dashboard and public studio website golden journey is stable. Do not expand, synchronize, or otherwise touch native clients during the current phase unless the user explicitly authorizes native work. Web stabilization comes first; native apps are last.
