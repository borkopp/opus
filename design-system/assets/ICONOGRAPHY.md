# OPUS Iconography

## Primary: Tabler Icons
Used everywhere in the codebase via `@tabler/icons-react`. Stroke-based, 1.5px weight, rounded caps, 24×24 viewBox. CDN available.

### Common icons used
- **Nav/chrome:** `IconMenu2`, `IconX`, `IconArrowLeft`, `IconArrowRight`, `IconChevronRight`, `IconChevronDown`, `IconSun`, `IconMoon`
- **Marketplace:** `IconSearch`, `IconMapPin`, `IconStarFilled`, `IconStar`, `IconSparkles`, `IconPhone`, `IconWorld`, `IconBrandInstagram`, `IconClock`
- **Categories:** `IconScissors`, `IconBrush`, `IconLeaf`, `IconHeart`, `IconEye`, `IconUser`, `IconFlame`, `IconMassage`, `IconYoga`, `IconRun`, `IconHandSanitizer`
- **Dashboard:** `IconMessagePlus`, `IconRotate`, `IconApi`

### CDN usage
```html
<script type="module">
  import { IconSearch } from "https://esm.sh/@tabler/icons-react@3";
</script>
```
Or use raw SVG from `https://tabler.io/icons/icon/search`.

## Secondary: Lucide React
Used in pricing component (`CheckCircle2`, `Star`). Similar stroke style. Largely interchangeable with Tabler.

## Emoji / Unicode
**Not used.** One decorative `✦` (U+2726) appears as a spacer in category pills on desktop. That's it.

## Logo
`OPUS` wordmark set in **Audiowide** 400, uppercase, `letter-spacing: 0.08em`.
In the footer a giant outlined variant is used with `-webkit-text-stroke: 1px var(--color-neutral-700)` and transparent fill — creates the ghost/watermark treatment.
