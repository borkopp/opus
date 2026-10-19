# OPUS Studio web app installation

The studio dashboard can be added to a phone's Home Screen or installed through a
supported desktop browser. It remains the existing web dashboard, with the same
sign-in, staff permissions and live Convex backend. Installation does not enable
offline appointment access or editing and does not create a native consumer app.

## Install experience

- The studio account menu links to **My preferences → Install web app**. The
  dashboard overview can show a dismissible install suggestion on supported mobile
  browsers or when the browser makes its install prompt available. Dismissal is a
  browser preference; it does not remove the preferences entry.
- Chromium's native install prompt opens only after a button press. Each captured
  prompt can be used once. Browser dismissal or a failed prompt falls back to
  manual instructions; accepting a prompt is not treated as proof of installation.
- iPhone/iPad instructions explain Safari's **Share → Add to Home Screen** flow,
  including **Open as Web App** when shown. Android and desktop instructions cover
  browser menus, and Safari on Mac uses **Add to Dock**.
- UI supports English, Macedonian and Albanian. Install suggestions are hidden
  when running as an installed app or after the browser reports installation.
  A normal browser tab cannot reliably discover every installation on the device.
- HTTPS is required outside loopback development. Browser and operating-system
  support determine which install controls are available.

## Manifest and assets

`opus-dashboard/public/studio.webmanifest` retains `/beauty` as the start URL and
explicit app ID, with root scope and standalone display. Its shortcuts open the
calendar and notifications; normal session and permission checks still apply.
Studio metadata is attached to dashboard, studio login and onboarding routes.
Public tenant websites, guest booking and client-account routes do not inherit it.

The 192px and 512px app icons, 180px Apple touch icon and separate 512px maskable
icon use the exact `public/opus-mark.svg` on an opaque white background. The
maskable version leaves room for launcher cropping. Regenerate from
`opus-dashboard/` with `node scripts/generate-studio-icons.mjs`.

Studio Apple metadata embeds the same 180px PNG as a generated data URL (under
3 KB). This avoids a separate download in the Add to Home Screen sheet, addressing
reports of iOS 27.2 showing a letter tile despite valid network-loaded touch icons.
The icon generator also updates `lib/studio-apple-touch-icon.generated.ts`; do not
edit its encoded image manually. An unsized PNG link remains for Safari versions
that ignore data URLs. Newer Safari ranks the explicit 180px icon above that
fallback. The manifest continues to use ordinary PNG URLs.
Safari's conventional
`/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` probes resolve to
the same PNG on `studio.opus.mk` and loopback development hosts only; tenant
websites do not receive this automatic fallback.

The dashboard viewport includes device safe areas while leaving pinch zoom
available. Installed browser behavior and actual launcher rendering still need
physical-device checks; icon files or a manifest test alone do not prove them.

## Worker and offline boundaries

The worker remains `/opus-push-sw.js` with scope `/`, preserving existing browser
push registrations. Dashboard, studio login and onboarding mounting register it
without requesting notification permission. The worker script is served with revalidation/no-store
headers, and registration bypasses the HTTP cache for updates. New workers claim
existing clients without forcibly reloading the page.

Only same-origin GET **document navigations** to studio routes use the worker's
network path. Requests use `cache: "no-store"`; successful responses, redirects and
HTTP errors pass through unchanged. A network failure returns a static branded
screen with a retry link and an accurate internet-required message. Its language
follows the browser's English/Macedonian/Albanian locale because the app framework
and saved dashboard preferences are unavailable in that screen.

The worker has **no CacheStorage usage**. It stores no dashboard HTML, auth data,
API responses, appointments or customer details. The fallback is embedded in the
worker and needs no images, fonts, scripts or external requests. APIs, Convex
requests, Next.js data/assets, writes, public booking and client-account routes
are not intercepted. This fallback covers a failed full-page navigation or app
launch; it is not an offline dashboard or a queue for later changes.

Push remains separately opt-in and provider-dependent. Installation and worker
registration never request notification permission. See
[PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md) for its configuration and delivery
boundaries.

## Measuring adoption

The existing PostHog SDK and analytics consent choice also cover these events;
there is no additional consent prompt or install-specific stored identifier.

| Event                                | Meaning                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `studio_install_instructions_opened` | A user opens the install dialog.                                                                                |
| `studio_app_installed`               | The browser fires `appinstalled`, where supported. Accepting a prompt alone does not count.                     |
| `studio_app_opened`                  | The dashboard is observed in standalone/minimal-ui display mode or iOS standalone mode, once per document load. |

Each event includes `platform` and `display_mode`. Provider remounts and route
changes do not duplicate a launch. Events require the existing analytics consent;
declined clicks and installation events are not buffered or replayed. If consent
is accepted while the app is currently open, that current standalone launch can
be counted. Existing `SyncUser` identification associates events with the signed-in
user without adding another identity mechanism.

For adoption, count **unique users of `studio_app_opened`**, excluding the existing
**Internal / Test users** cohort. This measures known users observed opening the
installed app, including iPhone users: iOS does not report `appinstalled`. It is
not an exact installation count, an uninstall count, or a count of devices. Users
who decline analytics, block PostHog, or never open the installed app are absent;
anonymous users may remain separate until the existing identification runs.
No historical installations can be backfilled from this instrumentation.

The saved [OPUS Home Screen app users insight](https://eu.posthog.com/project/263508/insights/ykPYn731)
shows distinct users over the last 30 days with the existing test-account filter.

## Manual device validation before release

Use a configured HTTPS test deployment and a permitted test account. These are
checks to perform, not claims of completed device or production validation.

1. On an iPhone/iPad, open the studio in Safari, follow the install guidance, and
   confirm the OPUS icon and name on the Home Screen. Launch it and verify
   standalone navigation, sign-in/callback recovery, and calendar access.
2. On Android Chrome, try the explicit install button when offered, then the
   manual browser-menu path. Verify the icon under the launcher's actual crop and
   launch the calendar/notifications shortcuts where supported.
3. Check portrait, landscape, large text, pinch zoom and the on-screen keyboard.
   Keep headers, tabs, dialog close controls and calendar actions clear of the
   notch and home indicator. Check all three dashboard languages.
4. Dismiss the suggestion and reload. Verify it remains dismissed while **My
   preferences** still provides installation help. Open the installed app and
   verify that another install suggestion is not shown.
5. After loading the dashboard online once, disable networking and relaunch or
   reload a studio route. Verify the static offline message, no private content,
   and successful retry after reconnecting. HTTP 401/403/404/500 responses must
   retain the normal server behavior rather than becoming an offline page.
6. Check guest booking and client sign-in separately: no studio install UI or
   metadata, no service-worker interception of their requests. Inspect browser
   CacheStorage to verify that this worker creates no cache.
7. If browser push was already configured on a test installation, verify its
   subscription survives the worker update. Confirm no permission prompt appears
   on launch; test permission/delivery separately through **Enable in this browser**.

Browsers may retain installed icon/name metadata until their own update cycle.
If an existing shortcut keeps an old icon, remove and re-add that shortcut during
device validation. Do not reset notification permissions or recreate subscriptions
as part of an icon update.
