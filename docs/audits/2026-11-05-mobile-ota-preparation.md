# Mobile compatibility fixes and OTA preparation — November 5, 2026

The six findings in the [November 4 audit](2026-11-04-mobile-backend-compatibility.md) are addressed in the prepared source. Publication, live backend deployment and App Store developer release remain separate steps.

## Included behavior

- The current-source completed-to-no-show correction and accurate trial/package labels are included in the OTA candidate, unlike the October 7 embedded store bundle.
- Expired trials show guidance before the new-appointment form mounts, including direct links. A live expiry unmounts an open form and its slot subscription. Existing appointments and legacy Free studios remain usable; restored paid access opens a fresh form.
- Owner/staff guidance respects existing iOS billing-link restrictions. Managers and staff are directed to their studio owner.
- Service categories distinguish same-name offerings in booking choices, the confirmation summary, management/team lists, saved appointments and client history. Category data is additive, tenant-indexed and excludes deleted/foreign categories. Stored service names and IDs are unchanged.
- Service editing preserves `isActive` and `isOpusVisible` independently, with separate controls.
- The backend slot generator uses the same calendar-day grid as the booking mutation. Off-grid weekly/override hours and summer timezone cases now produce bookable slots.

## Isolated release source

Branch: `codex/mobile-backend-ota-20261105`.

Checkout: `/Users/borkopetrevski/.codex/worktrees/mobile-backend-ota-20261105/opus`.

The checkout starts at `8c56d0b`. It includes the audited mobile fixes and their necessary backend changes. Only the two-line slot-anchor correction was selected from the pre-existing uncommitted booking work; unrelated security, rescheduling, notification and web form changes remain in the original workspace.

## Verification

- Full isolated dashboard/backend suite: **1,121 passed**, 3 existing skips.
- Mobile suite: **40 passed**, including appointment-state and candidate-integrity regressions.
- Rendered mobile screens: **20 browser interaction tests passed**. They exercise the real React screens/hooks/handlers with native primitives and Convex transport substituted; they are not physical-device rendering or delivery tests.
- Dashboard, Convex and mobile TypeScript checks passed; dashboard/mobile lint passed.
- The three slot-alignment regressions fail on unchanged `8c56d0b` and pass with only the selected anchor correction.
- Production iOS native compatibility passes against recorded runtime **1.0.3**, build **8**, EAS build `dc2999de-84f7-429c-9fe0-a3d5737dce74`.

Expo Doctor reports **20/21 checks passing**. Its remaining check recommends nine newer SDK 57 patch versions. No native package, lockfile, app configuration or runtime baseline was changed, because those updates would invalidate compatibility with the approved binary. This is a recorded dependency-version recommendation, not a claim that `release:check` exited successfully.

## Prepared artifact workflow

Run from the isolated checkout's `opus-mobile/`:

```bash
node scripts/ota-candidate.cjs prepare --candidate /Users/borkopetrevski/Developer/opus-ota-candidates/2026-11-05-ios-1.0.3
node scripts/ota-candidate.cjs verify --candidate /Users/borkopetrevski/Developer/opus-ota-candidates/2026-11-05-ios-1.0.3
```

The exporter loads the production EAS environment, clears inherited public/local overrides, verifies the native baseline and production endpoints, exports an iOS Hermes bundle with Sentry source maps, and records SHA-256 hashes for every exported/source file. Private upload credentials are removed during bundling and scanned out of the result. It never uploads an OTA or source maps during preparation.

`receipt.json` is authoritative for the prepared source revision, bundle, map/debug identifier and integrity hashes. Later publication requires its exact SHA-256 and rechecks environment/configuration/native compatibility. The publisher uses the preserved bytes with `--skip-bundler`; it does not silently rebuild a different candidate.

## Release order and remaining operational checks

1. Deploy this checkout's compatible Convex changes to `calm-dachshund-294` before advancing mobile rollout. No schema change or data migration is required. Existing builds remain compatible. An OTA cannot deploy these backend changes.
2. Validate the candidate on a matching iOS preview/TestFlight device: legacy Free, trial, expired trial, purchased small team, same-name service categories, internal-only service edits, off-grid hours and completed-to-no-show correction.
3. Recheck sign-in/session restoration, offline launch, production push delivery/taps and source-map upload with the exact release artifact. These are not established by local unit/browser tests.
4. Publish the preserved production iOS candidate only when authorized. The prepared publisher defaults to a 10% rollout; verify adoption/errors and then advance it deliberately.
5. Perform the manual App Store release only after the release checks pass.

The existing native update policy applies downloads on a later cold launch. First launch can still run the embedded October 7 bundle. Keep backend compatibility and test two cold launches; this preparation does not change the native launch policy or require a replacement binary.
