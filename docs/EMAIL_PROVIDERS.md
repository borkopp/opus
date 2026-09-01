# OPUS transactional email providers

OPUS supports ordered Resend and Sender delivery from Convex. Provider calls remain inside Actions. Resend is the safe default until the Sender account, sending domains, API token, SMTP credentials, and production routing variables are all configured.

The verified sending identities are provider-specific:

| Message route | Resend From | Sender From |
| --- | --- | --- |
| Account and public-booking OTP | `login@auth.opus.mk` | `login@opus.mk` |
| Booking confirmations, changes, staff mail, and reminders | `bookings@bookings.opus.mk` | `bookings@bookings.opus.mk` |

`auth.opus.mk` and `bookings.opus.mk` do not need Vercel projects, Next.js routes, tenant records, or website `A`/`CNAME` records. Sender uses the already verified root `opus.mk` identity only for OTP fallback; the existing website and inbound Cloudflare routing remain unchanged.

## 1. Create and authenticate the domains

In Resend, verify `auth.opus.mk` and `bookings.opus.mk` under **Domains**. An existing verified `opus.mk` entry may remain, but OPUS does not use it for Resend OTP delivery.

In Sender, verify `opus.mk` and `bookings.opus.mk` under **Account settings → Domains**. Make sure SPF, DKIM, and DMARC all show as verified. Sender does not need `auth.opus.mk` because its OTP fallback address uses the root domain.

At the authoritative DNS provider for `opus.mk`, add the exact records shown by each provider. Observe these rules:

1. Keep every DKIM selector supplied by both providers; different selector hostnames can coexist.
2. Never publish two TXT records beginning with `v=spf1` at the same hostname. If both providers request SPF at the same hostname, merge their `include:` mechanisms into one record with one final `~all` or `-all` policy.
3. Keep the existing `_dmarc.opus.mk` policy unless a deliberate deliverability change is being made. Add a subdomain-specific DMARC record only if the provider requires it and no record already exists at that exact hostname.
4. If DNS authority later moves from Cloudflare to Vercel nameservers, recreate all mail-verification records before the nameserver cutover.
5. Wait until each provider dashboard shows every identity it uses as authenticated before changing OPUS From addresses.

Do not copy example SPF or DKIM values from this repository. Provider-generated values are account-specific.

## 2. Create Sender credentials

In Sender:

1. Open **Account settings → API access tokens** and create a token for transactional sending. Store it as `SENDER_API_TOKEN`.
2. Open **Transactional emails → Setup instructions → SMTP**, create an SMTP user, and save its username and password.
3. Use `smtp.sender.net`, port `587`, with TLS. OPUS uses REST for messages without attachments and SMTP for generated `.ics` calendar attachments.
4. Send provider-dashboard tests from `login@opus.mk` and `bookings@bookings.opus.mk` before enabling Sender routing.

Use a token lifetime and rotation policy appropriate for production. Never commit these values or place them in Vercel browser variables.

## 3. Deploy before enabling routing

Deploy the dashboard and matching Convex functions while the provider lists still default to Resend. This installs the provider router, queue lease, attempt audit fields, Sender SMTP Action, and Resend webhook endpoint without moving live traffic.

The Resend webhook endpoint is:

```text
https://<production-convex-site-host>/webhooks/resend
```

Use the production `*.convex.site` URL supplied by the production Convex deployment, not `studio.opus.mk`. In Resend, subscribe that endpoint to:

- `email.delivered`;
- `email.delivery_delayed`;
- `email.bounced`;
- `email.failed`;
- `email.suppressed`;
- `email.complained`.

Copy the generated `whsec_...` signing secret into `RESEND_WEBHOOK_SECRET`. OPUS verifies the signature and timestamp before accepting an event.

## 4. Set production Convex variables

Run these commands from `opus-dashboard/`. Secret commands intentionally omit their values so the Convex CLI prompts without placing secrets in shell history.

```bash
npx convex env set --prod SENDER_API_TOKEN
npx convex env set --prod SENDER_SMTP_USER
npx convex env set --prod SENDER_SMTP_PASSWORD
npx convex env set --prod RESEND_WEBHOOK_SECRET
```

Set the non-secret transport and sender configuration:

```bash
npx convex env set --prod AUTH_EMAIL_MODE providers
npx convex env set --prod SENDER_SMTP_HOST smtp.sender.net
npx convex env set --prod SENDER_SMTP_PORT 587
npx convex env set --prod AUTH_EMAIL_FROM 'OPUS <login@auth.opus.mk>'
npx convex env set --prod BOOKING_EMAIL_FROM 'OPUS <bookings@bookings.opus.mk>'
npx convex env set --prod SENDER_AUTH_EMAIL_FROM 'OPUS <login@opus.mk>'
```

`AUTH_EMAIL_FROM` and `BOOKING_EMAIL_FROM` are the Resend/default route identities. `SENDER_AUTH_EMAIL_FROM` overrides only Sender attempts on the OTP route. `SENDER_BOOKING_EMAIL_FROM` is available when Sender ever needs a different booking identity; leave it unset while both providers use `bookings@bookings.opus.mk`.

Enable routing last:

```bash
npx convex env set --prod AUTH_EMAIL_PROVIDERS resend,sender
npx convex env set --prod BOOKING_EMAIL_PROVIDERS sender,resend
npx convex env set --prod REMINDER_EMAIL_PROVIDERS sender
```

This policy keeps Resend primary for short-lived OTPs, makes Sender primary with Resend fallback for important booking changes, and keeps non-critical reminders on Sender so a reminder spike cannot consume the Resend OTP reserve. To give reminders a Resend fallback too, set `REMINDER_EMAIL_PROVIDERS` to `sender,resend`.

Apply the same variables without `--prod` only when real local provider delivery is needed. `AUTH_EMAIL_MODE=console` remains the isolated local-only alternative.

## 5. Verify the complete path

1. Request an account sign-in code with Resend first and confirm it arrives from `login@auth.opus.mk` before its five-minute expiry.
2. On a non-production deployment, temporarily set `AUTH_EMAIL_PROVIDERS=sender,resend`, request another code, and confirm it arrives from `login@opus.mk`. Restore `resend,sender` immediately after the test.
3. Complete a guest booking and repeat the primary and fallback checks for its ten-minute verification code.
4. Finish the booking and confirm the customer receives the `.ics` attachment from `bookings@bookings.opus.mk`.
5. Confirm the selected staff recipient receives the new-booking email.
6. In Convex, inspect the notification row: `deliveryProvider`, `deliveryStatus`, `externalMessageId`, and `providerAttempts` should identify the accepted provider and any fallback.
7. For Resend-delivered queue messages, confirm the signed webhook advances `deliveryStatus` from `accepted` to `delivered` or records a bounce/failure.
8. Check Gmail, Outlook, and iCloud inbox and spam placement before relying on Sender for OTP fallback.

Sender currently exposes bounce monitoring through its own dashboard/webhook model without OPUS tenant correlation tags. OPUS therefore records Sender acceptance and every fallback attempt, while final Sender delivery/bounce inspection remains in Sender until a stable correlated transactional event payload is available and verified.

## Rollback

Routing is configuration-only. To return all traffic to the existing Resend path without removing Sender credentials or DNS records:

```bash
npx convex env set --prod AUTH_EMAIL_PROVIDERS resend
npx convex env set --prod BOOKING_EMAIL_PROVIDERS resend
npx convex env set --prod REMINDER_EMAIL_PROVIDERS resend
```
