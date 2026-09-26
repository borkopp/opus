# Studio session replay masking

Studio replay starts only with analytics consent. All input values and unmarked
rendered text remain masked. Static interface copy can be readable in new
recordings; existing masked recordings cannot be recovered.

Use `data-replay-public` only on an element whose direct text is fixed interface
copy (including English/Macedonian translations). The marker does not unmask
descendants. Mark each static text element separately; never mark a container
whose direct text includes a customer name, email, phone, studio data, note,
message, or other user-entered value. Do not apply the marker to generic UI
primitives by default.

Shared page, widget, and onboarding headings accept explicit `replayPublicTitle`,
`replayPublicDescription`, or `replayPublicSubtitle` flags. Leave them unset when
the corresponding string includes user or database values.

`data-replay-private` and `ph-mask` on an element or ancestor override the public
marker. Inputs, selects, textareas, and editable content remain private. This
policy controls replay text; it does not authorize additional event properties,
network bodies, images, or analytics capture without consent.

The browser regression test uses the installed PostHog recorder to verify both
initial snapshots and DOM/input updates. After deploying, verify a newly started,
consented studio session in the existing PostHog project. Recording/sampling
settings still determine which sessions are collected.
