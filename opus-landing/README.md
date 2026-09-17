# OPUS landing page

The approved blue OPUS marketing site, ported into the monorepo as a Next.js application. Includes the illustrated feature grid, studio carousel, booking demo, AI demo, pricing, generated onboarding art, and panoramic logo CTA.

## Local development

```sh
npm ci
npm run dev
```

The landing page runs at http://localhost:3001, alongside the dashboard at port 3000. Webpack is used for this independent app inside the monorepo.

## Production build

```sh
npm run build
npm start
```

## Vercel and GitHub

- Existing Vercel project: `opus-landing`, team `borko-projects`.
- Git repository: `borkopp/opus`.
- Root directory: `opus-landing`.
- Framework: Next.js. Node.js: 24.x.
- Install: `npm ci`. Build: `npm run build`. Output: Next.js default.
- Production branch: `main`. Production domain: https://opus.mk.
- Vercel Git deployments are enabled in `vercel.json`. Pushes to `main` trigger production; other branches produce previews through the existing Git integration.
- Include files outside the root directory: enabled, because consent utilities live under `shared/analytics`.
- This app uses native Vercel Git integration; no GitHub Actions deployment token is required.

When committing the migration, include `opus-landing/` and the existing shared consent source under `shared/analytics/`. Those shared files were not yet tracked when this migration was prepared. Review the other monorepo changes independently.

No push or deployment was performed during the migration.

## Preserved behavior

Privacy and terms retain their Macedonian and English document content. The contact form retains the existing Formspree endpoint. Analytics and marketing choices remain independently opt-in through the shared consent utilities, with a Cookie settings action in the footer. `NEXT_PUBLIC_META_PIXEL_ID` remains optional; an unset ID disables Meta Pixel.

`/pricing` redirects to the new pricing section, `/hero-original` to the homepage, and `/login` and `/signup` to the real dashboard.

## Editing

- `app/page.tsx`: homepage markup.
- `app/_styles/`: the approved visual design.
- `components/landing/`: navigation, footer, and interactive demo/carousel behavior.
- `public/assets/`: locally served generated brand artwork and the OPUS mark.
- `lib/legal.ts`: retained legal content.
