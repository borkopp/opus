# opus-scraper-admin

Scraper + review UI for populating the Skopje restaurant/bar dataset in the opus-mk RAG pipeline.

## Setup

```bash
cd opus-scraper-admin
npm install

# Copy and fill in the env file
cp .env.example .env
```

Required env vars:
- `GOOGLE_PLACES_API_KEY` — enable **Places API (New)** in Google Cloud Console
- `CONVEX_URL` — from `opus-dashboard/.env.local` (e.g. `https://xxxxx.convex.cloud`)
- `ADMIN_API_KEY` — choose any secret string, then set it on Convex:
  ```bash
  cd ../opus-dashboard
  npx convex env set ADMIN_API_KEY your-secret-here
  ```
- `VITE_CONVEX_URL` — same as `CONVEX_URL` (Vite prefix required for browser)
- `VITE_ADMIN_API_KEY` — same as `ADMIN_API_KEY`

## Scraping

```bash
# 1. Scrape Google Places (all 16 Skopje tiles, ~300-500 restaurants/bars)
npm run scrape:google

# Test a single tile first:
npm run scrape:google -- --tile 0

# 2. Scrape Wolt menus (optional but recommended for RAG quality)
npm run scrape:wolt

# 3. Merge + upsert to Convex (idempotent — safe to re-run)
npm run upsert
```

Data files are saved to `data/` as JSON checkpoints — the scrapers resume from the last checkpoint if interrupted.

## Review UI

```bash
npm run dev
# Opens at http://localhost:5173
```

The table shows all scraped venues with completeness badges (Hours, Menu, Coords, Phone, Photos). Click any row or **Edit** to open the detail drawer:

- Edit all fields (name, address, hours, menu markdown, etc.)
- Save → updates the Convex record
- Once a venue is `Ready`, the **Publish to opus-mk** button embeds it into the RAG vector index

## How it connects to the RAG

Published scraped venues appear as normal `orgs` rows with `source: "scraped"` and `listingStatus: "published"`. The existing `marketplace_embeddings` index picks them up automatically. The `menuText` field (markdown) is appended to the org's embedding chunk, enabling queries like:

> *"give me an open restaurant where I can eat something for keto diet"*

## Notes

- Re-running the scraper is safe (deduplication by `googlePlaceId` and then by name+coords).
- Google photo URLs are stored directly — they expire after ~48h. For permanent storage, manually re-upload via the review UI.
- If a scraped venue is later claimed by the real business owner, set `claimStatus: "claimed"` — the org converts to a regular customer org.
