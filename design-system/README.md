# OPUS Design System

> **Dark-mode-first, warm, sophisticated.** Terracotta accent on deep obsidian.
> Built for a multi-tenant SaaS: marketplace + owner dashboard + marketing site.

---

## What OPUS is

OPUS is an **all-in-one AI-powered business management platform** for service-based businesses — primarily **barbershops, hair salons, spas, tattoo studios, beauty salons, restaurants**. Three revenue layers: monthly subscriptions, payment-processing margin, and future fintech. First market is **North Macedonia** (Skopje), so most marketing copy is **Macedonian Cyrillic**.

### The three products

| Product | Audience | Surface |
|---|---|---|
| **opus-landing** | Prospects / business owners | Marketing site (mostly light/dark toggle, dark-first) |
| **opus-mk** | Consumers booking appointments | Public marketplace — discovery, profiles, booking flow |
| **opus-dashboard** | Business owners + staff | Authenticated SaaS: bookings, staff, services, finances, AI inbox |

All three share one visual language: **warm neutrals, terracotta accent, Syne display + DM Sans body + DM Mono labels, 16px rounded surfaces.**

---

## Sources

Everything here was derived from:

- **Monorepo:** `github.com/borkopp/opus` — `opus-landing/`, `opus-mk/`, `opus-dashboard/`
- **Dedicated landing repo:** `github.com/borkopp/opus-landing-page`
- **Project overview:** `opus-landing/opus_project_overview.md`
- **Codebase guides:** `CLAUDE.md` (root), `opus-dashboard/AGENTS.md`
- **Uploaded asset:** `uploads/abstract-bg_11zon.jpg` — the terracotta-on-black dune hero texture (now at `assets/abstract-bg.jpg`)

---

## Content fundamentals

### Voice & tone
- **Confident, grounded, human.** Not breathy. Not corporate.
- **"You own your business" energy.** The hero says _"Your business works. **You** rule it."_ That inversion of tool/human is the emotional center.
- **Practical, specific, numeric.** Copy uses concrete numbers (€20/month, ≈ 2-3 missed bookings, 24/7) over abstractions.
- **Bilingual:** Consumer-facing marketing in **Macedonian Cyrillic**; dashboard UI English-first with MK locale support; product labels (buttons, category names) prefer English where unambiguous.

### Casing & tone rules
- **Sentence case** everywhere except LOGO and all-caps micro-labels.
- **UPPERCASE label pattern** for section headers: 10px, `letter-spacing: 0.15em`, 700 weight, muted color (`Гallery`, `About`, `Services`). Cast widely through both marketplace and dashboard.
- **Italic serif accent** on one word per headline — always the verb/adjective doing the emotional work. Uses **Playfair Display italic** in terracotta. Example: _"Едноставен **ценовник**"_ ("Simple pricing"), _"Вие **владеете** со него"_ ("You **rule** it").
- **"You" voice**, not "we." Second person, direct.
- **Numbers are tabular.** DM Mono or Syne with `font-variant-numeric: tabular-nums`. Never floats in money — always minor units.

### Emoji
- **Avoided.** The codebase uses zero UI emoji. Warm, professional tone; emoji would fight the obsidian gravitas. Two `decorative marks` (`✦`) are tolerated as spacers in the category pill row.

### Example copy snippets
- Hero: _"Вашиот бизнис работи. Вие владеете со него."_
- Subhead: _"OPUS го автоматизира закажувањето, плаќањата и комуникацијата со клиенти. Од салони за убавина до ресторани. Сè на едно место."_
- CTA pair: **"Започнете бесплатно"** (primary) / **"Дознајте повеќе"** (outline)
- Badge: _"Запознајте го вашиот нов дигитален асистент"_
- Pricing: _"Бесплатно првите 3 месеци, потоа само 20€ месечно."_
- Marketplace category: "Barbershop", "Hair Salon", "Nail Salon", "Spa", "Lash Studio"
- Empty state: "No businesses found. Try a different search term."

---

## Visual foundations

### Color vibe
**Warm neutrals with one hot accent.** The palette is a single-accent system — terracotta/clay-orange — sitting on obsidian and warm whites. No cool blues, no purple gradients, no neon. Imagery leans **warm, grainy, orange-on-black** (see `assets/abstract-bg.jpg`: dune-like waves of terracotta light on pitch black).

- **Accent (terracotta):** `#e8472a` / `#ce5d45` — CTA buttons, hover glow, active nav pill (dark mode), italic display accents, chart-1, focus rings.
- **Foreground:** `#faf9f7` warm off-white (never pure white) / `#1a1a18` obsidian (never pure black in light mode, though pure #000 is used for the deepest page in the dashboard).
- **Neutrals:** step ladder from `#000 → #0d0d0d → #141412 → #1e1e1c → #262624 → #2a2a28` (card = one step above bg, popover = two steps above).
- **Semantic:** emerald `#4ea97a` (success, earthy), amber `#e3b34a` (ratings/stars), fresh green `#3ecf5b` (presence dot).

### Typography
Three families, each doing one job:

| Family | Role | Weight |
|---|---|---|
| **Syne** | Display / large headings / numerics in dashboard | 500, 600 |
| **DM Sans** | Body, buttons, UI copy everywhere | 400, 500, 700 |
| **DM Mono** | Micro-labels, tabular data, code | 400 |
| **Playfair Display** *(italic only)* | Single-word display accents in terracotta | 500 italic |
| **Audiowide** | The OPUS wordmark logo only | 400 |

All five are Google Fonts and load cleanly. `font-feature-settings: "ss01", "cv01"` globally; `font-variant-numeric: tabular-nums` on all numerics.

### Backgrounds
- **Pure obsidian page** (#000 / #141412) is the default.
- **Full-bleed gradient image** (`assets/abstract-bg.jpg`) for landing hero — dune-like terracotta light rays.
- **Radial spotlight** under pricing / feature blocks: `radial-gradient(circle, rgba(206,93,69,0.08), transparent 70%)` + `blur(80px)`.
- **Dotted grid** overlay on pricing section: 1px terracotta dots at `rgba(206,93,69,0.05)` on 24px spacing with radial mask.
- **Backdrop blur** on floating headers (`backdrop-filter: blur(12px)`, `background: rgba(0,0,0,0.8)`) — a key aesthetic signature.
- **No hand-drawn illustrations.** **No repeating patterns.** Photography is used for business covers, gallery tiles, hero product screenshots only.

### Animation
- **Subtle, springy, short.** `cubic-bezier(0.16, 1, 0.3, 1)` is the dominant easing ("slide-up-fade-in", 400ms).
- **Framer Motion** for orchestrated entrances: `staggerChildren: 0.08`, `spring (stiffness: 350, damping: 25)`.
- **Scroll-reveal pattern:** `useInView({ once: true, amount: 0.2 })` → opacity 0→1 + y: 30→0 over 800ms.
- **Hover:** scale 1.01–1.05, opacity shifts, **no bounces**.
- **Press:** `active:scale-[0.98]` is everywhere — buttons, cards, pills. Universal press feedback.
- **Navbar hide-on-scroll-down** / show-on-scroll-up, `duration: 0.3`, `easeInOut`.
- Respects `prefers-reduced-motion`.

### Hover & press states
| Element | Hover | Press |
|---|---|---|
| Primary button | Lift shadow + terracotta glow (`0 3px 5px rgba(206,93,69,0.5)`) | `scale(0.98)` |
| Outline button | Background `neutral-50 / neutral-700` | `scale(0.98)` |
| Card | Border stronger + subtle `shadow-sm` + `scale(1.01)` | `scale(0.98)` |
| Nav link | Color → foreground; chevron or label reveals | — |
| Sidebar item | Light bg fill; icon color → terracotta | — |

### Borders
- **Hairline.** 1px, white at 8–18% alpha (dark mode). Light mode = `#e2ded8` (warm neutral-200).
- Never thick. Never dashed except for decorative dividers (footer uses mask-repeating-linear-gradient for a dotted effect).
- Focus ring: `2px` terracotta, `0.45` alpha.

### Shadows
Multi-layer **inset + outer** shadows (not flat drop shadows):
```
inset 0 1px 0 rgba(255,255,255,0.06),  /* top hairline highlight */
0 1px 2px rgba(0,0,0,0.5),              /* crisp edge */
0 6px 12px rgba(0,0,0,0.35)             /* soft ambient */
```
Three tiers: `--shadow-s`, `--shadow-m`, `--shadow-l`.
CTA gets its own: terracotta-tinted drop (`rgba(206,93,69,0.5)`).

### Cards
- **Radius: 16px** (`--radius-lg`). Pill buttons get full-round (9999px).
- **Surface: `--bg-3` (#1e1e1c)** in dark, pure white in light.
- **Border:** `border-border/40` — very light.
- **No left-accent-border cards** (avoid the SaaS trope).
- **Padding: 16px or 24px.** Internal spacing is tight.

### Layout
- **Max width 1280px** (`max-w-7xl`) for marketing; **1700px** for dashboard.
- **Navbar fixed top, backdrop-blurred after scroll.** Morphs from full-width to rounded-24px-pill container after 10px scroll.
- **Sticky bottom CTA bar** on mobile booking profile pages.
- **3-column grid** on marketplace discovery (responsive: 1/2/3).
- **4-column dashboard grid** with `md:col-span-1/2` widgets.

### Transparency & blur
- **Headers:** `bg-background/80 backdrop-blur-xl` — the dominant sticky-surface treatment.
- **CTA overlays:** white gradient sweeps on hover (`translate-y-full → 0`).
- Card surfaces themselves are **solid**; transparency is reserved for structural layers (sticky headers, overlays, glows).

### Corner radii in use
- 8px (`rounded-lg`) — small chips, avatars
- 12px — inputs, small cards
- 16px (`rounded-2xl`) — primary cards, discovery tiles, CTA buttons on bottom bar
- 20px+ — gallery tiles, big feature cards
- 9999px — pill buttons, nav links, category filters, badges

### Imagery color vibe
- **Warm, cinematic, slightly grainy.** The hero texture (see `assets/abstract-bg.jpg`) sets the tone: deep black with terracotta light waves — a dune-at-twilight feel.
- Product screenshots are shown in **faux macOS window frames** (traffic lights + url bar) for authority.
- Business covers on marketplace are full-bleed, gradient-masked to fade into background.

---

## Iconography

- **Primary icon set: [Tabler Icons](https://tabler.io/icons)** — used pervasively via `@tabler/icons-react`. 1.5px stroke, rounded caps.
- **Secondary set: Lucide React** — used lightly in pricing (`CheckCircle2`, `Star`).
- Both available via CDN; this design system pulls Tabler at runtime where needed (see `assets/ICONOGRAPHY.md`).
- **Size defaults:** 14px (inline labels), 16–20px (buttons/nav), 24px (standalone).
- **Color:** inherits `currentColor`; muted icons use `--fg-2`.
- **No custom SVG mascots, no emoji, no unicode char substitutes** (one rare `✦` spacer in category pills).
- **Logo:** `OPUS` wordmark in **Audiowide**, uppercase, `tracking: 0.08em`. In footer it is rendered as a massive outlined `WebkitTextStroke: 1px` ghost. See `assets/logo-wordmark.svg`.

---

## File index

| Path | What's there |
|---|---|
| `README.md` | This file |
| `SKILL.md` | Cross-compatible skill file |
| `colors_and_type.css` | CSS vars for colors, type, radii, shadows, spacing |
| `assets/` | Logo, hero texture, icon notes |
| `preview/` | Design-system cards (type specimens, color swatches, component states) |
| `ui_kits/marketplace/` | opus-mk — discovery feed, business profile, booking flow (JSX) |
| `ui_kits/dashboard/` | opus-dashboard — beauty home, bookings, sidebar, widgets (JSX) |
| `ui_kits/landing/` | opus-landing-page — hero, pricing, footer (JSX) |

---

## Caveats

- **Fonts are loaded from Google Fonts** (not bundled TTFs). All five families — Syne, DM Sans, DM Mono, Playfair Display, Audiowide — are native to Google Fonts, so this is a faithful reproduction, not a substitution.
- **Icons:** Tabler Icons pulled at runtime via CDN (`esm.sh/@tabler/icons-react`). No local SVG sprite was extracted.
- **No custom product screenshots were imported** — the dashboard UI kit recreates widgets from the source code; it does not reuse the `hero.png` / `hero-dark.png` shipped with the landing page.
- **Mapbox tiles** (used in BusinessMap on real marketplace) are mocked as a flat terracotta block in the UI kit.
