# App Store review access

The operator explicitly authorized a dedicated email with a fixed sign-in code
on October 6, 2026. This exception applies only to `app-review@opus.mk` and the
fictional **OPUS Review Studio**. Normal OPUS accounts keep emailed, randomized
OTPs. The mobile bundle contains no review credential or sign-in shortcut.

## Operator status — October 6, 2026

The compatible backend and web dashboard are deployed to production. The
dedicated review account and private fictional studio have been provisioned
there. Its exact identity bindings, private server-side code and a 45-day expiry
are configured; the internal `appReview:signInAvailable` check returned `true`.
The code is not recorded in this document or shipped in the mobile bundle.

Review-account sign-in succeeded on a signed native build using the production
backend: the normal CAPTCHA verified, the app requested an OTP through the real
signed proxy, and the private server-side review code created a normal session.
The initial sign-in exposed a navigation-order issue that opened account deletion
instead of the studio. The corrected OTA update was verified on the native Pro
Max simulator: sign-out, normal CAPTCHA, review-code sign-in and Dashboard as the
first screen all succeeded. Both usage analytics and replay choices remained off
after logout and subsequent sign-in.

The updated signed simulator app also passed production appointment creation and
cancellation in the fictional review studio, calendar/client navigation and
service/staff editor inspection. An iPad sign-in opened Dashboard and its native
sheet layouts were checked. PostHog received the consented fictional native
recordings; visible text and typed name/email inputs were redacted, and Pause
stopped replay before the next navigation. These are simulator checks against
production, distinct from physical-device push and final store-binary checks.
Successful sign-in does not establish App Store acceptance.

The subsequent October 6 instruction removes mobile PostHog, replay and their
consent UI from version 1.0.1. The recording checks above describe only the earlier
1.0.0 integration. Recheck the fresh native 1.0.1 app before selecting its build;
the existing store candidate and local iPhone build have not been replaced.

## Security boundary

- The fixed six-digit code lives only in the Convex `APP_REVIEW_OTP` environment
  variable and the private App Store Connect review instructions. Never commit it,
  put it in an `EXPO_PUBLIC_*` variable, analytics, a screenshot or a build artifact.
- Better Auth still issues a challenge, stores its hash, expires it after five
  minutes, limits attempts, consumes it on success and creates a normal signed
  session. Request signing, the trusted IP limiter and CAPTCHA remain in force.
- Both requesting and using a review code require an enabled, unexpired
  configuration plus the exact pre-provisioned Better Auth user, application user
  and demo studio. A different identity cannot claim the email through legacy
  account linking. Missing, disabled, expired or mismatched settings fail closed.
- Every authenticated studio read/write revalidates the bound demo membership.
  Studio switching, onboarding another studio, accepting invitations and global
  consumer accounts are blocked. Ordinary users cannot invite the reserved email
  or enter the review studio. Accidental additional memberships grant no access.
- The review studio supports the actual calendar, appointment lifecycle, services,
  client records and unlinked staff profiles. It is always private; public website
  publication and public bookings, subscription payments, provider-backed AI,
  price-list photo extraction, staff invitation emails and external client/team
  email/SMS/WhatsApp delivery are blocked on the server. Personal push on the
  reviewer's opted-in device remains available.
- Isolation is independent of `APP_REVIEW_ENABLED`. Keep the three identity
  bindings permanently while the fixture exists. The reserved demo slug is also
  excluded from public reads and external message delivery.

## Provision once, on the intended backend

Provisioning is an **internal operator mutation**, not an endpoint accessible from
the mobile app or an authenticated studio owner. It creates new records only and
refuses an existing Better Auth/application/consumer email or demo slug, including
deleted records. It never attaches review access to a production salon.

1. Validate and release the backend changes through the usual reviewed deployment
   process. Set `APP_REVIEW_ENABLED=false` and
   `APP_REVIEW_EMAIL=app-review@opus.mk` on the explicitly selected backend. Leave
   the binding variables unset. Do not set `AUTH_TEST_OTP`, console email delivery
   or a CAPTCHA bypass on a cloud deployment.
2. As the authorized backend operator, run the internal mutation once:

   ```sh
   npx convex run appReview:provision '{}' --deployment <explicit-deployment-name>
   ```

   For local verification use `--deployment local`. Inspect the deployment before
   invoking this mutation; the function writes fictional demo data. The result
   contains `orgId`, `userId` and `authUserId`, and no sign-in code.
3. Save those exact returned IDs as `APP_REVIEW_ORG_ID`, `APP_REVIEW_USER_ID` and
   `APP_REVIEW_AUTH_USER_ID`. Generate an unpredictable six-digit code privately
   and set it as `APP_REVIEW_OTP`. Set `APP_REVIEW_EXPIRES_AT` to a future Unix
   timestamp in **milliseconds** covering the planned review. The default setup
   stays disabled until all bindings, the expiry and code are configured.
4. Set `APP_REVIEW_ENABLED=true`. Run the internal, read-only check:

   ```sh
   npx convex run appReview:signInAvailable '{}' --deployment <explicit-deployment-name>
   ```

   It must return `true`. It checks the exact Better Auth identity, verified review
   email, private beauty studio, active owner membership and application linkage.
5. On a signed release build using that backend, request a code for the review
   email, enter the private fixed code and verify appointment creation/cancellation,
   service management and sign-out/restored sessions. Confirm ordinary accounts
   still receive their own normal OTP emails. Local automated tests alone do not
   establish cloud authentication or App Store release readiness.

The provisioned studio is Pro for exercising its existing studio features, has no
subscription/customer billing record, uses MKD and Europe/Skopje, and contains
fictional appointments, one demo service and one fictional client with no email or
phone. The fixed account signs into this studio through the normal login screen.
If provisioning reports an existing fixture, inspect and recover its actual IDs;
do not point bindings at an unrelated studio or delete/recreate customer data.

## App Store Connect instructions

In **App Review Information**, mark sign-in required and provide the review email.
Enter the private code in the credential field and explain in review notes:

> Enter the supplied review email, tap Send sign-in code to request a code, then
> enter the supplied six-digit code. This dedicated review account does not send
> email. It opens OPUS Review Studio with fictional appointments and clients.
> You can create, edit and cancel appointments, manage services and staff, and
> configure personal notification preferences. Public booking publication,
> billing and external customer messages are disabled in this demo studio.

Add an operator contact Apple can reach. Do not claim provider-backed features
are available to the review account. Verify that the configured expiry covers
Apple's review and any follow-up. The human operator retains the final **Submit
for Review** action.

## Disable and rotate

After review, set `APP_REVIEW_ENABLED=false`. New sign-in and protected demo
access stop even for an existing session. Keep the bound IDs for isolation and
audit. Rotate the code and expiry before a later review, then retest the signed
build; a previously used code still needs a newly requested five-minute challenge.
Do not replace the fixed credential with a global test OTP.

For subsequent reviews, verify the deployment, bindings, expiry and signed native
sign-in again; the dated operator status above describes only the current setup.
