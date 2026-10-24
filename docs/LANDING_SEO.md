# Landing SEO

The marketing site uses stable language URLs: Macedonian at `https://opus.mk/`, English at `/en`, and Albanian at `/sq`. Home, pricing, contact, privacy, and terms are available in each language (15 URLs). The existing unprefixed URLs remain Macedonian; `/mk` aliases permanently redirect. Cookies and Accept-Language no longer change crawlable content. Language links retain the current page, query, and fragment when used normally, and internal links preserve the chosen language.

`opus-landing/proxy.ts` rewrites only the five supported pages. It overwrites the locale header from the URL; static files and unknown routes are not rewritten. Shared dashboard locale behavior is unchanged.

`opus-landing/lib/seo.ts` supplies page-specific titles/descriptions, self-canonicals, reciprocal `hreflang` with Macedonian `x-default`, Open Graph and Twitter metadata. Homepage JSON-LD describes OPUS as Organization, WebSite and WebPage. No invented review ratings or unsupported software/FAQ rich-result promises are included. Pricing snippets use the published MKD base price consistently; the existing visible currency selector remains available.

The shared social image is `public/assets/opus-social-preview.jpg` (1200 x 630, about 74 KB), made using built-in image generation and the approved cream-and-blue artwork. Prompt, caption, source and checksum are in `docs/seo/`. PNG favicon, Apple icon, and structured-data logo derive from the existing vector symbol. The existing `opus-logo.png` is preserved.

`/sitemap.xml` contains all 15 URLs with language alternates. `/robots.txt` allows public pages and advertises that sitemap. Do not invent last-modified timestamps or add private Studio/owner pages to this sitemap. Unknown paths must return 404.

## Validation

From `opus-landing`:

```sh
npm run lint
npm run build
npm run typecheck
npx next start --port 3101
# In another terminal:
npm run check:seo -- http://localhost:3101
# After deployment:
npm run check:seo -- https://opus.mk
```

The check reads rendered bot HTML for every URL and verifies canonical/alternate links, language precedence over cookies and headers, one H1, matching social metadata, structured data, assets, redirects, sitemap and 404 behavior. Also verify English -> pricing -> Albanian navigation in a real browser and inspect console errors.

## Release scope

Prepared from isolated `codex/landing-seo` checkout at base `aa81c50f`. Landing source at that base is identical to the previous live landing deployment `81b4bc6b`; the base contains separate owner changes that are not imported by this app. No pre-existing uncommitted landing animation, header, carousel, or dashboard-preview work is part of this SEO release. Deploy only the Vercel `opus-landing` project from the isolated checkout; do not deploy the dirty primary checkout or the dashboard/Convex backend.

Use `[skip deploy]` for the Git commit to avoid triggering unrelated monorepo deployments, and deploy the isolated landing project explicitly. Search Console uses the verified `sc-domain:opus.mk` property. Submit `https://opus.mk/sitemap.xml`, inspect the homepage and language homepages, and request indexing where eligible. Historical failed 2019 sitemap submissions belong to the previous site; do not redirect unrelated old content to the homepage or claim it is current.

Submission and a successful live URL test do not guarantee Google indexing or search rankings. Initial Search Console reports may still be processing.
