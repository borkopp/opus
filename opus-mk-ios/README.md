# OPUS MK — iOS

Native SwiftUI client for [opus.mk](https://opus.mk), sharing the same Convex backend as `opus-mk` and `opus-dashboard`.

## Prerequisites

- Xcode 16+ (project targets iOS 26 SDK)
- Convex dev server running from `opus-dashboard` (`npm run dev:backend` or `npm run dev`)
- Clerk application with [Convex integration](https://dashboard.clerk.com/apps/setup/convex) enabled
- Clerk **Native application** registered with bundle ID `mk.opus.Opus-MK`

## First-time setup

### 1. Secrets

```bash
cp "Opus MK/Opus MK/Config/Secrets.example.plist" "Opus MK/Opus MK/Config/Secrets.plist"
```

Edit `Secrets.plist` and set:

| Key | Source |
|-----|--------|
| `CONVEX_DEPLOYMENT_URL` | Same as `NEXT_PUBLIC_CONVEX_URL` in `opus-mk/.env.local` (local: `http://127.0.0.1:3210`) |
| `CLERK_PUBLISHABLE_KEY` | Same as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `opus-mk/.env.local` |

`Secrets.plist` is gitignored.

### 2. Clerk native app + Associated Domains

In [Clerk Dashboard → Native applications](https://dashboard.clerk.com/~/native-applications):

1. Add iOS app with bundle ID `mk.opus.Opus-MK` and your Apple Team ID prefix.
2. Note your **Frontend API** host (e.g. `delicate-hyena-31.clerk.accounts.dev`).

In Xcode → target **Opus MK** → **Signing & Capabilities** → **Associated Domains**, confirm:

```
webcredentials:YOUR_FRONTEND_API_HOST
```

This is pre-filled in `Opus_MK.entitlements` for dev — update it if your Clerk instance differs.

### 3. Open and run

```bash
open "Opus MK/Opus MK.xcodeproj"
```

Select the **Opus MK** scheme, pick a simulator, **Run**.

Discover loads `public:listPublished` from Convex (no sign-in required). Sign-in uses Clerk prebuilt `AuthView`.

## Project layout

```
Opus MK/Opus MK/
  Config/           AppConfig, Secrets plist
  Services/         ConvexEnvironment (Convex + Clerk)
  Models/           Decodable types for public queries
  ViewModels/       DiscoverViewModel
  Views/            RootView, DiscoverView, …
  Theme/            OPUS design tokens
```

## Backend

- Convex functions live in `opus-dashboard/convex/` only.
- Do **not** add a separate Convex project for iOS.
- Public marketplace API: `convex/public.ts` (`public:listPublished`, `public:getPublicProfile`, …).

## Convex function names (Swift)

Use colon notation: `api.public.listPublished` → `"public:listPublished"`.

## Next steps

- [ ] Business detail screen (`public:getPublicProfile`)
- [ ] Booking flow (`publicBooking:*`)
- [ ] My bookings (`opusUsers:*` + Clerk auth)
- [ ] AI chat via hosted `opus-mk` `/api/chat` (do not embed Anthropic keys in the app)
