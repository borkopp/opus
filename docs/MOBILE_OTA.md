# Mobile over-the-air updates

`opus-mobile/` uses Expo SDK 57 `expo-updates` and the existing
`@borkopp/opus-mobile` EAS project
`634b3403-0012-42f0-9cc1-a5725f12f2cc`. The update endpoint is
`https://u.expo.dev/634b3403-0012-42f0-9cc1-a5725f12f2cc`.

The app starts immediately from its embedded or most recently downloaded bundle.
It checks for compatible updates on a cold launch, downloads in the background,
and applies the download on a later cold launch. There is no automatic JavaScript
reload during an appointment edit. Offline launch keeps the available bundle;
Expo's built-in recovery and embedded-bundle fallback remain enabled.

## Channels and environments

| Build profile | Channel | EAS environment | Backend |
| --- | --- | --- | --- |
| `iphone-test` | `development` | `development` | Existing Mac LAN test endpoints |
| `preview` / `simulator` | `preview` | `preview` | Verified HTTPS release endpoints |
| `production` | `production` | `production` | Verified HTTPS production endpoints |

Production and preview resolve the existing studio sign-in proxy at
`https://studio.opus.mk` and Convex at
`https://calm-dachshund-294.convex.cloud`. Their EAS environments must not contain
`EXPO_PUBLIC_NATIVE_DASHBOARD_URL`. PostHog configuration has been removed;
Sentry's public DSN and restricted private source-map credential are configured in
the production and preview environments. APNs/FCM credentials, backend
secrets and Expo access tokens never belong in public app environment variables.

The current source runtime is **1.0.3**, with native Sentry crash/performance
diagnostics and no PostHog or replay. Adding/removing native libraries requires a
fresh native binary. Finished production EAS build
`dc2999de-84f7-429c-9fe0-a3d5737dce74` (native build **8**) has been downloaded,
verified and recorded as the 1.0.3 production iOS baseline. Its native signature is
`dc76dac7cf451843ae06aad8f038f44e84afc6468f39fac64bcd29107b009066`.
The production iOS OTA compatibility check passes. No production OTA has been
published for this version. Simulator build
`98090136-39ab-4f05-aef5-8076b91ed5c7` is recorded as the preview iOS baseline;
its actual CFBundleVersion is 1, while the EAS metadata reports 7. The earlier
local 1.0.1 phone and superseded 1.0.2 builds do not qualify this runtime.
Sentry 8.29 fixes the backdated React Native 0.86 traces found in 1.0.2.
The 1.0.3 store source maps and native debug files are verified in Sentry; see
[MOBILE_MONITORING.md](MOBILE_MONITORING.md).
Store listing name **OPUS Beauty Studio** is separate from the
device display name **OPUS Studio**. EAS Submit is configured for App Store
Connect app `6819737970`; a binary upload reaches App Store Connect/TestFlight,
and the owner still controls final App Review submission.

## Native compatibility

Runtime version follows `expo.version` using the `appVersion` policy. EAS remote
build counters may increment without changing the runtime. Changing native
dependencies, the resolved production dependency graph, config plugins, dynamic
app config, native permissions, privacy declarations, icons or splash assets
requires an `expo.version` bump and a new native build before an OTA release.

`scripts/ota-native.cjs` hashes these source inputs, and
`scripts/ota-runtime-baselines.json` stores each prepared runtime and its completed
builds. It is deliberately conservative about dependency and branding changes.
JavaScript screens, translations and styles are outside this native hash.
Generated `ios/` and `android/` directories are not authoritative in this CNG
project and are excluded from the EAS archive. Native behavior must be expressed
in app config/plugins rather than edited in those generated directories.

The resolved Expo config embeds the public `extra.nativeRuntimeSignature`.
Recording a build checks the FINISHED EAS build's project, profile and app
version, then checks this signature in its downloaded artifact. For iOS it also
checks the actual `Expo.plist` runtime, update URL and channel. A prepared baseline
without a completed, matching artifact cannot publish. Same-version native
changes cannot replace an already recorded baseline.

During preparation of the first release, a pending baseline with **no recorded
artifacts** may be recalculated without changing the unreleased `1.0.0` version.
Cancel the obsolete build and rebuild from the recalculated source. An earlier
simulator snapshot can still validate its own UI, but its embedded native
signature does not qualify the replacement baseline or authorize an OTA update.

## Native privacy inventory

The current native manifest includes operational data retained by OPUS and its
service providers. App Store Connect's privacy labels have been revised to match
functional collection, including Sentry crash/performance diagnostics.
Every declared type is linked to an account or installation and is not used for
advertising tracking. App Functionality applies to all fourteen declared types:

| Types | Actual use |
| --- | --- |
| Name, Email Address, Phone Number | Staff authentication/invitations and appointment client details |
| User ID, Device ID | Account/tenant access, push installation tokens and Expo installation identity |
| Other User Content, Other Data Types | Service descriptions, staff bios, availability and saved preferences |
| Purchase History | Retained service/date/price history and favourite-service tendencies |
| Other Financial Info | Client spend totals and completed appointment monetary value; no card or bank details |
| Coarse Location | Turnstile country/IP security metadata and Sentry connection-derived coarse region; no device location permission |
| Crash Data | Native/JavaScript Sentry failures, release health and Expo OTA recovery |
| Performance Data, Other Diagnostic Data | Sampled Sentry startup/navigation, hangs, frames/stalls; backend timings and OTA failure/runtime metadata |
| Product Interaction | Retained operational activity such as audited appointment actions |

All declared purposes are App Functionality. Optional analytics, session replay
and their consent interfaces are removed from the mobile app.
There is no native photo picker/upload, address-book access, payment/card entry,
audio capture or retained client-search history in the current app. Monetary
appointment totals are disclosed under Apple's broad Other Financial Info
category; they do not establish that appointment payments were collected.

Privacy declarations change the native signature. They require a replacement
native build and matching artifact record; an OTA cannot update the installed
manifest. `scripts/privacy-manifest.test.cjs` protects the disclosed operational
types and requires App Functionality as the sole purpose for each type.

The update publisher validates private Sentry credentials before exporting. After
EAS publishes the exact `dist`, it uploads that bundle's Sentry source maps. If
upload fails, repair that same export before advancing the rollout. A published
update and uploaded source maps do not prove a phone has adopted the update.

Source definitions and provider behavior:
[Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/),
[Expo OTA crash disclosure](https://docs.expo.dev/distribution/app-stores/#app-privacy-questions),
[Convex retained logs](https://docs.convex.dev/dashboard/deployments/logs),
[Turnstile retained country/IP analytics](https://developers.cloudflare.com/turnstile/turnstile-analytics/).

## Make and record a new native build

Run from `opus-mobile/`, after lint/typecheck/tests and release environment checks:

```bash
npm run ota:prepare-build -- --profile production
npm run build:production:ios
```

Keep native inputs unchanged while the build runs. After it finishes, download
that exact build with EAS, inspect signing and extract the `.app`:

```bash
npx eas-cli@latest build:download --build-id <finished-build-id> --json
npm run ota:record-build -- --profile production --build-id <finished-build-id> --app-config-path <signed-app-path>/EXConstants.bundle/app.config
npm run ota:check -- --profile production --platform ios
```

Retain the baseline/build record alongside the corresponding release source.
The preview device flow uses `--profile preview`. Simulator builds do not qualify
as a completed production or preview **device** baseline. Android may be recorded separately with the Constants
`app.config` extracted from its finished artifact; `--platform all` is blocked
until both device platforms have matching recorded builds.

To test compatible JavaScript on an existing completed preview simulator build,
record a distinct simulator baseline. This never satisfies the production store
artifact check or proves physical-device behavior:

```bash
npm run ota:record-build -- --profile preview-simulator --build-id <finished-simulator-build-id> --app-config-path <simulator-app-path>/EXConstants.bundle/app.config
npm run ota:check -- --profile preview-simulator --platform ios
npm run ota:publish:preview-simulator -- --message "Validate calendar navigation"
```

The simulator record verifies the EAS `simulator` profile and simulator flag;
its update targets the `preview` channel and `preview` environment. Production
recording continues to require a completed signed store/device artifact. Test
the matching physical preview binary before using a preview update to justify a
production rollout. Preview OTA publication still affects all compatible iOS
builds on that channel, so use the same recorded native source baseline for any
physical preview builds rather than reusing an old app version with new native
dependencies.

### Earlier 1.0.0 artifact status on 6 October 2026

These artifacts predate the complete mobile analytics removal. They do not
qualify runtime 1.0.3. They are retained as historical release evidence.

The production receipt now records finished store build
`7a63e785-fb99-46e7-8adb-607acfdea436` (1.0.0, actual native build **5**).
Its downloaded signed artifact verifies the production OTA channel and runtime,
fourteen privacy types, Store provisioning, production APNs, and native signature
`1d653d54a1b5a99a21fd5d6bdbf1f3c52a45774bac4d8e99430506531e4a66ab`.
EAS Submit upload `76c680e8-7d8f-4030-95c5-f86bd302b6b7` targets App Store
Connect app `6819737970`; upload scheduling does not establish Apple processing,
review submission or public release. Final App Review submission remains manual.
The existing submission job and the earlier build-4 job now report **FINISHED**
in EAS; both completed before the subsequent no-upload instruction. Apple's
processing, final build selection and App Review submission are distinct states.

The later compact-consent/header revision is **local only**. It was packaged as
private iPhone test build **6**, using the existing matching native ad hoc binary
and a fresh embedded JavaScript bundle/manifest. No OTA publication or revised
App Store upload was performed. Store build 5 and the existing preview OTA do not
contain this later UI change. Automatic update checks are disabled only in that
private test package so the previous preview OTA cannot restore its older UI;
the source release configuration remains unchanged. See MOBILE_RELEASE.md for
the physical installation and verification boundary.

Earlier store build `e3d0359b-78ee-4519-8713-44f886f98616` (native build 4)
is **not the final review candidate**: device testing found that ordinary sign-in
selected the account-deletion screen as the initial protected route. The
JavaScript navigation fix was validated through preview update
`01a111e3-96a7-78a4-b4bc-d1844abcef6a`: native sign-out, email/CAPTCHA,
verification and sign-in now open Dashboard. Build 5 includes that fix. A native
compatibility receipt alone does not establish functional release readiness.

The `build:production:ios`, `build:preview:ios` and `build:simulator:ios`
wrappers fetch the matching EAS environment **before** running EAS Build. This
ordering is required because EAS initially resolves the profile's
`APP_ENV=production` app config before downloading the environment; a direct
build command without those public variables would correctly fail release
validation. The wrappers disable local dotenv and clear inherited public
development values before fetching the release environment. Add
`-- --non-interactive` once signing credentials are ready. Equivalent manual
commands are:

```bash
EXPO_NO_KEYCHAIN=1 EXPO_NO_DOTENV=1 npx eas-cli@latest env:exec production 'npx eas-cli@latest build --platform ios --profile production --no-wait'
EXPO_NO_KEYCHAIN=1 EXPO_NO_DOTENV=1 npx eas-cli@latest env:exec preview 'npx eas-cli@latest build --platform ios --profile preview --no-wait'
EXPO_NO_KEYCHAIN=1 EXPO_NO_DOTENV=1 npx eas-cli@latest env:exec preview 'npx eas-cli@latest build --platform ios --profile simulator --no-wait'
```

When invoking `env:exec` through a Node argv array, its command value begins with
the literal unquoted `npx` executable; individual metadata values are shell
quoted as needed. Current EAS CLI removes matching first/last quotes from the
command value, so quoting every token would incorrectly join the command into
one executable. The wrapper's argv regression covers all three release profiles
and literal messages containing quotes, shell syntax and newlines without
running a build.

## Publish an OTA update

Validate and test the changed JavaScript with a matching preview device build
first. The wrappers fetch the matching EAS environment, disable dotenv, validate
the release endpoints, check native
compatibility, and publish only to the selected channel. SDK 57 requires the
explicit EAS `--environment` flag, which the wrappers always provide.

```bash
npm run release:check
npm run ota:publish:preview -- --platform ios --message "Fix calendar selection"
npm run ota:publish:production -- --platform ios --message "Fix calendar selection"
```

Production defaults to a 10% rollout; preview defaults to a full deployment
(100%, with the rollout flag omitted). Current EAS accepts up to 99 through its
partial-rollout publishing API; omitting the flag is the supported default full
deployment. Increase a
verified update's rollout using its exact EAS update group ID:

```bash
npx eas-cli@latest update:edit <verified-update-group-id> --rollout-percentage 100 --non-interactive
```

Do not bypass the native guard with a direct `eas update` command. A native hash
failure means bump the app version and build again, rather than editing the
baseline to make it pass. OTA does not replace backend deployment, store review
for native changes, privacy disclosures or store-policy obligations.

## Verification and rollback

On an actual release/preview device, confirm its channel/runtime, reopen to
download, then cold-launch again to verify the expected update. Test offline
launch and the booking edit flow as well. Configuration/export alone does not
prove that a device received an OTA update.

For a bad rollout, use the exact group ID to stop it:

```bash
npx eas-cli@latest update:revert-update-rollout --group <bad-update-group-id> --message "Revert calendar regression" --non-interactive
```

If necessary, use `npx eas-cli@latest update:rollback` and select the intended
channel/runtime and previous working or embedded update. A rollback is a release
action and must be authorized; it is not performed during configuration checks.
Keep the previous known-good build/update identifiers in the release record.

Official references:
[EAS Update setup](https://docs.expo.dev/eas-update/getting-started/),
[SDK 57 Updates](https://docs.expo.dev/versions/v57.0.0/sdk/updates/),
[runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/),
[EAS environments](https://docs.expo.dev/eas/environment-variables/usage/),
[rollbacks](https://docs.expo.dev/eas-update/rollbacks/).

## Dependency validation on 6 October 2026

Expo Doctor passes all 21 checks after the supported SDK 57 patch updates, and
the cloud-matching npm 10 lockfile completes an isolated clean install. This is
not a zero-advisory dependency claim: `npm audit --omit=dev` reports 31 advisory
chains, predominantly through Expo/Metro build dependencies. The root reports
include `node-forge`, `braces`, the tooling `uuid`, and `decode-uri-component`
through Expo Router's `query-string`.

The reviewed [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
and [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently
have no published patched package. For the
[URI decoding advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), the
patched 0.5.0 package changed to ESM, while this supported Router graph consumes
the prior CommonJS function API. A blind override would break the consumer.
The existing `+native-intent.tsx` hook rejects oversized links and invalid UTF-8
escapes before Router's state/query parsing for both cold and warm native links;
its regression tests pass. This bounds the external native-link exposure and
does not remove the upstream advisory. Follow supported upstream fixes and
review this record before subsequent releases. Broad `npm audit fix --force`
downgrades or an unrelated SDK migration were not applied.
