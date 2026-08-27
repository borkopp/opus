# OPUS Design System — how to build with it

OPUS is a warm, **dark-mode-first** SaaS for service businesses (barbers, salons,
spas). One hot emotional color — **terracotta** — on obsidian neutrals; no cool
blues. Components are shadcn/ui primitives built on Radix + Tailwind v4.

## Setup & wrapping
- **No provider needed.** Components render standalone. Light mode is the default
  (warm-white surfaces); for dark mode add `class="dark"` to any ancestor — every
  token flips automatically.
- Fonts load at runtime (Google Fonts): **Syne** (display/numbers), **DM Sans**
  (UI), **DM Mono** (labels/code). Nothing to import.
- A few components are data/imperative-bound: `Price` reads org currency from app
  context (renders a skeleton without it); `Toaster` is the host for `sonner`'s
  imperative `toast()`. Treat those as integration points, not static UI.

## Styling idiom — Tailwind v4 utility classes with semantic tokens
Style with utility classes; **never hardcode hex** — use the semantic token
classes so light/dark and brand changes flow through. Core families (all real,
in `styles.css`):

| Purpose | Classes |
|---|---|
| Page / text | `bg-background` `text-foreground` |
| Card surface | `bg-card` `text-card-foreground` |
| Primary (obsidian) | `bg-primary` `text-primary-foreground` |
| **Accent (terracotta)** | `bg-accent` `text-accent-foreground` |
| Secondary / muted | `bg-secondary` · `bg-muted` `text-muted-foreground` |
| Danger | `bg-destructive` `text-white` |
| Lines / focus | `border-border` `ring-ring` |
| Radius | `rounded-md` `rounded-lg` (16px) `rounded-full` (pills) |
| Type | `font-sans` · `font-display` (Syne) · `font-mono` |

Signature moves: **terracotta for the one primary CTA per view** —
`<Button variant="terracotta">` — everything else `outline`/`ghost`/`secondary`;
`font-display` with `tabular-nums` for money and big numbers; pill buttons
(`rounded-full`); soft layered shadows (`shadow-s/m/l`).

## Component API highlights
- `Button` variants: `default` `terracotta` `secondary` `outline` `ghost`
  `destructive` `link`; sizes `xs sm default lg icon`.
- `Badge` for status (`default` confirmed, `secondary` pending, `destructive`
  cancelled). `Alert` variants `default` / `destructive`.
- Compound primitives compose from sub-parts importable from the same bundle:
  `Card`+`CardHeader/CardTitle/CardContent/CardFooter`, `Dialog`+`DialogContent/…`,
  `Select`+`SelectTrigger/SelectContent/SelectItem`, `Table`+`TableRow/TableCell`,
  `DropdownMenu`, `Tabs`+`TabsList/TabsTrigger/TabsContent`, `Field`, `InputGroup`.
  Each component's `.prompt.md` shows its canonical composition.

## Where the truth lives
Read `_ds/<folder>/styles.css` (semantic tokens + every utility) before styling,
and the per-component `<Name>.prompt.md` / `<Name>.d.ts` for props and composition.

## Idiomatic snippet
```tsx
<Card className="max-w-sm">
  <CardHeader>
    <CardTitle>Today's bookings</CardTitle>
    <CardDescription>Tuesday, 30 June</CardDescription>
    <CardAction><Badge variant="secondary">12 booked</Badge></CardAction>
  </CardHeader>
  <CardContent className="flex items-center justify-between">
    <span className="text-muted-foreground">Revenue</span>
    <span className="font-display tabular-nums text-lg">£480</span>
  </CardContent>
  <CardFooter className="gap-2">
    <Button variant="terracotta">New booking</Button>
    <Button variant="outline">View schedule</Button>
  </CardFooter>
</Card>
```
