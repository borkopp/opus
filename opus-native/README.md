# opus-native

Expo SDK 55 React Native client for OPUS. Uses the shared Convex deployment in `opus-dashboard` (same pattern as `opus-mk`).

## Prerequisites

- Node 18+
- Convex dev server from `opus-dashboard` (`npm run dev:backend` or `npm run dev`)

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` if needed:

| Variable | Local default |
|----------|----------------|
| `EXPO_PUBLIC_CONVEX_URL` | `http://127.0.0.1:3210` (must match `NEXT_PUBLIC_CONVEX_URL` in `opus-dashboard/.env.local`) |

On a **physical device**, replace `127.0.0.1` with your Mac's LAN IP.

## Run

Terminal 1 — backend:

```bash
cd ../opus-dashboard && npm run dev:backend
```

Terminal 2 — app:

```bash
npm start
```

The home screen shows a **Convex** status badge when `public:listPublished` loads successfully.

## Project structure

```
convex/              → symlink to opus-dashboard/convex
src/
  app/_layout.tsx    → ConvexClientProvider (root)
  lib/convex.ts      → ConvexReactClient singleton
  components/        → convex-client-provider, convex-connection-badge
```

## References

- [Convex React Native quickstart](https://docs.convex.dev/quickstart/react-native)
- [Expo environment variables (EXPO_PUBLIC_*)](https://docs.expo.dev/guides/environment-variables/)
