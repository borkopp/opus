# OPUS Owner

Private, one-page overview for `borko.petrevski@gmail.com` at `admin.opus.mk`.
This is an independent Next.js app; it shares only the existing backend and two
small contracts under `shared/`. It never deploys Convex or changes business data.

See [setup, deployment and metric definitions](../docs/OWNER_OVERVIEW.md).

```bash
npm ci
cp .env.example .env.local
# Fill in the local Convex public addresses.
npm run dev
```

Local address: http://localhost:3002.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
