# AI Assistant

Authorized on 16 September 2026 as a read-only feature for beauty studio owners and managers. The 21 October 2026 authorization adds 3 Fast prompts per month for Free studios; Detailed mode remains Pro-only. The dashboard entry is `/beauty/assistant`. This is separate from the customer-facing Instagram AI Receptionist.

## Runtime

```mermaid
flowchart TD
  A[Authenticated dashboard chat] --> B[Convex send mutation]
  B --> C[Membership, plan allowance, duplicate request and budget checks]
  C --> D[Persist turn, reserve allowance, schedule worker]
  D --> E[OpenAI Responses API]
  E --> F[Validated analyse_period tool]
  F --> G[Bounded tenant queries and deterministic analytics]
  G --> E
  E --> H[Validate report and numeric fact references]
  H --> I[Save answer, report snapshots and usage]
  I --> J[Reactive chat and saved report page]
```

The model chooses supported metrics, periods, grouping and exact staff/service names. It cannot run SQL or code, retrieve arbitrary records, or invoke booking/customer/message mutations. Convex performs all calculations. A vector database, document embeddings, fine tuning and recursive agents are unnecessary for these structured booking questions.

`convex/analyst/data.ts` and `metrics.ts` also supply the dashboard staff-capacity widget. The older dashboard's separate revenue charts retain their existing definitions; they are not presented as equivalent to the assistant's completed-value reports.

## Configuration

Set these **on the target Convex deployment**, using its environment-variable settings:

- `BUSINESS_ANALYST_OPENAI_API_KEY`: an OpenAI project API key with access to the selected models.
- `BUSINESS_ANALYST_ENABLED`: `true` when the deployment is ready for use; absent or `false` blocks new requests and further provider calls.

The example environment file defaults to disabled. A Next.js environment variable alone does not configure Convex. Never expose the key using `NEXT_PUBLIC_`. Use a dedicated provider project with a billing limit/alert appropriate to the total number of subscribed studios.

The separate key intentionally does not enable the existing marketplace embedding code that reads `OPENAI_API_KEY`. Deploy the dashboard and the Convex schema/functions together. The new tables start empty; there is no fabricated historical schedule backfill. Disabling the flag stops new analysis; owners and managers can still read their existing saved conversations/reports.

Local implementation and mocked-provider checks are not evidence that a production key, deployment, billing limit, or model-quality evaluation is configured.

## Models and cost controls

`convex/analyst/limits.ts` is the single cost-policy definition:

| Mode | Model | Input / output per million tokens | Reservation per answer |
| --- | --- | --- | --- |
| Fast | `gpt-5.6-luna` | USD 0.20 / 1.20 | USD 0.03 |
| Detailed | `gpt-5.6-terra` | USD 2.00 / 12.00 | USD 0.20 |

Prices are the implementation's accounting assumptions and must be rechecked before changing models or rates. Cached-input discounts are conservatively ignored. Output usage includes reasoning tokens. There are at most three provider calls, three analytics tool calls, 1,500 output tokens per call, and 60 KB cumulative serialized provider input per turn. Automatic SDK retries are disabled. A provider request times out after 45 seconds; a five-minute lease releases stranded reservations.

Each Free studio has 3 Fast answers per UTC calendar month and cannot submit Detailed requests. Pro retains 200 answers, including at most 20 Detailed answers. Owners and managers share their studio's allowance; their conversations remain private. Starting a new chat or changing plans does not reset usage. Upgrading applies the Pro limit to existing monthly usage; downgrading applies the Free limit. Workers also recheck the plan before analysis and publication, so a pending Detailed request or a request beyond the Free limit cannot finish after a downgrade. Saved conversations and reports remain readable after reaching the allowance or downgrading.

The existing monthly USD 3 internal spend ceiling applies to both plans and can stop usage before the answer count is reached. It covers assistant model calls only. Database, hosting, payment fees, tax, messaging and support are separate costs.

Requests reserve funds and answer counts atomically before scheduling. Only one analysis per studio runs at a time, including across month rollover. Replaying a request ID is idempotent. Five submissions per minute, a 2,000-character question limit and 60 turns per conversation bound abuse. Provider failure restores the user's answer allowance but retains billable usage. If a provider call's cost is unknown, the whole reservation is counted conservatively. Finalization is idempotent, and audited submission/completion records permit reconciliation.

## Metric definitions

All date boundaries use the studio timezone and the application's existing UTC-shaped local booking timestamps. Last month means the previous calendar month; weeks start Monday. Custom date endpoints are inclusive. This month/week include today and are explicitly marked incomplete. Their previous-period comparisons use the corresponding elapsed calendar days of the previous month/week, capped at the end of that month. Whole months compare to whole months; other custom ranges compare with an equally long preceding range.

| Metric | Calculation |
| --- | --- |
| Completed appointment value | Sum of stored booking prices for completed appointments; integer minor currency units |
| Appointments | All non-deleted appointments scheduled in the period, including cancellations and no-shows |
| Completed appointments | Completed appointments with a start before the analysis time |
| Cancellations / no-shows | Counts of those recorded outcomes for the scheduled period |
| Cancellation rate | Cancelled / all appointments in the scheduled period |
| No-show rate | No-shows / (completed + no-shows); unresolved outcomes excluded |
| Utilisation | Booked minutes excluding cancellations and no-shows / recorded staff working minutes |
| Returning clients | Unique clients with a completed visit in the period and a recorded completed visit before the period |
| Returning client share | Returning clients / unique completed clients in the period |

No denominator produces an unavailable value, not zero. Completed appointment value is not collected payments, profit, expenses or refunds. Service bundles retain one total price and one combined service label. Different currencies cannot be summed or compared as one monetary value; previous-period reports retain their own currency.

Day grouping includes days with no bookings. Known closed days are marked with zero observed days and excluded from weakest-day ranking. Weekday appointment counts and values are averages per observed open day. When opening history is unavailable, calendar occurrences are used with a visible caveat that closed days may be included. Rates are weighted by their denominators; unique returning clients are counted per group, not summed from daily figures. Summary values remain totals.

Recommendations contain supporting report references, a proposed experiment and a measurement. They do not assert causation, promise outcomes, or execute actions. The prompt asks about the weakest individual date and recurring weekday separately. The UI distinguishes recommendations from recorded facts, and reports show source period, calculation time and material limitations.

## Capacity history

Availability-rule changes, override changes, onboarding hours and staff lifecycle changes capture minimal, versioned schedules. Breaks, overlapping rules, inactive staff, custom hours and days off contribute to capacity. Snapshots contain identifiers only internally; they are not sent to the model. Significant source changes retain their existing audit records.

Historical days use the latest schedule recorded by that day's end. A day before the first complete recorded baseline has unknown capacity. Today and future dates use the current schedule. These are recorded planned hours, not employee attendance; mid-day changes use the day's final recorded plan. Changing a past override now does not rewrite an earlier saved report. This deliberate snapshot policy avoids claiming reconstructed attendance from mutable settings.

Queries are bounded to 366 days, 10,000 bookings per period, 200 staff, 300 services and 2,000 schedule versions. Returning-client analysis additionally requires complete recorded visit history within its 10,000 completed-booking bound; shortening the period does not reduce that historical requirement. Above these limits the assistant reports unavailable analysis rather than using a partial sample. If tenant volumes grow, add transactionally maintained daily aggregates and a first-visit index before increasing these caps.

## Data boundaries and privacy

Identity and tenant are derived server-side from Better Auth and active staff membership. Every tenant table read begins with a named organization index, or an ID lookup followed by an explicit tenant/owner check. Scheduled workers recheck the author's current role, membership, plan eligibility and conversation ownership before reads and provider calls, and before publishing an answer. The Free assistant allowance does not unlock the Pro analytics workspace or client directory.

The provider receives the user's question, a short conversation context, studio/staff/service names and bounded aggregate reports. Customer profiles, contact details, appointment notes, raw bookings and database identifiers are not added to its context. Text that users type into a question is still sent to the provider; the application does not claim to redact arbitrary user-entered personal information.

Responses use `store: false` and do not use provider-hosted conversation state. This does not itself constitute zero data retention; account-level provider retention and processing terms still apply. Conversation text, model usage and report snapshots live in tenant-scoped Convex tables. Conversations are private to their author. `analyst_turns` is the message/action record for this feature; customer-facing `ai_messages` remains separate.

Numeric statements must reference server-generated facts, such as `[[r1.total]]`. The server rejects unknown report/fact references and unverified numerical literals, then resolves the values before persistence. This limits fabricated arithmetic; it does not make the model's qualitative interpretation infallible. Relevant report limitations remain visible independently of model wording.

## Validation and rollout

### Assistant workspace

`/beauty/assistant` uses the OPUS Chat layout: a collapsible conversation sidebar,
search over the existing saved-history list, and a focused conversation with a
docked composer. On phones, history and the account menu open in a dialog.
The welcome view offers starter questions; existing conversations still reopen
automatically. Fast analysis, allowances, pending/error states, full
reports, and saved history are available to both plans. Free studios see their
remaining Fast allowance, a disabled Detailed option marked Pro, and an upgrade
link after reaching the allowance. The overview widget opens the real assistant
for both plans.
The studio's selected Clarity/Studio appearance applies throughout.

`components/business-assistant/AssistantChatWorkspace.tsx` is shared with the
01 Chat design preview at `/dashboard-preview/assistant/designs?variant=chat`.
All three design variants and their canvas route remain localhost-only,
development-only fixtures. The actual assistant uses authenticated Convex data;
the design previews use sample conversations and never call the provider.

### Response presentation

Answers stream from the provider through the existing private Convex conversation.
During generation, the chat shows whole-word text updates and a writing indicator.
The server decodes only the answer text, holds unfinished fact references, and
applies the existing numeric-fact checks before publishing each preview. JSON,
tool arguments and unverified numeric literals are never rendered.
Reports, recommendations and follow-ups appear only after full-answer validation.
Partial text is cleared on retries, completion, failures and lease expiry.
Permission and plan checks also apply to stream updates. Streams retain the same
single prompt reservation and final usage accounting; a failed stream refunds
the prompt and retains known or conservative provider cost.

Text updates are batched at most every 200 ms, with at most 50 updates per turn,
to bound database writes. No artificial typing delay is added to live responses.
Streamdown renders both partial and completed prose in the same mounted component,
with short word fades while streaming. Long answers remain fully visible on
completion. Before the first text, a subtle shimmer shows the review status;
the caret takes over once text arrives. Word fades, the caret and report
transitions respect reduced motion. Partial text is not announced to screen
readers on every update. Saved completed answers open immediately.
Model prose supports basic Markdown formatting without loading images or creating
links; figures and charts still use the validated structured reports.
The existing Message Scroller anchors the question, follows new content until the
reader scrolls away, and offers a keyboard-accessible jump-to-latest button.
Completed answers have Copy and Full report actions, followed by a horizontally
scrollable suggestion row. Suggestions fill and focus the composer for review;
they do not spend a prompt until submitted. The compact composer grows with text
and allows drafting during generation while sending and mode changes are locked.
The response gallery includes a replayable long, formatted streaming example.

Responses now choose a visual from the question and the saved report shape:
a single number, a period comparison, a daily trend, a ranked list, a percentage
indicator, or an empty/unavailable explanation. Template selection is deterministic
and supports English, Macedonian and Albanian question cues. It does not require
an additional model call or alter saved report schemas. Plain answers remain
plain text, and recommendations use a separate suggested-experiment block.

The chat leads with the complete answer and its first cited report. Supporting
reports can be expanded in chat. “Data & calculation,”
including full tables, calculation timestamps and detailed methodology, appears
only in the full report. Open it from the small ellipsis menu in a chat report's
header. Period/filter scope and concise data caveats stay visible in chat,
including unique caveats from collapsed supporting reports. Percentage comparisons
use percentage points; money across different currencies never gets a combined
comparison or delta.

`lib/assistant-report-presentation.ts` owns selection and safe preview rows.
Conversation snapshots still contain at most seven rows per report, but ranking
previews choose leaders from the full saved snapshot before truncation, and
trends explicitly show the latest seven date groups. The query includes original
row counts. Original saved row order and fact references remain intact.
Frontend code talking to an older backend falls back to a summary for compact
rankings/trends without that metadata. Deploy the compatible backend query before
the frontend to enable those compact visuals; no deployment is implied by the
local preview. New provider answers are also prompted to lead concisely rather
than enumerate all report rows.

### Local response design gallery

With the dashboard development server running, open
`http://localhost:3000/dashboard-preview/assistant`. This localhost-only route
returns 404 outside development, as does its `/canvas` child route. It needs no
studio sign-in or analyst provider configuration.

The gallery starts with representative response templates and uses fictional,
fixed snapshots for all ten report metrics, multiple
reports and recommendations, long tables/labels, missing data, currency caveats,
and conversation loading, empty, progress and error states. Switch between chat
responses and expanded reports, Clarity/Studio appearance, English/Macedonian,
and actual desktop/tablet/phone iframe widths. The report's ellipsis menu opens
the full report inside the preview. Suggested questions and retries fill the real
composer; submitting it only displays the selected prompt locally.

Edit `components/business-assistant/AnalysisReport.tsx` and `ReportVisual.tsx`
for reports, and `components/business-assistant/AssistantResponse.tsx` for answer,
supporting-report and recommendation layout. `ConversationPanel.tsx` composes
these inside the conversation.
These components are shared with the real assistant, so design edits appear in
both. Fixtures live in `app/dashboard-preview/assistant/_lib/examples.ts`.
The gallery does not query studio data, request model answers, or write records.

Focused checks:

```sh
cd opus-dashboard
npx vitest run tests/analyst/metrics.test.ts tests/convex/business-assistant.test.ts
npx tsc --noEmit
```

The focused suite covers dates and leap years, prices and bundles, missing capacity, weekday normalization, repeat visits, tenant isolation, permission revocation, duplicate requests, quota/cost reservation, expiry, saved-report immutability and mocked provider responses. Provider mocks never exercise real model quality or latency.

Before enabling for paying studios, run a staging evaluation against seeded known booking histories in Macedonian and English. Include weakest dates versus weekdays, counts versus rates, month boundaries, no bookings, unknown opening history, incomplete months, multiple currencies, duplicate staff names, combined services, repeating customers, requests for profit, prompt injection and attempted cross-studio reads. Verify the selected metric and period, evidence fidelity, caveats, useful recommendations, latency and actual spend. Keep the flag disabled until those provider-backed results are acceptable; no production model-quality evaluation is recorded by this implementation.

### Implementation verification — 16 September 2026

- 70 tests passed across the assistant metrics/worker suites and the existing paid-plan, quick-booking and hardening suites.
- Assistant ESLint checks and application TypeScript checks passed. The application-only type pass excluded test files using a temporary configuration; the repository configuration was not changed.
- Next.js production compilation passed with `--experimental-build-mode compile`; this is compilation, not a completed deployment build.
- The actual UI components were exercised with local mock data at desktop and 390-pixel mobile widths. Prompt selection, Enter-to-send, history/new chat, English/Macedonian labels and report layout were checked. This was not an authenticated live-provider test.
- Full repository validation still encounters the existing `booking-email-flow.test.ts` undefined-phone type error and an activation test that attempts to add a second owner on the Free plan. Those unrelated fixtures were preserved.
- No production deployment or live provider evaluation was performed.
