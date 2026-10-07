# OPUS staff and client accounts

This implementation was authorized on October 4, 2026 and simplified on
October 5, 2026. It is local work only;
nothing has been deployed to production. The local Convex development backend
may run the current functions.

## Identity and access

Better Auth remains the authentication provider, with passwordless email OTP,
the existing CAPTCHA and rate limits, and the existing studio origin and cookie
configuration. Sessions now expire after 30 days and renew at most once daily.
Existing sessions keep their stored expiry until renewed. Clients verify their
email when signing in; a valid remembered session books without another OTP.
Expired sessions, new devices, and sign-out require another sign-in.

One authentication identity can have both a business profile (`users`) and a
client profile (`opus_users`). Neither profile grants business access. Active
`staff_members` memberships grant that access separately for each studio.
`customers` remain studio-owned CRM records, not login accounts. A client can
have a separate customer record at each studio under the same OPUS identity.

Client profiles and authenticated membership/relationship roots are the narrow
global identity lookup exception. Booking reads use named organization indexes.
Client history is filtered by the authenticated `opusUserId`; no salon can read
another salon's records through this account area.

## Staff accounts

Owners and managers can enter an optional sign-in email in **Add Staff**.
Creating the staff seat and queueing its email-bound invitation happen in the
same mutation. Invalid emails or a failed plan check create neither. Existing
members have one **Manage staff** workspace: **Profile & login**, **Hours** and
**Time off**. Profile details are edited inline; the separate edit dialog has
been removed. Login access and invitation controls live beside those details.
New invitations and their acceptance require Pro; invitations expire after
72 hours. Resending replaces pending invitations for that staff seat. Tokens
are consumed on acceptance. Acceptance verifies the signed-in email, the active
staff seat, the studio, and absence of another membership in the same studio.
Invitation emails link to `/invites/[token]` on the existing studio origin.

New staff seats default to `bookingAccess: own`. Their web calendar, mobile
calendar and overview contain only assigned appointments and the client contact
details needed for those appointments. Other appointment reads and writes are
rejected server-side. The client directory, settings, promotion tools, team
management and other broad studio endpoints are denied. The native client hides
its client and management routes for these accounts.

Owners and managers retain team access. Only an owner can change a staff account
between personal and existing team access, or revoke a non-owner's account
access. Revocation unlinks the login without deleting the staff seat, schedule,
or appointments. A user with multiple active studio memberships can switch
studios; every subsequent request resolves and validates the active membership.

Compatibility: missing `bookingAccess` means the existing team permissions.
Existing linked accounts are not narrowed or blocked by a plan downgrade.
Old pending invitations without `personalAccount` keep their prior Free/Pro
behavior. New invitations use the Pro boundary. Personal staff are excluded from
studio-wide notification recipient lists. Assigned appointment notifications use
their linked account's email, including the current settings for team reminders.
The separate appointment-email field is retired in web and native editors.
Legacy stored addresses remain in the database but are ignored, hidden by active
APIs, and never used for delivery. Delivery checks current account linkage;
revoking it stops queued assigned notifications. Accepting an invitation also
refreshes upcoming appointment reminders for the newly linked account.

## Client booking and account area

Client accounts are available at every published beauty studio on Free and Pro.
There is no salon account-enable setting. The legacy `clientAccountsEnabled`
field/API remains only for compatibility and cannot disable booking or cancellation.
Clients may continue as guests without registering.

All salon `/book` links redirect to the central `/book/[slug]` page, preserving
service, staff, date/time and recovery-offer selections. Studio branding remains
on that page. One host-scoped Better Auth session then works across salons,
without new DNS records or a broad cross-subdomain cookie. Production uses the
existing `studio.opus.mk` origin; local booking resolves to the current local
frontend. `NEXT_PUBLIC_CLIENT_ACCOUNT_URL` may override that central origin.

The details form has one optional **Create an OPUS account** checkbox, off by
default. With it selected, Better Auth sends one sign-in OTP using the existing
CAPTCHA, proxy proof and rate limits. Verifying it creates or reuses the verified
identity and sets the remembered session. A fresh JWT from that session then
confirms the appointment using the normal atomic authenticated booking mutation.
No second email code or manual login is required. A taken slot leaves the account
signed in and the booking unconfirmed so another slot can be chosen. Leaving the
checkbox off retains the existing guest challenge/verification path and creates
no login. Returning signed-in clients confirm directly without an OTP.

Account booking uses the session email server-side and preserves availability,
conflict, pricing, recovery-offer recipient/pricing, audit and notification rules.
Successful booking saves the client's name/phone. Recovery offers remain bound
to their exact verified recipient and slot even for remembered clients.

The previous opening-offer email checkbox is removed. New booking clients receive
the enabled preference by default; a previously recorded opt-out is preserved.
The audit distinguishes this `booking_default` from explicit legacy consent.
Unsubscribe links and staff preference controls remain effective. This does not
change analytics/cookie consent or enable autonomous campaigns.

`/account/sign-in` also remains available as a standalone client login. `/account`
shows linked upcoming/history appointments, saved details, booking again,
sign-out and sign-out of other devices. Client and shared booking routes exclude
analytics capture, and recovery-token pages use a no-referrer policy.

For newly verified guest bookings at a published beauty studio, the confirmation page
and customer confirmation email offer a seven-day, single-booking claim link.
Only its hash is stored on the booking. The secret travels in a URL fragment,
is kept in browser session storage during sign-in, and is removed from the URL.
The logged-in email must match the email verified for that booking, and the
claim must be unexpired, unconsumed, and for an unowned booking. Claims create
no access to other bookings that happen to share an email or customer record.
Rescheduled guest bookings receive a fresh link when their verified email still
matches the customer record. No bulk migration or automatic historical linking
is performed. Client account and invitation routes exclude analytics capture.

Clients may cancel their own confirmed appointment before the salon's configured
cancellation deadline. Time comparisons use studio wall-clock helpers.
Cancellation uses the same audited mutation, notification queue and recovery
refresh as staff cancellation. Other changes require contacting the salon.

## Compatibility, release and rollback

All schema additions are optional fields or indexes. No existing user, customer,
booking, staff seat or session is deleted or recreated. The existing owner and
guest paths remain available. The dormant `opus-mk` package is untouched.
Passkeys, social login, native consumer apps, marketplace discovery and loyalty
are not introduced by this work.

A future release should deploy the compatible backend before its frontend and validate
the new booking flow in staging. Verify
the real owner login, guest email delivery, client login/session renewal,
invitation delivery/acceptance, cancellation and two-studio isolation before
releasing to the existing production salon. Local tests do not prove provider
delivery or an actual native device flow.

To remove individual staff access, revoke their membership link through the
owner controls. Preserve the additive schema and personal authorization checks
during rollback. The retired client setting is not a kill switch. Reverting to
an old backend that ignores `bookingAccess` would restore broad staff permissions
and is unsafe. Do not restore an old database snapshot over bookings created
after release.

## Local validation

`tests/convex/accounts.test.ts` exercises legacy compatibility, Pro invitation
rules, invitation email binding, own-appointment reads and writes, native data
filtering, revocation, studio switching, one consumer across two studios, claim
proofs and expiry, cancellation deadlines, duplicate booking protection, and
ownership across rescheduling. Existing booking, authentication, notification
and mobile regression suites remain part of verification.

The simplified flow passed 581 automated tests (two existing suites are skipped),
web/native type checks and lint. An isolated Next.js build also passed compilation,
type checking and page generation; it used normal output instead of standalone
packaging because its dependencies were linked from the working checkout.
Browser checks used isolated authentication/backend fixtures for guest confirmation,
one-code account creation and automatic login, and remembered booking without
another OTP. The real local staff creation/editor views were checked without
sending invitations or changing studio data, including narrow layouts.
