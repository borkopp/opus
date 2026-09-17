# Manual opening recovery

Implemented after the September 16, 2026 [optimizer review](GAP_OPTIMIZER_REVIEW.md).
The review describes the earlier implementation; this document describes its
replacement. This is a beauty-only, staff-approved email workflow, with no model
dependency or automatic outreach waves.

## Studio workflow

1. A paid studio publishes its tenant website and enables recovery in Settings →
   Gap optimizer. The minimum opening duration is 15–240 minutes.
2. Scan today or one of the following six dates. Bookings, cancellations,
   reschedules, and changes to staff, services, availability, or operational
   settings also schedule reconciliation for affected dates.
3. Review a concrete customer/service/staff/time/price offer and its reasons.
   Sparse history is labelled unknown. Staff can choose another eligible client.
4. An owner or manager approves the email. Only one offer can be active per
   opening, and each customer has a seven-day cooldown across the studio.
5. The client opens `{slug}.opus.mk/book?offer=…`, enters the email that received
   the offer, verifies it with the existing OTP flow, and confirms the appointment.
   The opening remains publicly bookable until confirmation; the offer is not a hold.
6. Offers expire after at most two hours, or before the fifteen-minute booking
   notice cutoff. Staff choose whether to invite another client after a decline
   or expiry. Disabling recovery invalidates outstanding offers.

## Selection and availability

The scanner and public booking use the same slot engine, including staff/service
assignment, active/public services, overrides, breaks, slot-grid alignment,
buffers, booking window, and notice. Edge openings and an empty working day are
included. Free time without a fitting public service produces no offer.

Rankings use completed service-specific appointments, not CRM visit counters.
Three distinct visit days can establish a median return interval. A known cycle
must be at least 80% elapsed before that service is suggested. Staff, time/day
preference, and observed no-shows refine the ordering. Scores are internal ordering
rules, never displayed as acceptance percentages. Upcoming bookings for the same
service or overlapping time exclude an offer. No waitlist or prediction model is
part of this release.

Reconciliation is one Convex mutation, so concurrent scans cannot commit duplicate
openings. An opening is keyed by staff, date, and the end of the free interval;
unchanged dismissed openings remain dismissed as the current time moves forward.
New or changed capacity can form a new opening. Up to five proposed clients are
retained per opening, plus explicit staff selections and historical outcomes.

The first implementation bounds work to 20 active specialists, 100 active services,
1,000 customer records, and 10,000 appointments in the 400-day history/future
window. Exceeding a bound fails explicitly rather than ranking truncated data.
Approval rejects customer histories exceeding 500 records. These are defensive
limits, not validated capacity claims; larger studios need paginated reconciliation
and precomputed service history before raising them.

## Permission and delivery

The guest booking form has an optional, unchecked email-offer consent control.
Consent is recorded only after verified booking succeeds. Existing clients can
have explicit permission recorded by a manager after they agree. Legacy marketing
permission is accepted only with an explicitly selected email channel; an explicit
new opt-out overrides it. Transactional booking email is separate.

The offer page provides decline and unsubscribe controls, including after offer
expiry. Revocation invalidates outstanding offers. Deleted/erased clients and
changed recipient addresses are rejected. A permanent bounce or suppression blocks
further offers to that address; correcting the customer email permits a new check.
A provider complaint revokes opening-email permission.

The notification queue uses a stable deduplication key, worker claims, and existing
bounded retries. Approval means **Queued**; provider acceptance means **Provider
accepted**; **Delivered** requires provider evidence. Terminal failures are shown,
and an approved retry reuses the original notification and token. A notification
already accepted by a provider cannot be manually retried through this workflow.
Resend delivery feedback updates recovery state through the existing signed webhook.

Configuration belongs in the Convex environment:

- `REMINDER_EMAIL_PROVIDERS`: existing reminder route, such as `resend`.
- Appropriate provider credentials (`RESEND_API_KEY` or `SENDER_API_TOKEN`) and a
  configured sender (`BOOKING_EMAIL_FROM` / `AUTH_EMAIL_FROM`, or Sender override).
- `ROOT_DOMAIN`: tenant root used in email links; defaults to `opus.mk`. Match the
  frontend `NEXT_PUBLIC_ROOT_DOMAIN` when using another environment.
- Existing public booking OTP secrets and transactional email configuration.
- Existing `RESEND_WEBHOOK_SECRET` for authenticated delivery/bounce/complaint events.

The UI reports missing email configuration. Credential presence does not prove
sender-domain approval or inbox delivery. SMS and WhatsApp offers are not enabled.

## Transactional guarantees and reporting

Approval rechecks permission, cooldown, current price, and the exact public slot in
the same mutation that enqueues the offer. Delivery rechecks current eligibility
before the provider call. A provider call and database write cannot be one
transaction; a permission change during an in-flight call can still race delivery.
The token becomes unusable immediately after an invalidating database change.

Only a random 192-bit token appears in the link. Its lookup hash is stored on the
candidate; the queue retains the delivery URL. The public response reveals no
recipient identity. Knowing a link cannot bypass email verification or book a
different service, time, staff member, or recipient. Offer acceptance, normal
conflict validation, booking creation, attribution, and competing-offer
invalidation all happen inside the booking mutation.

An ordinary booking occupying the slot invalidates competing offers without taking
recovery credit. Attributed-booking counts include confirmed, checked-in, and
completed linked appointments; cancelled, deleted, and no-show appointments are
excluded. Completed appointment value uses actual completed booking snapshots,
grouped by currency. This is appointment value, not payment collection, profit, or
proof that outreach caused incremental revenue. Rescheduling does not create
another attributed conversion.

Existing schemas remain compatible. Version 1 suggestions are hidden from the new
dashboard; the delivery worker cancels legacy offers without concrete service/token
data. A new scan generates current suggestions. No customer-data migration is needed.

## Verification

The 21 scenarios in `tests/convex/gap-recovery.test.ts` use an isolated Convex test database and mocked
email providers. It covers edges and empty days, public-slot agreement, repeat and
concurrent scans, completed-history ranking, sparse history, cooldowns, permission,
duplicate approvals, delivery/failure/retry, bounce/complaint feedback, token
recipient checks, expiration, competing ordinary bookings, atomic attribution,
manual selection, and tenant isolation.

66 focused recovery, email, booking, access, and hardening tests pass. Targeted
ESLint checks pass. Browser inspection reached the local login page; authenticated
dashboard and customer-flow visual verification remain outstanding.

Shared booking, quick-booking, activation, paid-access, and hardening suites were
also run. Two unrelated existing failures remain: the optional-phone test conflicts
with the required-phone API, and a manager-permissions fixture exceeds the Free
plan's staff capacity. The same optional-phone test blocks the workspace TypeScript
check. No production deployment or live customer-email verification was performed.
