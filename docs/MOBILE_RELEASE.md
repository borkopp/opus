# OPUS Studio mobile release

OPUS Studio is the native beauty-studio dashboard in `opus-mobile/`. Current local
source is version **1.0.3**, with Sentry crash/performance diagnostics and no
PostHog, replay or analytics consent UI. Finished production EAS build
`dc2999de-84f7-429c-9fe0-a3d5737dce74`, native build **8**, has verified signing,
source-map/native-symbol upload and a recorded production iOS OTA baseline.
The earlier 1.0.0/1.0.1/1.0.2 evidence below is historical and does not qualify this
replacement release. Current native/UI/provider and App Store states are tracked
separately below. The app
uses the existing Convex deployment, signed email-OTP proxy and staff permission
boundary. On October 6, 2026 the compatible backend was released to
`calm-dachshund-294` after a production export, additive-schema dry run and
634 passing dashboard tests (two skipped). The dashboard and updated legal site
were promoted to their production Vercel domains and verified live. A separate
fictional review studio was provisioned; no real studio data was converted into
a review fixture. The human retains Submit for Review. Native release builds,
OTA delivery and production push proof are tracked separately below.
The earlier local-backend iPhone test is retained as historical test evidence.

## Current release receipt — October 7, 2026

- App Store Connect has processed **1.0.3 (8)**. Version 1.0.3 is **Ready for
  Review**, with a draft submission containing that build. Apple's draft
  validation passed. **Submit for Review was not clicked** and manual public
  release remains selected.
- Listing copy, support/marketing links, review notes and dedicated fictional
  review login are saved. The published privacy labels declare fourteen linked
  functional types, no advertising tracking and no replay. Three actual native
  iPhone screenshots (1206 × 2622) and three iPad screenshots (2064 × 2752) from
  the 1.0.3 simulator release replaced the previous draft associations. The older
  assets remain recoverable in Apple's Asset Library.
- Store signing verification passed, APNs entitlement is production and debugger
  access is disabled. Runtime/channel/native signature were checked in the
  downloaded artifact. Receipt: `artifacts/mobile-sentry/production-build-receipt.json`.
  No production OTA was published and no dashboard/backend code was deployed
  during this monitoring revision.
- Final simulator build `98090136-39ab-4f05-aef5-8076b91ed5c7` was installed on
  iPhone 17 Pro (iOS 26.5) and iPad Pro 13-inch M4 (iOS 26.0). Its actual native
  build number is 1, despite EAS metadata reporting 7. The existing review session
  restored on both devices. Calendar/appointment headers were inspected. On iPad,
  native appointment creation, persisted confirmation, cancellation confirmation,
  persisted cancellation and outside-tap sheet dismissal passed using only
  fictional review data. The review studio's customer messaging/publication and
  billing restrictions remain in force.
- Sentry receives current-time startup/navigation traces with normal durations.
  One deliberately generated simulator SIGABRT was received and symbolicated to
  `AppDelegate.swift`; that controlled test issue was resolved. Final store build
  source maps and native dSYM were separately verified. See
  [MOBILE_MONITORING.md](MOBILE_MONITORING.md).
- TestFlight test instructions for build 8 are saved. Before submission, install
  **1.0.3 (8)** on a physical phone, check sign-in/session restoration, appointment
  editing, keyboard/scroll/swipe dismissal, push delivery and notification taps.
  Earlier physical-phone and local-backend push evidence does not prove this
  production binary's behavior. The Team (Expo) internal group contains build 8 and the operator
  Borko Petrevski as its sole tester. Apple shows the invitation as **Invited**.
  Accept it in TestFlight to install the build; email receipt and device
  installation are not established by Apple's invitation status.
- Review access expires **November 20, 2026 at 15:23:25 UTC**. Recheck/extend its
  restricted configuration before submitting after that date; never expose its
  code in Git, screenshots or logs.
- Review the published Terms and Privacy Policy, add the registered company and
  postal details once available, and monitor authenticated deletion requests and
  the support mailbox. Final App Review submission and, after approval, manual
  release remain operator actions.

The following dated sections preserve previous evidence and operational setup.
Where a previous release state differs, this current receipt takes precedence.

## App identity and assets

| Item                                     | Value                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| App Store listing                        | OPUS Beauty Studio                                                               |
| Display name                             | OPUS Studio                                                                        |
| iOS bundle / Android package             | `mk.opus.studio`                                                                   |
| Custom link scheme                       | `opus-studio://`                                                                   |
| App icon                                 | `opus-mobile/assets/icon.png`, 1024 × 1024, opaque                                 |
| Android adaptive foreground / monochrome | `adaptive-icon.png` / `monochrome-icon.png`, transparent with a centered safe area |
| Android notification mark                | `notification-icon.png`, 96 × 96, white on transparent                             |
| Launch mark                              | `splash-icon.png`, on the app's light canvas                                       |
| Google Play feature graphic              | `play-feature-graphic.png`, 1024 × 500, opaque                                     |

`npm run assets:generate` reproduces the artwork from the existing OPUS vector
and bundled Audiowide / DM Sans fonts. Native folders are generated by Expo;
configure them through `app.json` and plugins. Rebuild after changing native assets.
Both Clarity and Studio use light system bars. Verify native launch screens in
release builds; Expo Go shows its own launch experience.

## Legal and privacy

Published links are centralized in `src/lib/public-links.ts` and available before
sign-in, on studio-access/recovery screens, in Settings and in account deletion.
The October 7 policy revision is live at opus.mk. English, Macedonian and Albanian
source retains the complete existing clauses and adds functional Sentry
diagnostics, minimisation, provider transfers, account deletion and mobile-app
terms. Borko Petrevski, Prilep, North Macedonia is identified as operator while
company registration is pending. Terms acceptance is not blanket privacy consent.
The isolated landing deployment is `dpl_E3BNGc4WjssGDi4HorpvQHW9GRyh`; no dashboard
or backend source was included. The privacy link previously opened in the iOS
simulator's browser.

- Privacy policy: <https://opus.mk/privacy>
- Terms: <https://opus.mk/terms>
- Support: <https://opus.mk/contact>; `hello@opus.mk`
- Web deletion / privacy choices: <https://opus.mk/privacy#rights>
- In-app deletion: Settings → Delete account; also available without studio access.

The iOS manifest declares account names, emails, phone numbers, account and push
installation IDs, free-form studio content, audited product actions and security metadata as linked
data for app functionality, without advertising tracking. Required API reasons
are aggregated with the native dependency manifests. Android blocks unused
microphone, photo-library/storage and overlay permissions; SecureStore backup
rules exclude session credentials.

The native manifest retains 14 linked operational data types:
names, emails, phone numbers, other financial information, coarse location, other
user content, user IDs, device IDs, purchase history, product interaction, crash
data, performance data, other diagnostic data and other data. All use App
Functionality only; analytics purposes have been removed. None use advertising
tracking. App Store Connect's privacy labels have been revised to remove the old
analytics purposes. Appointment history and monetary
values, Turnstile country/IP security metadata, Sentry's connection-derived coarse
region, Expo OTA crash/failure metadata
and retained backend execution diagnostics are included in this inventory. Native code has
no PostHog, advertising SDK, active session recorder, consent prompt, analytics
settings or recording indicator. Sentry is functional crash/performance monitoring;
see [MOBILE_MONITORING.md](MOBILE_MONITORING.md). Theme/language are preferences;
native credentials use SecureStore. Opened web pages follow their published
website policies. Do not select “no data collected”.

References: [Apple app privacy](https://developer.apple.com/app-store/app-privacy-details/),
[Expo privacy manifests](https://docs.expo.dev/guides/apple-privacy/),
[Apple privacy-manifest data types](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype),
[Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/),
[Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).

## Account-deletion operations

Deletion is a manual, authenticated request with a displayed deadline of 30 days.
The user confirms in the app; no additional email or phone call is required.
Requests are durable and idempotent. An action notifies `hello@opus.mk` using the
existing transactional providers, retrying failed delivery. Filing a request does
not interrupt a studio's appointments or alter its billing.

Before releasing this workflow, assign someone to monitor requests daily and
verify the support and completion emails through the configured providers.
Provider delivery is not established by mocked tests. The operator query below
also finds requests whose support email could not be delivered.

1. Select and verify the intended Convex deployment. Run `accountDeletion:listPending`
   as a deployment operator; these functions are internal, never a public admin API.
2. Review all personal data associated with the account and any shared client
   identity, including its studio-owned customer records, notes, invitations,
   queued messages, support records and exclusive uploaded media. Erase/anonymize
   material that has no required retention; document the lawful reason and period
   for anything retained. Preserve unrelated clients and business records. Keep
   tenant work scoped to each verified studio and its named `orgId` indexes.
3. For a studio owner, arrange ownership transfer or studio closure and resolve
   subscriptions as part of processing. Reassign or cancel future appointments
   for the departing member through the existing audited booking mutations.
   Do this within the promised deadline; do not require the user to start a
   separate support request or leave a closed studio billing indefinitely.
4. After that review, call `accountDeletion:fulfil`. Include the support-case
   reference and retention decision without copying personal data into the audit.
5. Record the result in the original support case. If `confirmationDelivered` is
   false, follow up from that case; account erasure has already completed. Remove
   support/email-provider copies according to their documented retention schedule.

Operator command examples, after the deployment and case have been verified:

```bash
npx convex run accountDeletion:listPending '{}'
npx convex run accountDeletion:fulfil '{"userId":"<requested-user-id>","businessDataReviewed":true,"retentionReview":"Support case OPUS-123: personal data and media erased; required business retention documented."}'
```

The erasure transaction refuses an unrequested account, an orphaned active studio,
an unresolved last-owner subscription or outstanding future appointments. It
removes Better Auth users/sessions/credentials/OTPs, anonymizes platform and shared
client identity fields, cancels related staff invitations, and anonymizes/unlinks
the member. Application rows remain soft tombstones; opaque auth subjects deny
already-issued tokens. Business-data/media review must happen before references
are cleared. The operation does not perform global tenant-table scans.

## Local iPhone push test

The `iphone-test` EAS profile is an internal, bundled iOS app, using the
`development` EAS environment and `APP_ENV=development`. It does not require
Metro. On October 6, 2026 its public endpoints were configured as:

```dotenv
EXPO_PUBLIC_CONVEX_URL=http://192.168.0.200:3210
EXPO_PUBLIC_DASHBOARD_URL=http://192.168.0.200:3000
EXPO_PUBLIC_NATIVE_DASHBOARD_URL=http://192.168.0.200:3000
```

Keep the Mac and phone on the same network and the local dashboard/Convex
servers running. If the Mac's LAN address changes, update these EAS development
variables and rebuild. The development configuration explains the local-network
permission; release profiles continue to require HTTPS.

```bash
cd opus-mobile
EXPO_NO_KEYCHAIN=1 EXPO_NO_DOTENV=1 npx eas-cli@latest build --platform ios --profile iphone-test --no-wait
```

`EXPO_NO_KEYCHAIN=1` skips saving the Apple password when macOS Keychain rejects
that operation; complete password and verification-code prompts privately.
Select the actual registered iPhone for ad hoc provisioning. Use existing valid
distribution/APNs credentials where possible, without revoking keys used by
other apps. Inspect the signed app's push entitlement and permitted devices
before installation.

The repository-root `.easignore` allows only `opus-mobile/` and `shared/`, and
excludes local environments, generated native folders and private credentials.
Run `eas build:inspect --stage archive --platform ios --profile iphone-test` to
check the actual upload before changing the allowlist.

Set `EXPO_PUSH_ENABLED=true` only on the verified **local** Convex deployment
for this test. When Expo account enhanced security is already off, use
`EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN=true`; this is accepted only for
Convex's system HTTP loopback deployment URL. Otherwise provide
`EXPO_PUSH_ACCESS_TOKEN` privately. Keep access tokens out of public EAS
variables, logs and Git. After signing in on the phone, open Settings →
Notification preferences, enable mobile notifications, then connect the device
and grant iOS permission. Test a local appointment change with the app open,
in the background and after a cold start. Verify notification taps and provider
receipts separately; a build or an Expo ticket alone does not prove delivery.

### Verified iPhone test — October 6, 2026

The `iphone-test` build **1.0.0 (1)** completed successfully in EAS:
[build 3ec39482-39cf-4a84-aa0d-6e00e602208b](https://expo.dev/accounts/borkopp/projects/opus-mobile/builds/3ec39482-39cf-4a84-aa0d-6e00e602208b).
Its deep/strict code-signature verification passed. The ad hoc profile included
the connected iPhone 17 Pro, and the signed app contained the production APNs
entitlement. The app was installed and launched on that physical phone, running
iOS 27.0 beta. The operator confirmed successful sign-in and device connection;
the local backend independently confirmed an active Expo registration.

A generic alert was sent through the existing notification queue without creating
an appointment or sending email/SMS. Expo accepted it on the first attempt, the
receipt confirmed APNs handoff (`provider_accepted`), and the operator confirmed
that “New appointment · OPUS Studio” appeared on the iPhone. This establishes
remote iOS push delivery for this signed build and local configuration.

The reused distribution certificate/profile expires on **October 25, 2026 at
00:50 Europe/Berlin**; renew signing and rebuild before continuing beyond that
date. That earlier local test performed no production deployment, production data
change or store submission. Android/browser delivery and the complete appointment, notification
tap, foreground/background/cold-start, permission and account-switching matrix
remain release checks.

## Release configuration

Use Node 22.13+ and the SDK 57 dependency versions in the lockfile. Local iOS
compilation needs **Xcode 26.4+**; Android uses JDK 17 / SDK 36. See the
[SDK 57 system requirements](https://docs.expo.dev/versions/v57.0.0/).

EAS profiles are prepared in `eas.json`: `iphone-test` produces an internal iPhone
build connected to the local backend, `preview` produces an internal APK,
`simulator` an iOS simulator build, and `production` store builds with remote
version increments. Both preview and production profiles require HTTPS release
endpoints. The real Expo project `@borkopp/opus-mobile` is linked with UUID
`634b3403-0012-42f0-9cc1-a5725f12f2cc`. Apple signing uses the operator's existing
developer team; store submission remains a separate release step.

Set these plain/public variables in the corresponding EAS environments:

```dotenv
APP_ENV=production
EXPO_PUBLIC_CONVEX_URL=https://<actual-production-deployment>.convex.cloud
EXPO_PUBLIC_DASHBOARD_URL=https://studio.opus.mk
EAS_PROJECT_ID=<UUID of the registered OPUS Studio Expo project>
```

Remove `EXPO_PUBLIC_NATIVE_DASHBOARD_URL` for releases. `app.config.js` fails a
release with local, missing, credential-bearing or malformed endpoints. Confirm
the Convex URL is the intended **production** deployment; hostname validation
alone cannot distinguish a cloud development deployment. `.easignore` excludes
local environments, native build output and private signing material.

Deploy the compatible dashboard/Convex changes through the existing authorized
release procedure **before distributing a mobile build**: Expo Better Auth plugin,
mobile reads/management, staff invitation contracts, account-deletion functions and
push functions/schema. Configure providers before enabling push for a controlled
delivery check; verify delivery before treating it as operational. Android EAS builds also require `GOOGLE_SERVICES_JSON` as an
EAS file environment variable and an FCM v1 key; iOS needs the APNs push key.
Keep existing signed-IP/CAPTCHA/rate-limit protections and tenant isolation.
Normal production OTP requires actual email-provider delivery. The explicitly
authorized dedicated App Review account uses a server-secret fixed code confined
to an isolated fictional studio, with expiring access and no outbound messages.
See [APP_REVIEW_ACCESS.md](APP_REVIEW_ACCESS.md). Never expose a fixed code for
real accounts or bypass CAPTCHA/rate-limit protections.

After release authorization and project/signing setup, the prepared commands are:

```bash
cd opus-mobile
npm ci
npm run release:check
npx expo install --check
npm run export
# Fetch the production EAS environment before resolving release app config:
EXPO_NO_KEYCHAIN=1 npm run build:production:ios -- --no-wait --non-interactive
```

The October 6 production-preparation evidence below records the live backend/web
release, signed store/internal builds, preview OTA delivery and upload jobs.
Custom-scheme routing and personal native/browser push are implemented. The
earlier local iPhone delivery test is verified above; current production push,
Android/browser delivery and the full device lifecycle checks are separate gates.
Follow [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md). Universal links and native
billing have not been added. Final App Review submission and manual public release
remain human actions.

## Store listing draft

| Field                  | English                                                             | Macedonian                                                             |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Name                   | OPUS Beauty Studio                                                  | OPUS Beauty Studio                                                     |
| Subtitle               | Your beauty studio dashboard                                        | Твоето студио, со тебе                                                 |
| Play short description | Manage appointments, clients and your beauty studio team with OPUS. | Управувај со термините, клиентите и тимот на твоето студио преку OPUS. |
| Category               | Business                                                            | Business                                                               |

**English description:**

OPUS Studio helps small beauty studios in Macedonia organize their working day.
Sign in with your OPUS studio account to see live appointments, check availability
and manage your studio from your phone.

See your calendar by day, week or month. Create appointments from live studio
availability and complete appointments, cancel them or mark no-shows.
Manage services, team profiles and weekly working hours. With OPUS Pro, use client
history and invite team members to their own accounts. Staff see the appointments
their studio permissions allow.

An active OPUS studio membership is needed. Studio setup and advanced settings
are available through the web dashboard. The app supports English and Macedonian.

**Macedonian description:**

OPUS Studio им помага на малите студија за убавина во Македонија да го организираат
работниот ден. Најави се со твојата OPUS сметка за да ги прегледаш термините,
провериш слободни часови и управуваш со студиото од телефонот.

Прегледај го календарот по ден, недела или месец. Закажи термин според достапноста
на студиото и заврши термин, откажи го или означи непојавување.
Уреди ги услугите, профилите на тимот и неделното работно време. Со OPUS Pro,
користи историја на клиенти и покани ги вработените да имаат свои сметки.
Вработените ги гледаат термините дозволени со нивниот пристап.

Потребен е активен пристап до OPUS студио. Поставувањето на студиото и напредните
поставки се достапни преку веб контролната табла. Апликацијата поддржува македонски
и англиски јазик.

Before submission, capture real release-build screenshots for the required phone
and tablet sizes, complete age/content and privacy forms, and give reviewers a
working isolated demo membership and the dedicated reviewer code described in
[APP_REVIEW_ACCESS.md](APP_REVIEW_ACCESS.md). Production provisioning and actual
login must be verified before giving the code to Apple.

## Validation and remaining release gates

| Check                                                                 | Recorded result (October 5–7, 2026)                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native lint, TypeScript, release/OTA/navigation tests                  | Passed; 25 remaining tests after analytics removal; lint and TypeScript rerun October 7                                                                           |
| Expo doctor / compatible dependencies                                 | 21/21 passed; versions compatible                                                                                                                               |
| Dashboard regression                                                  | 634 passed, 2 skipped; includes review isolation, push, worker and account-erasure regressions                                                                  |
| Dashboard production build / backend TypeScript                       | Passed; isolated webpack build preserves the running local server                                                                                               |
| iOS / Android / web bundle export                                     | Passed                                                                                                                                                          |
| Android local release compilation                                     | Passed; APK installed and launched without startup errors; development endpoints and local debug signing                                                        |
| iOS native interaction, Expo Go 57                                    | OTP sign-in, restored session, studio views, client back paths, sheet close buttons, EN/MK themes and privacy link checked with disposable local data           |
| Push preference interaction                                           | Native save/live sync/quiet-hour validation and explicit Back checked in Expo Go; web EN/MK/SQ checked at 320px; providers unavailable and no permission prompt |
| iOS standalone release compilation                                    | Fresh version 1.0.1, local build 7, compiled with Xcode 26.6 and signed using the existing ad hoc profile; binary/signature checks passed October 7                |
| Physical devices, store signing, provider delivery and store review   | Version 1.0.1 installed on the paired iPhone; launch confirmation pending. Earlier local-backend sign-in/push confirmed October 6; current production push, Android/browser delivery, lifecycle checks and store review remain pending |

Android build/install and process health checks do not establish Android visual
QA. Verify both standalone builds on phones and iPad before submission, including
cold/warm launches, release splash, icon masks, keyboard/OTP autofill, session
restoration, offline/reconnect, staff-only permissions, back gestures, every modal,
large text, legal links and account-deletion delivery/processing.

### Dependency audit snapshot — October 6, 2026

Both `npm audit --json` and `npm audit --omit=dev --json` report 31 affected
package entries: 20 high, 11 moderate and zero critical. These entries propagate
four unique advisories through the dependency tree; Expo's production npm
dependencies include build tooling, so `--omit=dev` does not describe the shipped
native bundle by itself.

The existing iOS Hermes export/source map was inspected against the installed
SDK 57 dependency tree:

- The high [braces parser advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  arrives through Metro/micromatch. Neither parser is in the inspected iOS bundle.
- The high [node-forge signature advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
  arrives through Expo CLI and code-signing commands. `node-forge` is absent from
  the inspected bundle; iOS OTA signature verification uses Apple's Security
  framework. The bundled Metro module loader does not import these vulnerable
  dependencies.
- The moderate [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
  affects `decode-uri-component`, which is bundled through Router/query-string.
  The bundled native-link validator rejects malformed UTF-8 encodings and links
  over 4096 characters before Router handles cold or warm OS links. This is a
  mitigation, not an upstream dependency fix.
- The moderate [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
  arrives through the Node `xcode` project-writing tool. That npm package is
  absent from the inspected bundle; Expo's native UUID wrapper is a separate
  implementation.

No reachable high/critical iOS runtime issue was identified in this targeted
review. It does not establish a clean tooling/native security audit or inspect
the final App Store artifact. No Next.js server is installed in this mobile
dependency tree; server/web advisories require their own audit. Recheck upstream
patches and the final bundled code when dependencies change. Do not use
`npm audit fix --force`, which proposes incompatible SDK downgrades.

## Interface review

| Before                                                  | After                                                                     | Why                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Back labels could inherit `(tabs)`                      | Translated titles and an explicit 44-point back control on detail routes  | Predictable navigation from tabs and native sheets                |
| Sheet dismissal relied on the handle                    | Centered title and visible 44-point close button                          | Clear exit action for touch and accessibility                     |
| Legal access missing at sign-in/settings                | Shared legal footer and Help/legal card                                   | Policies and support remain reachable throughout the account flow |
| Network/font startup could hold the splash indefinitely | Bounded font loading, branded connection state and retry/support recovery | A failed connection has a useful visible state                    |
| Staff invitation required a later access step           | Optional sign-in email on the new staff form                              | Profile, hours and account setup fit one editor                   |

## October 6 earlier production preparation evidence — version 1.0.0

This section records earlier work before the instruction to remove mobile
PostHog. Store build 5, local iPhone build 6 and the existing preview OTA retain
that older integration; a freshly compiled 1.0.1 native binary is required.

- Convex `calm-dachshund-294`: additive schema/functions deployed after a private
  production export. No indexes removed. Compatible dashboard deployment
  `dpl_7ks7XStSErwjLeDTwhrCK3Mo67zm` and legal-site deployment
  `dpl_GsjwxBzkHBxM7JcW1cdgBqDNoxWj` are live on their intended domains.
- Production mobile push is enabled with the private Expo access token; browser
  push is enabled with a newly generated server-only VAPID key pair. Provider
  delivery from this release remains a separate physical-device check.
- Simulator build `3666a3a4-b05d-45db-b8dc-6c380d40a5c2` is finished and its
  artifact has the verified native signature, runtime 1.0.0, preview channel and
  14 privacy declarations. Its actual simulator CFBundleVersion is 1 despite
  EAS metadata reporting 2; this is not store-binary build-counter evidence.
- Preview iOS OTA group `3fc73da4-58ad-46e5-a990-3812a01bae5b`, update
  `01a111dd-5ecc-70d6-817d-e1de981c661d`, is published on preview/runtime 1.0.0.
  Native cache metadata confirms download/READY and successful launch on the
  medium iPhone and iPad simulators, with zero failed launches. No production
  OTA has been published.
- Store build 4 `e3d0359b-78ee-4519-8713-44f886f98616` finished and passed actual
  artifact, privacy, runtime/channel, App Store provisioning and strict-signature
  checks. It is native compatibility evidence, not the final candidate: native
  interaction found an initial-route ordering bug. EAS Submit job
  `a577bcac-cb28-405c-a372-ad117f54831b` uploads build 4 only to App Store Connect/
  TestFlight using the existing API key. This does not submit App Review.
- Store build 5 `7a63e785-fb99-46e7-8adb-607acfdea436` finished and its actual
  signed artifact passed strict code-signature and App Store provisioning checks.
  CFBundleVersion is 5; runtime is 1.0.0, channel is production, APNs uses the
  production entitlement, all 14 privacy declarations are included and no LAN
  permission is present. The artifact contains the corrected initial-route
  ordering. The production OTA baseline now records this final artifact. EAS
  Submit job `76c680e8-7d8f-4030-95c5-f86bd302b6b7` and the earlier build-4 job now
  report FINISHED in EAS. Both uploads completed before the subsequent local-only
  request. This does not verify Apple's processing or final build selection.
  Build 5 does not contain the subsequent compact-consent/header revision below.
- The route-fix preview OTA group `a4c4557e-c34c-48be-a3e0-3351c1ef4fc2`, update
  `01a111e3-96a7-78a4-b4bc-d1844abcef6a`, was downloaded and successfully launched
  on the large iPhone simulator with zero failures. Normal CAPTCHA, signed OTP
  proxy and reviewer sign-in then opened Dashboard first. Analytics/replay OFF
  preferences persisted across sign-out/sign-in. No production OTA is published.
- On the medium iPhone simulator, actual production login, dashboard, calendar,
  appointment/client navigation, service/team editor headers and sheet close
  controls were inspected. A fictional appointment was created and cancelled
  through the native UI in the isolated review studio. Three real 1206 × 2622
  screenshots were captured and uploaded to the App Store draft. The unsaved
  replay-mask form was cancelled without creating a client or appointment.
- Production-connected ad hoc preview build
  `eb15e371-2813-4eeb-aad2-25486f3a6bb2` finished, passed artifact/signature checks
  and was installed on the connected iPhone 17 Pro. Launch through the CLI was
  blocked because the phone was locked; the operator is completing sign-in and
  notification connection privately. This is not production delivery proof yet.
- PostHog EU received a native reviewer recording. Actual dashboard, appointment
  and client playback showed visible text/content redacted; event properties
  contained approved screen/device/session metadata without customer fields or
  raw routes. The separate unsaved form recording also redacted typed name/email
  values. Pause ended recording before the subsequent calendar navigation.
  Custom-photo and physical-device replay checks remain distinct from this
  simulator proof. These recordings belong to the retired integration.
- App Store app `6819737970` has name OPUS Beauty Studio, version 1.0.0, free
  pricing, support/legal links, private reviewer instructions and manual release.
  All 14 privacy answers are saved; Apple's publication declaration awaits the
  human's approval. Three real screenshots each for the required medium iPhone
  (1206 × 2622) and iPad 13-inch (2064 × 2752) are uploaded. Tablet production
  sign-in, necessary-only consent, dashboard/calendar layouts and centered native
  appointment sheet were checked. Final App Store validation lists only build
  selection and privacy publication as missing requirements; no submission was
  made. Final build selection remains pending.

These states are separate from physical production push/replay checks and the
human's final Submit for Review action. Native simulator replay masking and Pause
behavior are verified above.

## October 6 earlier local consent and header revision — version 1.0.0

The latest instruction is **no uploads** and a physical iPhone test. The revised
UI uses a short Accept all / Customize / Necessary only sheet and compact header
recording controls. It retains PostHog's official native replay implementation,
opt-in persistence, masking, excluded sensitive routes and immediate pause.
Mobile lint, TypeScript and all 43 tests pass, including three consent UI tests.

Local test build **6** was packaged with a freshly compiled Hermes bundle,
48 assets and a fresh embedded update manifest. It reuses the verified native
ad hoc binary from `eb15e371-2813-4eeb-aad2-25486f3a6bb2`, whose native signature
matches the unchanged native dependencies/configuration. It was re-signed with
the existing distribution identity and profile, passed strict/deep signature
verification, and was installed successfully on the paired iPhone 17 Pro. This
is a local JavaScript revision in an existing native shell, not a fresh native
compilation: local Xcode 26.0.1 is older than Expo SDK 57's required Xcode 26.4.

Only this private test package uses build counter 6 and disables automatic OTA
checks to keep an earlier preview update from restoring the old UI. The source
production OTA configuration and anti-bricking protections remain unchanged.
It uses the production backend. CLI launch was blocked by the phone lock; actual
on-phone opening and interaction remain pending the operator unlocking it.
Device inventory independently confirms installed version 1.0.0, build 6. The
new native visual check is also pending because computer use is blocked by the
Mac lock. A non-secret installation receipt is saved at
`artifacts/mobile-consent/local-build-receipt.json`. The task's temporary signing
keychain and private credential copies have been removed; existing Apple signing
credentials and the user's keychain search list are preserved.

No revised binary, source bundle, OTA update or store listing was uploaded or
published. App Store build 5 and the previously published preview update remain
the earlier UI; this local revision is not the submitted/store candidate.

## October 6 mobile analytics removal — version 1.0.1

The latest instruction removes PostHog and session replay entirely, including all
mobile analytics consent UI. Both SDK dependencies, the native push-capture
metadata, consent/provider/controller code, settings card, header controls and
analytics-only tests are removed. Release validation no longer requires analytics
environment variables. The operational privacy inventory is retained with App
Functionality purposes only. Policy source is updated without publishing it.

The app/runtime version is 1.0.1 to prevent earlier 1.0.0 updates from restoring
the retired integration. A new native build is required before any update can
be published for that runtime. Lint, TypeScript, all 25 remaining tests and all
21 Expo Doctor checks pass. Local production-mode iOS, Android and web exports
also pass. Generated native projects have been recreated from app configuration,
with the old generated folders preserved in a private temporary backup.
Both iOS and Android native linking configurations contain no PostHog module;
all six exported JavaScript/Hermes bundles contain no removed integration markers.
The generated iOS manifest retains 14 operational types with App Functionality
as their sole purpose. Runtime baseline 1.0.1 is prepared locally with native
signature `5b8813be21930560d3f7d9bacc40357d3fe8cc19a2007c8fb86ab2746c3ff195`,
and the OTA guard correctly refuses publication without a verified matching
native binary. Evidence is saved at `artifacts/mobile-no-analytics/validation.json`.

On October 7, Xcode 26.6 (17F113) and its iOS components enabled a fresh local
iOS Release compilation from the regenerated project. Version **1.0.1**, local
build **7**, was signed using the existing certificate and ad hoc profile and
installed on the paired physical iPhone 17 Pro running iOS 27 beta. Device
inventory confirms that exact version/build replaced 1.0.0 build 6. The binary
contains no PostHog markers, matches the current native source signature, embeds
the production backend/sign-in endpoints, and passes deep/strict signature
verification. Its privacy manifest retains fourteen App Functionality types,
and APNs retains the production entitlement. Runtime 1.0.1 prevents earlier
1.0.0 OTA bundles from loading.

Automatic launch was blocked by the phone's lock; unlocked-phone confirmation
is pending. The local build and installation receipt is
`artifacts/mobile-no-analytics/local-build-receipt.json`. Temporary private
certificate copies and the signing keychain were removed, and the original
keychain search list was restored. Nothing was uploaded, deployed, submitted
or published. This local phone build does not qualify the EAS OTA publication
baseline. Before the next store release, revise the existing App Store privacy
purposes and review notes and validate the new release on physical devices.
