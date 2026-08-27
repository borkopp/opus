# design-sync NOTES — OPUS Design System

Source: `opus-dashboard/components/ui/` (shadcn/ui, 35 primitives) → claude.ai/design
project `df47644f-1022-4623-8ce1-ef996a7c5e45` ("OPUS Design System").

## What this is
The repo has **no buildable design-system package** — the components live inside the
Next.js dashboard app. We sync them via the converter's **synth-entry (package) shape**.
Brand: warm dark-mode-first SaaS, terracotta (`--accent`) on obsidian neutrals.

## Build wiring (non-obvious — read before re-syncing)
- **`--entry opus-dashboard/.ds-virtual-entry`** is a *deliberately non-existent* path.
  It makes `PKG_DIR` walk up to `opus-dashboard/` (so `cssEntry` stays in-bounds and
  `srcDir` resolves) while `resolveDistEntry` returns null → synth-entry mode bundles
  `export *` over every `components/ui/*.tsx`. The two `[NO_DIST]` log lines are expected.
- **`--node-modules opus-dashboard/node_modules`** (react 19 has no UMD → bundled via esbuild from here).
- **`sh .design-sync/prep.sh`** (cfg.buildCmd) MUST run before the converter. It produces:
  1. `opus-dashboard/.ds-compiled.css` — standalone Tailwind v4 build (the `cssEntry`).
     Compiled from `opus-dashboard/.ds-tw-input.css`, which `@source`s `components/ui`
     + `.design-sync/previews` and **defines the `--font-*` CSS vars** normally injected
     by `next/font` (Syne/DM Sans/DM Mono/Outfit/Playfair). Without these the bundle
     renders in fallback fonts.
  2. `opus-dashboard/dist/types/**` — component `.d.ts` via `tsc -p .ds-dts.tsconfig.json`.
     Needed because the inline shadcn prop types (`React.ComponentProps<…> &
     VariantProps<…>`) only resolve to real props (variant/size/asChild) from emitted
     `.d.ts`; without this every `.d.ts` collapses to `[key:string]: unknown`.
  3. `opus-dashboard/index.d.ts` — types-entry barrel. `propsBodyFor` resolves component
     props via `<pkgRoot>/index.d.ts`'s exports; without it props fall back to `unknown`
     even when dist/types exists.
- **componentSrcMap**: 35 primitives pinned to their src files; 111 compound sub-parts
  (`CardHeader`, `DialogContent`, `SelectItem`, …) set to `null` so they don't get their
  own DS-pane cards. They REMAIN importable from `window.OpusUI` (bundle is `export *`,
  independent of the map) — document them via the parent's preview/prompt composition.
  The pins also matter mechanically: any non-null pin makes the discovered-list non-empty,
  which *disables* the auto-discovery fallback — so ALL 35 must be pinned, not just a few.

## Re-sync setup (fresh clone)
1. Stage scripts: `cp -r <skill>/{package-build,package-validate,package-capture,resync}.mjs <skill>/lib <skill>/storybook .ds-sync/` + `echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json`.
2. Install converter deps INCLUDING the Tailwind CLI: `(cd .ds-sync && npm i esbuild ts-morph @types/react @tailwindcss/cli@^4.1)`. (The standard skill install omits `@tailwindcss/cli` — it's required here.)
3. `sh .design-sync/prep.sh`
4. Converter: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules opus-dashboard/node_modules --entry opus-dashboard/.ds-virtual-entry --out ./ds-bundle` then validate.

## Known render warns (triaged — not new on re-sync)
- `[FONT_REMOTE]` Syne/DM Sans/DM Mono/Outfit/Playfair — intentional: brand fonts load at
  runtime via the Google Fonts `@import` in `.ds-tw-input.css`. Nothing to ship.
- `[RENDER_SKIPPED]` — user opted out of installing playwright/chromium; render check does
  not run. Verification is structural validate + human review of `.review.html`, not machine screenshots.
- `[DTS_STYLE_SYSTEM] filtering @types/react props` — expected: strips the hundreds of HTML
  DOM attributes so emitted `.d.ts` keep only meaningful props. Do NOT add dtsPropsFor for these.

## Re-sync risks (what can silently go stale)
- **Tailwind class coverage**: `.ds-compiled.css` only contains utility classes present in
  `components/ui` + `.design-sync/previews` at compile time. A preview using a class no
  component uses needs a CSS recompile (prep.sh handles it) — always run prep.sh before building.
- **Next font vars**: if the app adds/renames a `--font-*` family, mirror it in `.ds-tw-input.css`.
- **Brand tokens**: `cssEntry` tokens come from `opus-dashboard/app/globals.css` (light `:root`
  + `.dark`). Previews render light mode (the app default). If globals.css token names change,
  the compiled CSS follows automatically (prep.sh recompiles).
- **dist/types staleness**: prep.sh re-emits, but if `tsc` starts erroring on unrelated app
  changes, declarations may be partial — check `.d.ts` aren't `unknown` after a re-sync.
- **No machine render gate**: previews are human-verified only. A component that regresses
  visually won't be caught automatically — re-review `.review.html` on meaningful changes.
