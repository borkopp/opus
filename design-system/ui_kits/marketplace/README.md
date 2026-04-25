# OPUS MK — Marketplace UI Kit

Consumer-facing marketplace for discovering and booking service businesses. Recreates `opus-mk` from the monorepo.

## Components
- `Header.jsx` — sticky blurred header with global search
- `CategoryBar.jsx` — horizontal category filter pills with ✦ separators
- `BusinessCard.jsx` — discovery tile (gradient cover, category badge, rating, tags)
- `BusinessProfile.jsx` — full profile with services list, gallery grid, sticky book panel
- `BookingFlow.jsx` — 3-step bottom-sheet (service → date/time → confirm)
- `data.jsx` — mock business data

## Flow
Discovery grid → click a card → profile page → "Book" → booking sheet → confirm. Fully click-through.

## Source
Modeled after `opus-mk/` in `github.com/borkopp/opus`. Mapbox map and gallery imagery mocked.
