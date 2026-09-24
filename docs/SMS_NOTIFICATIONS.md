# Pro appointment SMS

Implemented for Pro (`org.plan === "paid"`) beauty studios. Owners enable SMS in
Settings → Notifications and choose reminder times independently from email.
New studios start with SMS off; the default SMS reminder is 24 hours before.
An empty reminder schedule sends only confirmations and appointment changes.

Supported client messages are booking confirmation, reschedule, cancellation,
and reminders. They use the studio's Macedonian or English locale. Manual,
public website, and confirmed Instagram bookings share the booking queue path.
SMS review requests, campaigns, recovery offers, WhatsApp, and OTPs are excluded.

## Configure Twilio

Set these **on the Convex deployment**, never in browser variables:

- `SMS_ENABLED=true` after the rollout checks below.
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` for the sending account.
- `TWILIO_MESSAGING_SERVICE_SID`, or `TWILIO_FROM_NUMBER` in E.164 format.
- Optional `TWILIO_STATUS_CALLBACK_URL`: the public HTTPS address of
  `/webhooks/twilio`. By default the backend uses its built-in
  `CONVEX_SITE_URL` followed by `/webhooks/twilio`.

The sender must be SMS-capable and approved for the destinations being used.
Configure the account's destination permissions, opt-out handling, and spending
alerts in Twilio. Trial-account restrictions still apply. Provider charges and
message segments apply; this implementation does not promise an unlimited SMS
allowance or introduce a customer billing allowance.

Then set the studio to Pro through the existing plan administration and enable
its SMS switch. The dashboard exposes provider availability as a boolean only.
Local Macedonian `070 123 456`, `38970123456`, and `0038970123456` formats are
normalized to `+38970123456`. Other destinations require explicit international
format. Invalid or missing phone numbers are skipped without failing a booking.

## Delivery behavior

- Booking mutations write to the existing notification queue. Only actions
  contact Twilio, using its [Messages API](https://www.twilio.com/docs/messaging/api/message-resource).
- Pro access, active beauty organization, settings, appointment state, and
  current client phone are checked when queueing and again before dispatch.
- Dedupe keys prevent duplicate confirmations and reminders. Rescheduling
  invalidates old reminders; completed, cancelled, expired, or changed
  appointments do not receive stale SMS reminders.
- A durable dispatch marker prevents concurrent workers and crash recovery
  from submitting an SMS twice. Explicit HTTP 429 rejections retry up to three
  total attempts, with one- and five-minute delays. Network timeouts and HTTP
  5xx outcomes are ambiguous and are not automatically retried. Check Twilio
  before any manual resend. Signed callbacks can reconcile such a submission.
- Provider acceptance is stored as `sent` / `accepted`. Only a signed delivery
  receipt marks the notification `delivered`; failures are recorded separately.
  Duplicate and out-of-order callbacks cannot downgrade a delivery receipt.
  Callbacks use [Twilio signature validation](https://www.twilio.com/docs/usage/security),
  bind to the sending account, tenant, notification, message SID, and recipient,
  and append audit entries.
- Disabling SMS, losing Pro, or removing provider configuration suppresses
  queued SMS. Enabling it reconciles upcoming reminders, without sending old
  confirmations retroactively. Existing email behavior remains independent.

## Rollout validation

Automated tests use mocked provider responses; they do not establish real
carrier delivery. Before announcing live availability, deploy the backend and
dashboard, configure a test Pro studio, and verify confirmation, reschedule,
cancellation, and a reminder on a phone whose owner agreed to the test. Confirm
the signed callback reaches `delivered`, and verify Free/disabled studios send
no SMS. Monitor failures, Unicode multipart usage, and costs before wider rollout.

The landing page lists SMS under Pro with an activation qualification.
