# Mobile compatibility production release — November 5, 2026

The compatible Convex backend and iOS OTA are live. The OTA is available to 100% of matching production iOS runtime `1.0.3` installations. App Store Connect still holds **1.0.3 (8)** in **Pending Developer Release**; no App Store release, submission or metadata change was performed.

Physical acceptance on TestFlight **1.0.3 (8)** remains before the manual store release. Automated tests and delivery verification passed, but they do not establish device adoption, sign-in delivery, offline behavior or production push delivery.

## Released source and artifact

- Backend/source revision: `55eb66229b60ab933a70f7604426caf2df8e3cf5` on `codex/mobile-backend-ota-20261105`.
- Exported mobile source: `d0ca931e74ba3349ff7eace5bd7837f5f03009c6`; subsequent preparation documentation/test formatting did not change the exported mobile/shared source.
- Backend: `calm-dachshund-294` (`https://calm-dachshund-294.convex.cloud`).
- EAS project: `@borkopp/opus-mobile`; production channel/branch, production environment, iOS only, runtime `1.0.3`.
- Update group: `48b10dc0-3cc0-4436-829f-c919509ff542`.
- Update: `01a1abf7-69ed-76dc-9a2f-e261cf7fb546`, published at `2026-11-05T13:48:00.877Z`.
- Candidate receipt SHA-256: `0064814c74d0a4815ebe35496ad6807db766d73be8b195a4632d24efed8a5929`.
- Sentry debug ID: `744dfbe6-2398-403d-aa8b-2ad465e16440`.

The preserved export was published with `--skip-bundler`, initially at 10%, then advanced to 100% after artifact verification. No native dependency, runtime policy or installed launch policy changed. The preparation receipt and export remain unchanged; publication and verification records are separate.

## Existing studio compatibility

Production source was compared with the release baseline before deployment. There was no unrelated production drift to overwrite. The only semantic changes were categorized service presentation in mobile/client reads and the reviewed slot-grid alignment correction.

After deployment, all **229 prepared modules** were byte-identical to the downloaded production modules. The schema matched exactly, no indexes were deleted, and no data migration was required. All **377 declared API contracts** remained identical. Authentication, billing, subscription, staff-limit, publication and provider configuration were unchanged.

Read-only before/after checks confirmed:

- All **14 real studios** retain their legacy Free plan and unchanged trial metadata, also matching the November 2 baseline. The separate fictional App Review fixture accounts for the one paid organization in the operator inventory.
- All **10 published websites** remain booking-enabled, with unchanged public service/staff IDs and response fields.
- Seven existing review-fixture queries pass: sign-in availability, mobile bootstrap, management, overview, calendar, appointment detail and client profile. These operator query checks do not prove an actual OTP/session flow.
- Public homepage/booking and availability checks pass for two live studios; landing/login return HTTP 200. One slot expired under the existing 15-minute notice cutoff between checks; all remaining quotes matched exactly.

Verification did not create bookings, change services, alter real studio records, create sessions/OTPs or send provider messages. Unrelated security/booking edits in the primary worktree were excluded from this release.

## OTA and validation evidence

The downloaded Hermes bundle and all **49 distinct delivered assets** match the preserved export byte for byte and match the manifest hashes. Public Expo configuration also matches exactly. Normal production-channel requests for iOS `1.0.3` return this update; iOS `1.0.1` and Android `1.0.3` return no update. Channel mapping remains unchanged and active.

Sentry accepted the exact bundle/source maps and a bounded processing check confirmed all files are on the server with file processing complete. Initial EAS metrics show no real adoption evidence yet: zero reported users/downloads/failures. Synthetic manifest checks and delayed metrics cannot establish device launch health.

Prepared-source checks passed: **1,121 dashboard/backend tests**, **40 mobile tests**, **20 rendered mobile screen tests**, TypeScript, lint and dashboard production build. There are three existing skipped backend tests. Expo Doctor remains **20/21**, recommending nine SDK 57 patch updates; native inputs were retained to match the approved binary.

The [sanitized release receipt](2026-11-05-mobile-production-release.json) records the verified state. Detailed verification evidence is preserved at `/Users/borkopetrevski/Developer/opus-ota-candidates/2026-11-05-ios-1.0.3/production-verification/`. The original [preparation report](2026-11-05-mobile-ota-preparation.md) remains a historical pre-publication record.

## Remaining manual App Store acceptance

The paired phone currently contains **1.0.1 (7)**, and TestFlight is not installed. The user confirmed the phone is connected and was given Apple’s official TestFlight installation link. iPhone Mirroring could not connect to the configured phone. Install **TestFlight 1.0.3 (8)** and validate the following before pressing Release in App Store Connect:

1. Open while online, allow the OTA to download, fully terminate and reopen; a second cold launch may be needed. Confirm corrected category, trial/package and service visibility behavior.
2. Verify sign-in/session restoration, appointment creation/editing and completed-to-no-show correction using the fictional review studio. Verify independent active/public service controls and applicable trial/paid access cases without changing real studio data.
3. Verify offline restart, keyboard/navigation behavior, and production push delivery/taps on the opted-in test device.

The native update policy can launch the embedded October 7 bundle on a first installation before the OTA applies on a subsequent cold launch. An OTA does not replace the embedded binary. This release therefore establishes backend compatibility and update availability, while final physical-device acceptance remains explicit.
