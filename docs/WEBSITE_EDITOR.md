# OPUS Sites

Authorized October 7, 2026. This feature customizes existing beauty studio tenant
websites; it does not add a marketplace, custom domains, a new product vertical,
or native editing.

## Access and editing

Owners open **Settings → OPUS Sites**, or **Customize website** on the dashboard's
live website card. `/website` removes dashboard chrome and displays controls on
the left with a wider website preview on the right. At narrow widths, Customize
and Preview switch between these panels. The authenticated `/website/preview`
iframe uses the same `WebsiteCanvas` as the published website and receives draft
data only through messages from its same-origin parent window. Preview links
cannot leave the frame or submit bookings. Preview analytics and the cookie
consent overlay are disabled; draft content is marked private for replay.

The editor provides six palettes, four typography choices, custom accent and
background colors, corner and spacing controls, and content width. Owners can
select sections in the preview, double-click primary-language text to edit,
reorder sections, hide optional sections, and undo or redo edits. Hero, services
and visit/contact stay visible to protect the booking journey.

Variants include three navigation layouts, four hero layouts, three service
layouts, three story layouts, bento/carousel/slideshow/grid galleries, two team
layouts, three contact layouts and two footer layouts. Existing studio images
can be selected and ordered; uploads and business facts remain managed by Studio
settings. Changes to those shared settings apply independently of design drafts.
Gallery autoplay pauses for reduced motion, hidden pages, hover and focus.

## Drafts, publication and tenant permissions

`website_designs` stores the draft, immutable-until-republished design snapshot,
revision, publication metadata and translation state, indexed by `orgId`.
Every public edit derives the owner identity and organization server-side.
Service and media references must belong to that organization. Stale saves fail
with a reload message rather than overwriting another window's draft. Significant
mutations append audit records.

**Save draft** leaves the live site unchanged. **Publish** first saves the current
draft, checks the existing beauty website readiness requirements, and publishes
that revision. Operational services, staff, photos and hours are shared studio
data rather than snapshots. Guest booking still uses canonical IDs, availability,
conflict checks and prices. Display-only service wording follows visitors into
booking and confirmation without changing booking records.

Legacy tenant pages remain on their current renderer until a design is published.
No migration is required for existing organizations. Unpublishing a studio still
uses the existing website publication controls.

## Languages

Website language customization and automatic translation require Pro. The Languages
panel stays visible to Free owners with its primary-language selector, additional
language switches, automatic-translation switch, preparation button, review selector,
search and correction fields visible and disabled. Other design controls remain
available on Free. The backend rejects language-setting and correction changes
from Free studios and rechecks Pro access before every AI request and completion.

After a downgrade, existing language configuration and translations remain stored.
The public website and booking use only the primary language while on Free. Design
publication still works without generating translations; upgrading restores the
saved languages and corrections.

The website primary language is separate from dashboard language and the studio's
stored operational locale. Owners write content once, enable optional additional
languages, and choose **Prepare translations** or automatic translation on Publish.
Built-in website and booking labels are already translated in Macedonian, English
and Albanian. The selected language travels through the central booking URL.

Translations are matched to both field key and exact source text. Changed source
copy immediately falls back to the original until translated again. Manual
corrections survive automatic jobs while their source stays unchanged. Clearing
a correction restores fallback and allows a later automatic job to fill it.
Jobs from superseded draft revisions are discarded. Completing a job also updates
the published design only when it is still that same revision.

The provider action sends only public website copy: custom text, service wording,
captions and staff biographies/specialties. It does not send customer records,
appointments, contact details, raw database IDs or studio/staff names as standalone
fields. Human names within text are instructed to remain unchanged. Requests use
temporary text references, structured output and `store: false`.

Configure on the selected Convex deployment:

- `WEBSITE_TRANSLATION_OPENAI_API_KEY`, falling back to existing `OPENAI_API_KEY`.
- Optional `WEBSITE_TRANSLATION_MODEL`; default `gpt-6-luna`, matching the existing
  provider conventions in this repository.

Each studio is limited to 20 requested translation jobs per 24-hour
window. Jobs use batches of 35 fields, at most 750 changed fields and 80,000 source
characters per target language, a 45-second provider timeout and no automatic
provider retries. Jobs have a five-minute request budget and expire after six
minutes if the action is interrupted, allowing the owner to retry. Missing
credentials, refusal, malformed output or provider failure retain original
content and report failure in the editor. Publication
and booking remain usable. A successful provider call is required before
describing automatic translation as operational in a deployed environment.

## Validation

`tests/convex/website-designs.test.ts` covers authorization, cross-studio references,
draft/publication separation, stale revisions, readiness, Free/Pro language enforcement,
plan downgrades, manual corrections,
superseded jobs and provider failure. `tests/unit/website-design.test.ts` covers
source-matched fallbacks, correction preservation, public text extraction and
localized dates without changing OPUS wall-clock booking timestamps.
