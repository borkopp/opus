# Mobile/backend compatibility audit — November 4, 2026

**Recommendation: hold the public release until the mobile corrections below are shipped and tested against the released backend.** The mobile API remains compatible, but the documented App Store candidate does not contain several changes already committed after its build date. Some additional mobile behavior still needs correction.

This was a read-only implementation/release audit. No application code, production data, environment variables, OTA channels, App Store submissions or release settings were changed. This report is the only repository file added by the audit.

## Release evidence and boundaries

| Surface | Evidence observed on November 4 |
| --- | --- |
| Latest EAS production iOS build | `dc2999de-84f7-429c-9fe0-a3d5737dce74`, version **1.0.3 (8)**, completed October 7 at 04:15:02 UTC. |
| Downloaded store artifact | `mk.opus.studio`, **1.0.3 (8)**, runtime `1.0.3`, channel `production`; embedded endpoints include `https://studio.opus.mk` and `https://calm-dachshund-294.convex.cloud`. |
| Production OTA | Active production channel points to the production branch, whose update groups are empty. The later source fixes have not been delivered through production OTA. |
| Backend API | Live function metadata from `calm-dachshund-294` contains all **24** function references in `opus-mobile/src/lib/backend.ts`, with compatible function types, visibility and argument validators. Return behavior was assessed from source/tests, not authenticated live booking mutations. |
| Source under review | Committed `8c56d0b` plus separately assessed pre-existing uncommitted booking/security fixes on `codex/review-security-booking-fixes`. |
| App Store state | The user reports approval and pending developer release. The repository release receipt selected 1.0.3 (8), and EAS has no newer production build. A fresh Apple status/selected-build check could not be completed because App Store Connect required sign-in. |

The EAS build's recorded Git hash is `2f24146034b4a6f5e97660eddbaca5be9ea9ccfa`, which predates the first committed mobile package. Therefore that hash is not treated as a complete source snapshot of the uploaded build. Artifact inspection, the October 7 receipt and subsequent mobile diffs provide the release evidence.

Downloaded IPA SHA-256: `e6866a24f9c5dae3150edc32c69272c02bc6870558f844b57b19ce982e74a3be`. Its embedded native signature is `dc76dac7cf451843ae06aad8f038f44e84afc6468f39fac64bcd29107b009066`, matching the recorded 1.0.3 production baseline. Temporary artifact/disassembly evidence is under `/tmp/opus-mobile-compatibility-audit/`.

Relevant receipts: [mobile release](../MOBILE_RELEASE.md), [store build receipt](../../artifacts/mobile-sentry/production-build-receipt.json), [November 2 backend release](../POLAR_BILLING.md), [OTA workflow](../MOBILE_OTA.md).

## Findings

### 1. Completed appointments cannot be corrected to no-show in the old mobile UI

The October 7 appointment UI only offers actions for `confirmed` and `checked_in`. The newer backend automatically completes eligible appointments at their scheduled end. After that transition, the old native UI cannot correct a missed appointment to `no_show`; staff need the web dashboard, and completed appointment totals can otherwise remain wrong.

This was confirmed directly in the downloaded artifact: the decoded Hermes literal array contains exactly `confirmed` and `checked_in`, and the resulting status guard controls both the footer and the entire appointment-actions card. The conclusion does not depend only on build dates or Git history.

Commit `5d8810c` added this correction to the current mobile source on October 20. It is present at [appointment-detail-screen.tsx](../../opus-mobile/src/components/bookings/appointment-detail-screen.tsx#L64) but absent from the original build-era screen. The backend accepts completed-to-no-show corrections. The live emergency variable `BOOKING_AUTO_COMPLETION_ENABLED` is absent, which does not disable completion: the source disables it only when explicitly set to `false`. This environment check does not independently prove scheduling coverage for every existing appointment.

**Status:** already fixed in current source; must reach the mobile release. Verify a completed appointment can be corrected, including when automatic completion occurs while its detail screen is open.

### 2. The store build misrepresents trials and purchased team capacity

The downloaded artifact still contains the original plan-based UI: active trials are labelled OPUS Pro, expired trials fall back to Free plan, and the team editor says Pro includes up to 12 active members. The backend now supports trial/expired states and purchased packages of 1/3/4/6/8/12 members.

The backend correctly returns an effective paid plan during a trial and enforces actual capacity, so this is misleading presentation rather than an entitlement bypass. The build's lack of the new access-state handling was confirmed from its Hermes bundle. November 2 commits `808dd75` and `598ca4a` added [subscription.ts](../../opus-mobile/src/lib/subscription.ts), correct status labels and capacity-specific copy in the current source.

**Status:** labels/capacity copy already fixed in current source; must reach the mobile release.

### 3. Same-name services in different categories are indistinguishable

The backend's newer service import/category behavior allows the same name in different categories. For example, WOMEN → Haircut and MEN → Haircut are distinct services. Mobile bootstrap and management responses omit category information, and the appointment picker renders only `s.name`.

See [mobile bootstrap](../../opus-dashboard/convex/mobile.ts#L94), [management response](../../opus-dashboard/convex/mobileManagement.ts#L133) and [appointment picker](../../opus-mobile/src/components/bookings/new-appointment-screen.tsx#L153). IDs and booking writes remain correct, but the user cannot reliably identify which same-name service to choose. Existing mobile edits preserve a service's stored category; this does not delete categories.

**Status:** remains in current source. Add category labels to the shared/mobile responses and display them in selection/management UI, with a backward-compatible fallback for older responses.

### 4. Expired trials fail only at appointment confirmation

Mobile still opens the new-appointment form, requests availability and accepts customer details for an expired trial. The booking mutation then rejects confirmation with `SUBSCRIPTION_REQUIRED` and “Choose a paid plan to accept new appointments after your trial.”

The server correctly prevents unauthorized booking. The mismatch is that the native flow invites the user to complete a task that cannot succeed. See [new-appointment-screen.tsx](../../opus-mobile/src/components/bookings/new-appointment-screen.tsx#L72), [mobile slots/create](../../opus-dashboard/convex/mobile.ts#L205) and [subscription guard](../../opus-dashboard/convex/lib/subscriptionAccess.ts#L49).

**Status:** remains in current source. Show the access restriction before the form and route authorized owners to existing web subscription management. Preserve access to existing appointments and legacy Free booking.

### 5. Committed backend can offer slots that the native booking mutation rejects

Reproduction against isolated committed `8c56d0b`: set working hours to begin at **09:15**, with a **30-minute** slot interval. `mobile:slots` offers 09:15/09:45, anchored to working-hour start, while `mobile:createAppointment` requires alignment to the calendar-day grid. Saving a displayed slot fails with “Booking must align to 30 minute intervals.”

The pre-existing uncommitted [slots.ts](../../opus-dashboard/convex/slots.ts#L227) correction uses the same calendar-day anchor as booking creation, and the [availability regression](../../opus-dashboard/tests/convex/booking-availability.test.ts#L100) passes in the current working tree. The failing scenario was independently reproduced against an isolated committed snapshot, so passing current-tree tests must not be mistaken for proof that the committed release is fixed.

**Status:** backend fix exists locally but is uncommitted. Its production deployment was not established by this audit. Release/verify that correction separately; no native rebuild is needed for this backend defect.

### 6. Editing a website-hidden service can deactivate it

This is a pre-existing mobile defect, independent of recent backend updates. The service editor initializes one toggle from `isActive && isOpusVisible`, then sends that value for both fields on every save. If a service is active for internal bookings but hidden from the public site, changing only its price/name sends `isActive: false` and deactivates it.

See [initial toggle](../../opus-mobile/src/components/management/service-editor-screen.tsx#L86) and [save payload](../../opus-mobile/src/components/management/service-editor-screen.tsx#L120).

**Status:** remains in current source. Preserve independent active/public-visibility values when editing unrelated fields.

## Compatibility that passed review

- Auth/session restoration contracts retain the signed email-OTP proxy, trusted native origin and matching Better Auth versions.
- Personal push preference/device/open-notification APIs remain compatible. Account deletion and recovery routes retain their contracts, including access without active studio membership.
- Calendar, overview, appointment details, creation and status mutations retain their names and argument shapes. Tenant/staff permission checks, server availability/conflict checks and studio-timezone handling remain in force.
- Trials receive the effective paid plan; legacy Free and paid-package capacity are enforced by the backend. Extra response fields are additive for older clients.
- Client directory/history retain server-side paid access and staff-permission checks.
- SMS removal does not strand a native SMS screen/provider path; mobile personal push remains separate.
- Advanced analytics, AI Assistant, website editing, onboarding, billing and advanced settings remain web capabilities under the documented mobile scope. Native rescheduling and multi-service appointment creation are absent; existing multi-service appointments can still render. These are feature-parity limitations, not renamed/missing mobile APIs.

## Validation

| Check | Result |
| --- | --- |
| Current mobile TypeScript | Passed |
| Current mobile ESLint | Passed |
| Mobile tests | 30 passed |
| Auth/accounts/push/deletion backend suites | 116 passed across 8 files |
| Management/clients/limits/trial backend suites | 47 passed across 5 files |
| Booking/completion/availability/current-tree suites | 70 passed across 7 files |
| Isolated committed mobile/completion/trial suites | 42 passed |
| Additional off-grid reproduction on committed backend | Failed as described in finding 5; current local correction passes |
| Production iOS native compatibility guard | Passed for runtime 1.0.3 |

Suite groups overlap; their counts should not be summed as unique tests. Tests are local evidence, not a physical-device production smoke test. No production appointment, email, push or account change was created for verification.

## Release path

1. Include the existing no-show and subscription-copy fixes, then address service-category labels, early expired-trial handling and independent service visibility/activity.
2. Release and verify the existing backend slot-alignment fix through the normal backend release path.
3. Validate the resulting mobile bundle using the matching preview/runtime and a real device: existing Free studio, active trial, expired trial, small paid package, categorized services and completed-to-no-show correction.
4. Verify sign-in/session restoration, appointment creation/status changes and physical push delivery/taps on the actual release binary before public release.

The current native compatibility check passes, so the existing JavaScript fixes can fit runtime 1.0.3 without a native dependency change. A production OTA can deliver compatible fixes after preview/device validation; a new binary can instead embed them on first launch. With the current `ON_LOAD` update check and zero fallback timeout, do not assume a first launch will already run a newly published OTA. Nothing was published during this audit.

Expo's [runtime compatibility documentation](https://docs.expo.dev/eas-update/runtime-versions/) explains the native/JavaScript boundary. Passing the compatibility guard establishes native compatibility only, not functional readiness or an App Store release.
