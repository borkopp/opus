# Hospitality first version: website, menu and flexible reservations

Decision date: **17 October 2026**. Status: **planned; not implemented by this
change**. The user authorized updating the direction and documentation, and
explicitly requested no implementation yet. Future implementation requires a
follow-up instruction. Deployment, production configuration, DNS changes, Git
pushes and merges are not authorized by this plan.

[PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) remains the product authority.
[HOSPITALITY_IMPLEMENTATION.md](HOSPITALITY_IMPLEMENTATION.md) records the existing
local reservation foundation and historical verification. This plan replaces
its reservation-only roadmap, not its implemented behavior or safety contracts.

## Product and first-version boundary

Serve everyday cafés and restaurants in Macedonia, including venues with weekend
music. Give each venue one place to maintain its website and digital menu, share
QR links, and accept reservations only when useful. A café using only its website
and menu is a complete use case, not an unfinished restaurant setup.

Included in the planned first version:

1. A hospitality website editor built on OPUS Sites' reusable foundations.
2. Optional verified venue-owned domains, retaining automatic OPUS subdomains.
3. A structured digital menu, including mobile browsing and simple maintenance.
4. Branded website/menu QR downloads and printable cards.
5. Optional weekly or date-specific reservations, with lightweight event content.

Preserve the existing guest booking, explicit table combinations, floor plans,
walk-ins, staff lifecycle, cleaning, search, attention indicators and privacy
work. These are available when a venue uses reservation/service operations; they
must not become mandatory setup for a website/menu-only venue.

**Excluded:** POS implementation or integration, order intake/cart/checkout,
kitchen routing, table-request inboxes, deposits, guest payments, bill splitting,
inventory and sales/fiscal accounting. QR codes in this version open content or
the existing reservation journey; scanning one does not place an order.
Hospitality AI images, automated promotion/Instagram publishing, automatic menu
import or translation, loyalty, waitlist automation, native hospitality,
marketplace discovery and international expansion also remain later proposals.
Commercial plans/prices and hospitality subscription billing need a separate
decision; do not silently inherit beauty's paid-plan rules.

## Existing foundations and reuse boundaries

Paths below are relative to `opus-dashboard/`, except `shared/website-design.ts`,
which is at the repository root. This inventory describes current source, not
work completed under this plan.

| Capability | Reuse | Required adaptation |
| --- | --- | --- |
| Accounts and workspace | Better Auth, staff membership, business switcher, short name/type onboarding, `convex/hospitality.ts` | Preserve tenant roles, beauty choice and existing accounts; adapt setup guidance. |
| Website editing | `app/(dashboard)/(shared)/website/_components/WebsiteEditorWorkspace.tsx`, `components/website/WebsitePreviewFrame.tsx`, `lib/website-editor-state.ts` | Reuse editor mechanics through typed content adapters; current editor is beauty-only. |
| Design and publishing | `convex/websiteDesigns.ts`, `convex/lib/websiteDesign.ts`, `shared/website-design.ts` | Keep beauty v1 documents and guards intact; add a versioned hospitality contract and publication readiness. |
| Photos | `convex/orgMedia.ts`, `org_media` | Reuse ownership/storage/soft-delete patterns; separate beauty gallery limits and publication recomputation. Stored media type `menu` is not a structured menu. |
| Current venue site | `components/reservations/public/ReservationWebsite.tsx`, `app/(website)/sites/[slug]/page.tsx` | Retain fallback for existing venues; remove booking-setup dependency from new public content reads. |
| Host resolution | `proxy.ts`, `lib/tenant-sites.ts`, `convex/lib/tenantSites.ts`, `lib/public-site-server.ts`, `lib/reservation-server.ts` | Extend both request routing and server verification for verified custom hosts; never trust legacy `customDomain` alone. |
| QR and print | `lib/promotion-artwork.ts`, `lib/promotion-palette.ts`, `components/promotions/ArtworkPreview.tsx`, `components/promotions/export-image.ts` | Reuse QR, contrast, quiet-zone and export primitives; retain beauty-only promotion queries and appointment copy. |
| Reservation operations | `convex/lib/reservationEngine.ts`, `reservationTime.ts`, `convex/reservations.ts`, `convex/reservationPublic.ts` | Add public acceptance policy around the existing atomic inventory and secure guest flows. |
| Readiness and scheduling | `convex/lib/hospitalityReadiness.ts`, `hospitalitySettingsValidation.ts`, `convex/hospitality.ts`, `components/reservations/VenueRulesForm.tsx` | Split public presence, public booking and staff operational readiness; distinguish opening hours from booking windows. |

Do not remove the beauty guard from `websiteDesigns.ownerStudio`, widen
`isActiveIndustry`, treat dishes as beauty services, or activate old domain
strings. Reuse components and contracts deliberately rather than copying the
beauty application or weakening its authorization.

## Intended journeys and navigation

- **Owner:** choose hospitality → venue name → Café/Restaurant → dashboard.
  Create website/menu at their own pace; enable bookings and connect a domain
  only when wanted. No extra onboarding questions are required for dashboard access.
- **Guest browsing:** open venue URL or scan QR → browse website/menu without an
  account or app. See accurate opening hours, contact information and available
  booking options. No cart, payment or order-confirmation UI.
- **Guest booking:** an eligible service/event opens the existing central OPUS
  reservation journey; choose party/time, verify email and confirm atomically.
  Preserve optional client accounts and secure management links.
- **Staff:** continue existing visits and table operations independently of
  whether the venue currently accepts new online reservations.

Planned owner navigation: Overview, Website, Menu, Reservations, Tables, Settings.
QR materials belong with Website/Menu; Domains belongs in website settings.
Overview shows useful setup tasks and publication status, not mandatory table
setup. On narrow screens use a small primary navigation plus a More destination,
rather than squeezing six tabs into the existing bottom bar. Preserve old URLs
and links into visits. Staff keep their operational workspace; public booking
Off must not hide existing visits or remove staff access to them.

Owners retain website/menu publication, domain and team authority. Managers can
prepare content drafts, maintain menu availability and configure reservation
operations. Staff retain visit handling; do not grant editing, publishing or
domain access simply because a navigation item is visible. Enforce roles server-side.

## Phases

All phases below are **pending implementation**. Each must preserve beauty's
golden journey and the existing local hospitality behavior before the next phase.

### Phase 1 — Separate public presence from booking readiness

- Introduce distinct website readiness, menu publication, public booking
  acceptance and staff operational readiness. Keep explicit owner publication.
- Website readiness validates public identity/contact/location content and a
  usable site; it must not require tables, floor plans or reservation settings.
  A menu can be hidden while a website is published, but an unpublished website
  must not leak its menu through direct links or QR destinations.
- Define versioned hospitality content, menu and scheduling contracts with
  tenant-leading indexes, soft deletes, audit records and revision checks.
- Change public content queries as well as publication controls. Currently
  `hospitality.setPublished`, `reconcilePublication` and
  `reservationPublic.getVenue` depend on reservation readiness/settings. A
  frontend-only relaxation would leave a published website unusable.
- Separate venue opening hours, staff operational service windows and online
  reservation windows. Existing walk-ins use `servicePeriods`; switching online
  reservations off must not clear or invalidate staff operating hours.
- Preserve established venues' equivalent schedule/publication behavior through
  explicit, idempotent compatibility handling. New venues start with online
  reservations Off. No existing venue is automatically unpublished or switched off.

**Acceptance:** a menu-only café can publish without tables or booking settings;
new guest booking remains unavailable. Making booking resources unready pauses
new booking without suspending valid public content. Existing beauty websites,
hospitality visits and private staff operations remain functional.

### Phase 2 — Structured digital menu and public browsing

- Support food/drinks menus with ordered categories/items, names/descriptions,
  optional photos, integer minor-unit prices and explicit currency, simple priced
  variants, and venue-authored dietary/allergen labels. Do not infer allergens
  or availability. Reuse approved media ownership and image-processing patterns.
- Provide manual Macedonian, English and Albanian content with primary-language
  fallback. This does not grant or change beauty translation entitlements and
  does not require an AI provider.
- Provide clear draft/save/publish behavior for menu content and prices. Keep
  rapid, audited availability toggles separate so an item can be marked unavailable
  without publishing unrelated drafts. New items remain private until published.
- Add a dedicated public menu destination and website menu section using the
  same content. Empty categories, missing photos and unavailable items need
  deliberate states. Menu editing never alters a reservation or beauty service.
- Use a usable default venue site before the full editor phase. Publishing a
  menu requires at least one visible category and valid priced item; the website
  can still exist without a published menu.

**Acceptance:** owners can maintain drinks and food menus from a phone; guests
browse without signing in at 320px and larger widths. Drafts, unpublished items,
deleted records and other tenants' media never appear publicly. A published
price change or availability toggle updates both public destinations without
changing their URLs. Allergen labels reflect only venue-provided information.

### Phase 3 — Hospitality website editor

- Adapt OPUS Sites' palettes, typography, spacing, section ordering, preview,
  inline editing, undo/redo and revision recovery through a separate hospitality
  schema or a versioned discriminated contract. Keep old beauty designs valid.
- Offer curated hero, about, gallery, menu, opening hours/contact, event and
  footer sections, plus a booking action that reflects actual acceptance mode.
  This is a section editor, not arbitrary HTML/JavaScript or a freeform page builder.
- Preview and published pages use the same hospitality renderer. Keep draft
  preview private, disable real booking submissions inside it, and preserve
  same-origin preview-message checks. Media/source edits and design drafts must
  clearly state which changes are live.
- Keep existing hospitality pages working until an owner publishes the new
  design. Use the current safe renderer fallback rather than bulk rewriting sites.

**Acceptance:** saved drafts survive reopening, live pages change only through
the intended publication actions, and stale saves offer recovery. Desktop and
mobile previews match published layout. Menu-only venues show useful browsing
actions; existing beauty editing, gallery limits and language gates are unchanged.

### Phase 4 — Flexible reservations and simple event information

- Add **Off**, **Weekly services**, and **Selected dates** modes. Weekly services
  can cover every day or only selected services. Date overrides either close a
  service date or replace that date's public booking windows completely.
- Optional event title/description accompanies dated windows and can appear on
  the website. Keep one shared physical table inventory; no ticketing, paid entry,
  event capacity pool, performer management or event checkout.
- Apply the deterministic policy below in slot queries and booking mutations,
  retaining explicit combinations, cleaning buffers and concurrency protection.
- Preview schedule reductions against existing reservations. Preserve those
  visits and their saved durations/buffers; never silently cancel or reschedule.
- Reuse staff rules/forms, secure guest management and notification queues.
  Booking mode is ordinary venue configuration, not a deployment/pilot flag.

| Order | Public availability rule |
| --- | --- |
| 1 | Off mode, unpublished site or failed booking readiness yields no new public slots. |
| 2 | Explicit closed date yields no slots; otherwise that date's replacement windows win. |
| 3 | Without an override, weekly windows apply only in Weekly services mode; Selected dates stays closed. |
| 4 | Apply operational hours, venue/table closures, last seating, advance notice, horizon, party/duration limits, reset buffers and actual free table capacity. |

Reject overlapping windows, including overnight spillovers. A Friday window
ending Saturday belongs to Friday's service date; resolve with the current IANA
timezone/UTC contract and DST rules. Closures apply to actual instants, and an
event never bypasses them. Keep existing safeguards on timezone changes while
future reservations exist.

**Acceptance:** a daily-open café can accept only weekend bookings; a music night
can accept bookings on one date with no adjacent-date availability. Weekly and
dated bookings compete for the same tables/combinations. Off mode and unpublishing
preserve guest proof-link viewing/cancellation and staff lifecycle operations.
New guest reservations/reschedules require permitted public destination windows;
staff manual bookings/reschedules and walk-ins may use independently configured
operational windows while online booking is Off, with all physical constraints.

### Phase 5 — QR downloads and printable materials

- Reuse QR generation, quiet zones, contrast checks and artwork exports for
  website and menu destinations. Include a branded QR image and printable
  table/counter card. A reservation destination is optional when booking is enabled.
- Use stable OPUS-owned purpose links that resolve a venue and destination type.
  Resolve only configured internal destinations; never accept an arbitrary
  redirect URL. Retain the published slug identity and survive domain changes.
- Menu-only codes need no physical tables or table IDs. No order or service-request
  controls are included. Export checks that the intended destination is published.
- If a destination later becomes unavailable, show an accurate unavailable state
  or the published venue homepage with explanation; never expose draft content.

**Acceptance:** downloaded codes decode and scan at their intended print size;
website/menu links work without accounts. Existing printed codes survive menu
edits, redesigns and custom-domain attachment/removal. Turning reservations off
does not break menu codes, and unpublication does not leak content.

### Phase 6 — Verified custom domains

- Support connecting one primary venue-owned hostname, with an optional separately
  verified `www` alias where applicable. Keep the automatic OPUS address. Domain
  purchase, email hosting, domain resale and tenant wildcard domains are excluded.
- Owner flow: enter hostname → receive ownership/DNS instructions → verify → wait
  for hosting/TLS readiness → activate. Include clear pending/error states,
  retry, safe replacement and disconnect. Do not display success from a DNS
  record alone or trust a legacy `orgs.customDomain` string.
- Design a normalized, unique, verified hostname registry. Tenant configuration
  stays `orgId` scoped. The minimum public host-to-tenant bootstrap lookup needs
  an explicitly documented named hostname index; it must not expose other tenant
  data or become a general exception to authorization/index rules.
- Extend both proxy routing and server public-data checks. Unknown, revoked,
  conflicting or unverified hosts fail closed; reserve OPUS/platform names.
  Invalidate stale mappings on disconnect/reassignment and reverify ownership.
- Keep dashboard login, guest OTP/client accounts and management flows on the
  existing central OPUS origins. Tenant domains serve public website/menu content;
  do not add every tenant domain to trusted authentication origins or cookie scope.
- Make canonical metadata, sitemap policy and public navigation follow only an
  active verified domain. Use safe alias redirects without loops; retain stable
  OPUS QR links and fallback content if a custom domain fails. Keep local and
  preview sites non-indexable; current hospitality `noindex` needs an explicit
  release decision, not accidental removal during editor work.
- Reuse the existing Vercel project topology. Future domain lifecycle provider
  calls belong in server-side actions with audited state changes and retry-safe
  recovery; no credentials in the browser. Read provider-returned configuration
  rather than prescribing one DNS record for every hostname.

**Acceptance:** local provider doubles cover verification failure, duplicate
claims, retries, interrupted attachment/removal, revoked ownership and tenant
isolation. Existing OPUS links and central booking/account flows work after a
domain change. Actual DNS, certificates and hosted redirects require later
authorized environment verification; local tests cannot prove them.

Provider references checked on 17 October 2026: Vercel documents
[custom-domain setup and automatic SSL after verification](https://vercel.com/docs/domains/set-up-custom-domain),
[project-domain verification](https://vercel.com/docs/rest-api/reference/endpoints/projects/verify-project-domain),
and [domain removal](https://vercel.com/docs/domains/working-with-domains/remove-a-domain).
Confirm API access, limits and provider state before later implementation; these
links authorize no infrastructure change. Keep the existing deployment runbook
in [TENANT_WEBSITES.md](TENANT_WEBSITES.md).

### Phase 7 — Integrated validation and release preparation

- Exercise three complete venues: a menu-only café; a restaurant with regular
  reservations; a café/restaurant accepting only weekend or music-event bookings.
- Cover owner/manager/staff permissions, public/private drafts, cross-tenant media
  and hosts, narrow/mobile layouts, keyboard use, languages, refresh/recovery,
  published menu maintenance, QR exports, domain fallback, and schedule changes
  around existing visits, midnight and DST.
- Retain and run beauty and hospitality regression suites, type checks, lint and
  isolated production compilation. Extend the existing suites as behavior lands;
  documentation-only work must not be reported as new passing feature coverage.
- Review real venue copy and a representative busy service. Real email delivery,
  DNS/TLS and the full hosted auth journey remain separate verification evidence.
- Prepare additive migrations, reviewed legacy reconciliation, rollback and
  deployment order. Decide hospitality pricing/media limits before commercial
  release without changing beauty entitlements as a shortcut.

**Acceptance:** document actual checks and remaining provider/environment limits;
no premature live marketing claims. A separate explicit release instruction is
still required. Keep work on `codex/hospitality-vertical`; do not merge to `main`,
change production configuration or deploy as a consequence of completing a phase.

## Practical next step after implementation is requested

Start with Phase 1's readiness and contract separation, then a real structured
menu on the existing venue renderer. This gives a useful menu-only café journey
before expanding the editor. QR links are designed early and exported in Phase 5;
custom domains build on that stable public journey in Phase 6. External provider
setup and commercial packaging remain explicit later decisions, not assumed
configuration or promises in the current application.
