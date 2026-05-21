# opus-native — OPUS mobile (Expo SDK 55)

React Native app for the OPUS marketplace. Shares the **same Convex backend** as `opus-dashboard` and `opus-mk` — do not create a separate Convex project.

## Docs

- Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/
- Convex React Native: https://docs.convex.dev/quickstart/react-native

## Local development

1. Start Convex from the dashboard app (port `3210`):

   ```bash
   cd ../opus-dashboard && npm run dev:backend
   ```

2. Copy env and start Expo:

   ```bash
   cp .env.example .env.local
   npm install
   npm start
   ```

3. **Physical device (Expo Go):** Keep `EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` — `src/lib/convex-url.ts` rewrites to your Mac's LAN IP from Metro's debugger host. If it still fails, set the LAN URL explicitly in `.env.local`.

4. **Images:** Local Convex storage is on the **same URL as `EXPO_PUBLIC_CONVEX_URL`** (`/api/storage/...` on port `3210`). `src/lib/resolve-media-url.ts` rebuilds every image URL from that origin so Expo Go on a physical device uses your Mac's LAN IP (not `127.0.0.1`). Production uses `*.convex.site` automatically.

## Convex layout

- `convex/` → symlink to `../opus-dashboard/convex`
- Client imports: `import { api } from '@/lib/convex-api'` (`anyApi` + types from dashboard codegen; do not import `_generated/api.js` in app code — Metro cannot bundle across the symlink)
- Public marketplace queries: `api.public.listPublished`, `api.public.getPublicProfile`, …

## Auth (next step)

For signed-in flows, add `@clerk/clerk-expo` and swap `ConvexProvider` for `ConvexProviderWithClerk` (see Convex + Clerk React Native docs). Clerk publishable key: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
