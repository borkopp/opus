# Mobile crash and performance monitoring

Version **1.0.3** uses `@sentry/react-native` **8.29.0** with Expo SDK 57.
Expo's bundled recommendation (7.11) produced backdated traces on React Native
0.86. The official SDK fix shipped in 8.25; this pinned version includes it.
`expo.install.exclude` deliberately excludes only Sentry from the older bundled
version recommendation. iOS 15+ and Xcode 16.4+ requirements are already covered
by the Expo 57 build toolchain. The dedicated EU project is `borko-petrevski/opus-mobile` (project
4512212669628496). The existing `petbar` project is not modified.

## Enabled collection

- JavaScript errors and native crashes, automatic release/session health.
- App hangs lasting at least two seconds and watchdog termination detection.
- App startup, navigation/time to initial display, native slow/frozen frames and
  JavaScript event-loop stalls.
- Crash sampling is 100%; production performance sampling is 20%. Release preview
  builds sample performance at 100% for validation.
- Tags distinguish app/runtime version, embedded versus OTA bundle, update ID,
  channel and native compatibility signature.

Initialization runs only in bundled native Release builds with the configured
DSN. It is disabled in development, Expo Go and the web preview. Normal development
screens therefore do not prove ingestion. There is no session recorder, analytics
provider, consent sheet, recording indicator or new app control.

## Data minimisation

`src/lib/monitoring-privacy.ts` keeps technical stack frames, versions, timings and
approved route templates. Dynamic record IDs/query strings are removed from route
names. User identity, requests, headers, bodies, extra context, breadcrumbs,
console logs and free-form error messages are removed. Error messages become
`Unexpected application error`; stack frames remain useful for finding code.

Network request tracing, failed-request capture, trace propagation, touch/gesture
tracing, screenshots, view hierarchies, logging and replay are disabled. Native
Cocoa breadcrumb, network and file tracing are disabled as well. Native memory
introspection, raw MetricKit payloads, MetricKit and profiling are disabled. No OPUS user ID,
email or client record is passed to Sentry. The native event pipeline is distinct
from JavaScript callbacks, so the project also has server-side scrubbing enabled,
additional sensitive-field rules, IP-address storage prevention and a mask rule
for `$error.value`. JavaScript source fetching is off and TLS verification is on.
Native reports retain a random installation identifier and technical device
context. Sentry may infer a coarse region from the connection even with IP
storage prevention enabled; this was observed in the controlled crash and is
disclosed in the policy and functional Coarse Location privacy category.

The on-device event cache is bounded to 20 entries. Raw diagnostic retention follows
the active Sentry service plan; review it in project/organisation settings rather
than assuming a fixed number of days. Limited incident records retained outside
Sentry need a documented purpose and retention period. Signing out does not erase
reports already received. The public policy describes legitimate-interest
diagnostics, objection rights, EU project routing and limited international
provider processing; Terms acceptance is not blanket privacy consent.

## Build and OTA source maps

The Expo plugin uploads native symbols and JavaScript source maps during native
builds. Metro emits Sentry debug IDs. EAS `production` and `preview` environments
contain the public DSN, organisation/project names and a **Sensitive**
`SENTRY_AUTH_TOKEN`. The token named “OPUS mobile builds and OTA source maps” has
the fixed `org:ci` scope for build/release artifacts; it has no account-management
permission. Never put it in `EXPO_PUBLIC_*`, an app config, Git or diagnostic output.

Use the existing build wrappers so EAS environment values are loaded before
release configuration is evaluated:

```bash
cd opus-mobile
npm run build:production:ios -- --non-interactive
npm run build:simulator:ios -- --non-interactive
```

The OTA wrapper validates the private upload configuration before publication,
then runs `sentry-expo-upload-sourcemaps dist` for that exact exported update. A
map-upload failure after publication must be repaired using that same `dist`
before advancing a rollout. Read [MOBILE_OTA.md](MOBILE_OTA.md) for artifact/native
compatibility guards. Do not use a raw `eas update` command and omit map upload.

## Release evidence

Final production build `dc2999de-84f7-429c-9fe0-a3d5737dce74`, **1.0.3 (8)**,
finished and was uploaded to App Store Connect. Its JavaScript source-map archive
`2a531a6e-8834-5167-9606-df7543b37253` is visible in Sentry for release
`mk.opus.studio@1.0.3+8`, distribution 8. Its native executable UUID
`06049ee3-60e7-3d89-8e6a-cce4ed5d4227` exactly matches the uploaded OPUSStudio
arm64 debug companion with debug/symbol/unwind information. Strict/deep signing
verification and the recorded production OTA compatibility check passed.

The final simulator Release binary was tested on iPhone and iPad. Sentry's
Traces page shows current timestamps and normal startup/initial-display durations
after the SDK upgrade. A deliberately generated SIGABRT on the verified OPUS
simulator process produced event `466bbd75920b437494018361f8f63eb9`, issue
`OPUS-MOBILE-1` (151930955), with native frames symbolicated to `AppDelegate.swift`.
The message was provider-masked and no replay/attachments were present. The test
issue was resolved after inspection. Two empty TurboModule tag values were
discarded during processing; the crash and stack were retained. This is native
provider-delivery evidence from simulator release **1.0.3 (1)** in preview,
not physical-device crash or production-push evidence.

Historical store build `60d913d3-bed0-4322-9441-dc40e3e089aa`, version 1.0.2, native build 7,
finished on October 7, 2026. Its source-map upload succeeded and 15 native debug
files were uploaded, including the OPUS app's dSYM. Strict/deep signing verification
passed. Native Release testing later exposed the React Native 0.86 timestamp
bug (backdated traces and invalid initial-display durations). This build is
superseded by the 1.0.3 SDK upgrade and must not be submitted. The artifact matches the production update channel, runtime and
recorded native baseline. App Store upload, native ingestion and UI validation
are tracked in [MOBILE_RELEASE.md](MOBILE_RELEASE.md), without treating one as proof
of another.

Checks include three privacy-filter tests which assert that realistic personal
data, tokens, notes and future SDK metadata are dropped while technical source-map
frames and timing measurements survive. The native Release inspection above
establishes simulator ingestion and symbolication; mocked tests or source-map
upload alone would not establish either. Physical-phone release checks remain
listed in [MOBILE_RELEASE.md](MOBILE_RELEASE.md).

References: [Expo Sentry integration](https://docs.expo.dev/guides/using-sentry/),
[Sentry advanced scrubbing](https://docs.sentry.io/product/data-management-settings/scrubbing/advanced-datascrubbing/),
[Sentry processing and transfer safeguards](https://sentry.io/trust/).

The clock fix is documented in [Sentry PR 6654](https://github.com/getsentry/sentry-react-native/pull/6654),
[Sentry 8.25 notes](https://github.com/getsentry/sentry-react-native/releases/tag/8.25.0)
and the [7-to-8 migration guide](https://docs.sentry.io/platforms/react-native/migration/v7-to-v8/).
