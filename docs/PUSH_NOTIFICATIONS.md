# Personal studio push notifications

Authorized on October 5, 2026 for the existing OPUS Studio mobile dashboard and
studio web dashboard. This is staff push, including owners and managers. It does
not create native consumer accounts, marketing campaigns or a second backend.
Production providers have not been enabled, and no production deployment or store
submission was performed. A signed EAS internal iPhone build and remote delivery
were verified against the local backend on October 6, 2026, as recorded below.

## Using it

- **Mobile:** Settings → Notification preferences. Save your choices, then tap
  **Enable on this phone** in an installed OPUS Studio build.
- **Web:** account menu or notification bell → My preferences
  (`/notifications/preferences`). Studio Settings also links to My preferences.
  Save choices, then tap **Enable in this browser**.
- Every phone and browser needs its own explicit permission. Opening either app
  never prompts for permission. Existing permitted registrations refresh on app
  foreground/browser focus and native token changes.
- Preferences belong to the signed-in person **in this studio**. They sync across
  mobile and web without changing teammates' settings or client email/SMS choices.
- Switch mobile/browser push independently; choose new appointments,
  rescheduling, cancellations, reminders and no-shows. Eligible Pro members can
  also choose AI front-desk handoffs. Appointment scope can be your assignments
  or all appointments your role permits; personal-only staff are always limited
  to their assignments and cannot receive AI handoffs.
- Reminder choices: 15, 30, 60, 120 minutes or one day before the appointment.
  Sound, client previews and quiet hours apply to both push channels. Device and
  browser sound settings can override the choice. Quiet hours use the studio's
  timezone and **discard** alerts in that window; they are not replayed afterward.
- Previews hide client details by default. Turning them on can display the client
  name, service, studio and appointment time on the lock screen.
- Disconnect a device without signing out, or sign out to revoke that installation
  across the person's linked studios. Cleanup happens before session destruction;
  if the backend cannot confirm revocation, sign-out reports an error and can be
  retried. Revoked/expired sessions suppress further sends, even with a cached JWT.
  An authoritative check of an already-ended session allows local sign-out and
  recovery without requiring a mutation that can no longer be authenticated.

Notification taps carry only an opaque queue ID. The server rechecks the recipient,
active membership and current appointment/AI permissions before switching to the
correct studio and returning a destination. Web sign-in preserves the notification
destination; unauthorized, deleted or reassigned records cannot be opened.

## Native provider setup

Use the real existing OPUS Expo project and the correct deployment. Do not invent
project IDs, signing identities or store credentials. Native push requires a new
build after adding `expo-notifications`; Expo Go is not a remote-push test.

1. Set the existing project UUID as `EAS_PROJECT_ID` in the EAS environment.
2. For Android, configure the Firebase app with package `mk.opus.studio`. Provide
   its `google-services.json` as the **file** environment variable
   `GOOGLE_SERVICES_JSON`; `app.config.js` consumes the generated file path.
   Android EAS release validation refuses a missing file variable. Configure the
   separate **FCM v1 service-account key** through EAS credentials.
3. For iOS, configure the APNs push key, app identifier and provisioning through
   the OPUS Apple/EAS accounts. The Expo notifications config plugin configures
   native entitlements. Verify them in the signed archive.
4. Store an Expo access token **only on the corresponding Convex deployment**. Set
   `EXPO_PUSH_ACCESS_TOKEN`, then `EXPO_PUSH_ENABLED=true` after a controlled test.
   Cloud deployments require the access token; they send bearer-authenticated
   requests and never expose it to either client. Expo's enhanced push security
   is an **account-wide** setting on the access-token page. Before enabling it,
   configure valid bearer tokens for every app using that Expo account; unsigned
   requests are rejected afterward. A local OPUS test must not change that switch
   and interrupt push delivery for other apps on the same account.
5. Build/install a signed preview or development client using the release runbook,
   explicitly grant permission, and test foreground, background and cold-start
   delivery on actual iOS and Android phones.

Android uses a white transparent notification mark and separate normal/silent
channels. A new build is required for changes to native icons or plugin settings.
The user can mute channels in OS settings. APNs/FCM credentials and service-account
JSON must not be committed or put in `EXPO_PUBLIC_*` variables.

For a controlled local iPhone test, Expo also supports sending without an account
access token when enhanced security is already off. Set
`EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN=true` together with
`EXPO_PUSH_ENABLED=true` on the **local** Convex deployment. This explicit option
works only when Convex's system-provided `CONVEX_CLOUD_URL` is an HTTP loopback URL;
copying the flag to a cloud deployment does not enable it. Staff authentication,
device/session ownership and preference checks still apply. APNs credentials in
EAS are still required. Do not disable enhanced security for a test; if it is
already enabled, provide a real server access token instead. See
[Expo's additional push security](https://docs.expo.dev/push-notifications/sending-notifications/#additional-security).

Official references: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/),
[FCM v1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/),
[SDK 57 notification APIs](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## Browser provider setup

Browser push needs a secure HTTPS studio origin (loopback is valid for local browser
testing), a supported browser and a durable VAPID key pair. Generate one pair in a
trusted environment using `web-push`'s `generateVAPIDKeys()`; keep the private key
in Convex secrets and preserve it across releases. Never print it in logs or paste
it into documentation. Convex variables:

```dotenv
WEB_PUSH_ENABLED=false
WEB_PUSH_VAPID_PUBLIC_KEY=<public VAPID key>
WEB_PUSH_VAPID_PRIVATE_KEY=<private VAPID key>
```

Enable `WEB_PUSH_ENABLED=true` only for the intended deployment after setup and a
controlled test. The public key is intentionally returned to authenticated staff;
private keys and subscription credentials never are. VAPID key rotation requires
explicit reconnection; the connect action replaces a subscription bound to an old
key. Subscriptions refresh only after permission has already been granted.

The studio-only web manifest and 192/512 icons support Home Screen installation.
On iPhone/iPad use iOS 16.4+ and add the studio dashboard to the Home Screen, then
open that app and enable notifications. See [WebKit's Home Screen push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
The push-only service worker does not cache authenticated pages or intercept
requests. Notification clicks navigate to the same studio origin, then resolve
server permissions. Tenant booking websites do not inherit studio install metadata.

## Backend and compatibility

New `staff_notification_preferences` and `staff_push_devices` tables use named
studio indexes. Registration derives identity, active studio and the Better Auth
session server-side. Devices are limited to 20 per person per studio, refreshed
without duplicate tokens in a studio, soft-revoked, and bound to a live sign-in
session. Session lookup uses the existing Better Auth identity component; tenant
records are always queried by their studio index. Expired provider tokens are
removed without invalidating a token rotated after a send. Account erasure clears
credentials/preferences and cancels pending pushes.

Existing `notifications` queue, scheduled actions and booking/AI hooks are reused.
No token, endpoint or client PII is copied into queue payload snapshots or public
preferences. Web endpoints are HTTPS, provider-allowlisted and structurally
validated before any server request. Every send rechecks the current person,
membership, scope, event choice, channel, quiet hours and appointment revision.
Reminders use the established studio wall-clock conversion; rescheduling creates
a replacement booking and invalidates old reminders. Connecting a device/changing
preferences reconciles existing appointments in the next 48 hours; the existing
hourly reconciliation handles later appointments. Failed provider calls use a
lease and at most three attempts with bounded backoff. Native receipt lookup is
bounded to four attempts.

All new notification fields are optional on existing queue rows. With provider
flags absent/false, booking/AI push hooks return without querying device data or
sending anything. Existing salons require no account migration to keep booking;
push is an additive opt-in. Deploy the compatible backend/dashboard together
before distributing the new native build, through an explicitly authorized release.

`sent` means the provider accepted a request. `pushReceiptStatus=accepted` means
Expo issued a ticket; `provider_accepted` means APNs/FCM or the browser service
accepted it; `unknown` means the bounded Expo receipt lookup could not establish
a result. **None proves the phone displayed it.** Push never sets `deliveredAt`.
Quiet/obsolete/revoked alerts are cancelled, temporary errors retry, expired tokens
are revoked, and terminal errors remain failed for diagnosis.

## Verification and release gates

Automated local tests mock all external transports. They cover
authentication/tenant isolation, endpoint rejection, own-appointment permissions,
live opt-outs/quiet hours/session expiry, reminders/rescheduling/cancellation,
device limits, provider retries and expired/rotated credentials. Account-erasure
tests verify push cleanup. Native lint/types, SDK compatibility, exports and web
responsive/locale checks are separate from provider delivery.

Validation on October 5, 2026: dashboard regression **623 passed, 2 skipped**,
including 19 push backend, 2 service-worker and 9 account-deletion tests; dashboard
production webpack build and backend TypeScript passed. Native lint/TypeScript,
8 release/link tests, Expo doctor 21/21 and iOS/Android/web exports passed. The
Android release APK compiled, installed and cold-launched on the local emulator
with development endpoints and local debug signing. Native push preferences were
checked in Expo Go with disposable data, including save, live preference updates,
quiet-hour validation and a route-free Back control. Web preferences were checked
at 320px in English, Macedonian and Albanian. The disposable studio/account was
archived and its auth sessions removed; temporary console email mode was restored.
No production data or provider configuration was changed.

Validation on October 6, 2026: the signed `iphone-test` EAS build **1.0.0 (1)**
was installed and launched on the connected iPhone 17 Pro. The operator confirmed
sign-in and connecting the phone; an indexed, studio-scoped backend read confirmed
the active Expo device registration and enabled preferences. A generic queue test
alert required one send attempt, received an Expo ticket and an APNs handoff
receipt (`provider_accepted`), and was visibly received according to the operator.
No appointment was created and no email/SMS was sent for this test. Expo's
account-wide enhanced-security setting was not changed, and no access token was
created. The test used only the explicitly enabled local loopback option above.
The 60 targeted push/auth tests, dashboard TypeScript/targeted lint and native
lint/TypeScript/8 release tests passed. See
[the build and signing evidence](MOBILE_RELEASE.md#verified-iphone-test--october-6-2026).
Android and browser remote delivery, full appointment/tap behavior and the device
lifecycle matrix remain unverified.

Before enabling production, publish the updated privacy disclosures in all three
web locales, update App Store privacy / Play Data Safety declarations for device
tokens and optional preview content, verify signing/project/FCM/APNs/VAPID setup,
and record actual device/browser delivery. Test two studios, own-only staff,
sign-out/relogin/account switching, permission denial/revocation, foreground,
background, cold launch and cancellation/rescheduling near a reminder. Respect
OS Focus/battery policies; alerts are best effort and the live calendar is the
appointment authority. Complete the broader [mobile release gates](MOBILE_RELEASE.md).

## UI decisions

| Before                                              | After                                                                  | Why                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| No personal push controls                           | Shared per-person/per-studio preferences in both apps                  | People choose their alerts without changing the team  |
| No device registration flow                         | Explicit enable/disconnect with permission and availability states     | Permission prompts happen only on a deliberate action |
| Route labels could appear in native back navigation | Named notification screen, explicit Back control and correct safe area | The destination remains clear on a phone              |
| No push lock-screen privacy choice                  | Generic previews by default, optional client details                   | Staff can choose how much information is visible      |
