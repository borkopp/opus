---
name: opus-design
description: Use this skill to generate well-branded interfaces and assets for OPUS MK, the all-in-one AI-powered platform for beauty salons, barbershops, and restaurants (marketplace + owner dashboard + landing site). Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Brand:** OPUS MK — warm, sophisticated, dark-mode-first SaaS. Terracotta accent (`#ce5d45`) on obsidian neutrals (`#000 → #2a2a28`), one hot emotional color, no cool blues.
- **Type:** Syne (display), DM Sans (body/UI), DM Mono (numerics/labels), Playfair Display italic (single-word accents in terracotta), Audiowide (logo only).
- **Signature moves:** floating blurred nav pills, italic serif accent word in hero, `active:scale-[0.98]` press feedback, multi-layer inset+outer shadows, terracotta glow on AI-related UI.
- **Three surfaces:** `ui_kits/landing/` (marketing), `ui_kits/marketplace/` (consumer), `ui_kits/dashboard/` (owner).
- **Copy:** consumer-facing is Macedonian Cyrillic; dashboard is English.
- **Source of truth:** `colors_and_type.css` — CSS vars for every token. Import it at the top of any HTML artifact.

## Workflow for new artifacts

1. Link `colors_and_type.css` in your HTML.
2. Open the closest UI kit and reuse its components.
3. If you need an icon, use Tabler Icons (CDN) — see `assets/ICONOGRAPHY.md`.
4. If you need hero imagery, use `assets/abstract-bg.jpg` for a warm, cinematic backdrop.
5. Keep cards at `--radius-lg` (16px), pills at 9999, buttons on terracotta with the `--shadow-cta` glow.
