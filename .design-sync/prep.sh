#!/bin/sh
# design-sync prep — regenerate the two artifacts the converter consumes before
# package-build.mjs runs. Run from anywhere; resolves to the repo root.
# Re-sync order: (1) re-stage .ds-sync scripts + `npm i esbuild ts-morph
# @types/react @tailwindcss/cli` inside .ds-sync, (2) run THIS, (3) run the
# converter / resync.mjs. See .design-sync/NOTES.md.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1. Standalone Tailwind v4 CSS → cssEntry (opus-dashboard/.ds-compiled.css).
#    Scans components/ui + .design-sync/previews; defines the next/font CSS vars.
node .ds-sync/node_modules/.bin/tailwindcss \
  -i opus-dashboard/.ds-tw-input.css \
  -o opus-dashboard/.ds-compiled.css

# 2. Component .d.ts (so the converter emits real prop contracts, not `unknown`).
( cd opus-dashboard && node_modules/.bin/tsc -p .ds-dts.tsconfig.json )

# 3. Types entry barrel the converter's propsBodyFor resolves against
#    (projectFor wants <pkgRoot>/index.d.ts).
node -e '
const fs=require("fs");
const d="opus-dashboard/dist/types/components/ui";
const files=fs.readdirSync(d).filter(f=>f.endsWith(".d.ts"));
const out="// design-sync generated types barrel — gitignored build artifact\n"+
  files.map(f=>`export * from "./dist/types/components/ui/${f.replace(/\.d\.ts$/,"")}";`).join("\n")+"\n";
fs.writeFileSync("opus-dashboard/index.d.ts",out);
'
echo "design-sync prep done: .ds-compiled.css, dist/types, index.d.ts"
