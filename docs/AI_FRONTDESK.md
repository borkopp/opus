# Instagram AI frontdesk

The frontdesk is an opt-in capability for paid beauty studios. It uses
`gpt-6-luna` through the OpenAI Responses API, with low reasoning effort,
structured output, a maximum of four model requests per incoming message, and
no provider-side conversation storage (`store: false`). It shares no customer
data across studios. WhatsApp and the previous public web chat are not enabled.

## Studio setup

1. Open **Settings → AI front desk**.
2. Fill in **Context for the AI** with the studio's actual products/brands,
   typical treatment longevity, aftercare, removal/repair policies, and FAQs.
   Up to 12,000 characters are supported. Examples in the form are placeholders,
   not claims about the business. Services, prices and slots come from OPUS.
3. Save, then use **Try a customer question** to test the saved context. The
   preview cannot send a DM or make an appointment. Preview requests and replies
   are recorded separately from the customer inbox and consume the daily allowance.
4. Connect the studio's professional Instagram account and grant messaging access.
5. Enable the frontdesk and Instagram replies, choose the language/tone, and save.
   Optional reply hours use the studio's configured timezone; enabled schedules
   require at least one day and an away message.
6. The connection status shows whether automatic replies are ready. An enabled
   switch alone does not establish a provider connection.

The AI must ask the team when studio notes do not answer a factual question.
It must not invent brands, ingredients, treatment durability or medical safety.
Confidence below the studio threshold (at least 0.7) is withheld from the client.
A fixed handoff acknowledgement can be sent instead, and the team receives a
dashboard notification linked to the conversation.

## Platform configuration

Set these **on the Convex deployment**, never as `NEXT_PUBLIC_*` variables:

| Variable | Purpose |
| --- | --- |
| `AI_FRONTDESK_ENABLED=true` | Deployment-level kill switch; absent/false disables AI |
| `AI_FRONTDESK_OPENAI_API_KEY` | Dedicated OpenAI key; existing `OPENAI_API_KEY` is a fallback |
| `AI_FRONTDESK_MODEL=gpt-6-luna` | Optional explicit override; defaults to Luna |
| `AI_FRONTDESK_DAILY_REPLY_LIMIT=500` | Optional operational cost ceiling per studio per UTC day, including previews; not a marketed plan allowance |
| `INSTAGRAM_APP_ID` | Instagram app ID for Instagram Login |
| `INSTAGRAM_APP_SECRET` | Corresponding secret for OAuth and webhook signature verification |
| `INSTAGRAM_GRAPH_VERSION` | Supported version selected in the Meta app, in `vNN.N` format |
| `INSTAGRAM_REDIRECT_URI` | Exact registered callback: `https://<deployment>.convex.site/instagram/callback` |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | A random webhook verification secret |
| `FRONTDESK_TOKEN_SECRET` | Stable random secret of at least 32 characters for encrypted Instagram tokens |
| `SITE_URL` | Dashboard URL for the OAuth return, normally `https://studio.opus.mk` |

Configure **Instagram API with Instagram Login**, using
`instagram_business_basic` and `instagram_business_manage_messages`. Register the
exact redirect URI and the webhook callback
`https://<deployment>.convex.site/webhooks/instagram`. The verify token must match
the Convex variable. Subscribe to `messages`; connecting a studio also subscribes
its account via `subscribed_apps`. Complete Meta's required access/review steps
before onboarding accounts outside the app's test roles.

The old Next.js `/api/instagram/webhook` URL forwards exact signed bytes to Convex
and waits for durable ingestion, so an existing callback can migrate gradually.
The old Facebook Page token and editable branding Page ID are **not** used for
authorization or routing. Each studio must connect using Instagram Login.

Tokens are encrypted with AES-256-GCM, never returned to a browser query, and
refreshed on a scheduled action after 45 days. Refresh failures retry up to three
times while the current token is still valid; exhausted retries require
reconnection. Changing the encryption secret requires reconnecting accounts.
Disconnecting clears local credentials and stops routing and sends; it does not
revoke the app from the user's Instagram account settings.

Provider references: [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[Responses function calling](https://developers.openai.com/api/docs/guides/function-calling),
[Meta's Instagram Login collection](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login),
[Meta's text-message endpoint](https://www.postman.com/meta/instagram/request/1rgmhuk/text-message),
and [Instagram Login configuration](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login).

## Booking and handoff behavior

- Only signed Meta events can enter customer conversations. Incoming message IDs
  are deduplicated within the studio. Account IDs are resolved through the
  verified organization-root index; all subsequent tenant reads use `orgId`.
  The same Instagram sender can have separate conversations with two studios.
- Messages are persisted before Meta receives a successful HTTP response.
  A transactional lease processes each conversation in order. A scheduled
  watchdog hands stalled work to the team instead of leaving it silently stuck.
- The model sees service and slot references, never raw database IDs. Booking
  preparation sends a server-generated summary with service, staff, local time,
  price, name and phone. The slot is **not held** at this point.
- A separate standalone `Confirm`/`Yes` or `Потврдувам`/`Да` response within 15
  minutes can confirm a successfully sent proposal. Qualified replies, such as
  “yes, but tomorrow”, require clarification. Availability, staff assignment,
  current price, buffers, working hours and booking window are rechecked inside
  the booking mutation. A changed price or occupied slot needs a new proposal.
- Confirmation is idempotent and writes the booking, conversation link,
  `ai_messages`, audit trail and dashboard notification atomically. It does not
  increment completed visits or opt the customer into marketing. Confirmation
  is sent through Instagram; a supplied phone does not authorize disclosure of
  existing bookings or email to an existing customer record.
- AI cannot cancel or reschedule. Questions about existing appointments are
  handed off; a phone number alone is not proof of identity.
- Human takeover stops model output. Subsequent client messages remain visible.
  Staff replies are queued in the inbox. Native Instagram reply echoes also
  pause AI. **Resume AI** applies to the next incoming message, not old backlog.
- Replies respect the standard 24-hour window after the customer's last message.
  No outbound campaigns or human-agent extensions are requested. Provider
  acceptance is labelled separately from verified delivery/read receipts.
- Unknown delivery outcomes (network timeouts, ambiguous server failures) are
  not blindly retried. The inbox asks staff to check Instagram first. A matching
  provider echo can later reconcile acceptance. Definite failures also hand off.
- Per-conversation rate limiting and daily studio allowances bound provider use.
  Downgrading the plan, disabling AI, disconnecting, or expiring a token prevents
  new automatic replies and booking writes.

## Validation and activation

### Platform setup recorded September 26, 2026

- Meta business portfolio: **OPUS.mk** (`2128135784578354`).
- Parent Meta app: **OPUS** (`1381699410331038`).
- Instagram Login app: **OPUS-IG** (`1511741730979890`). Use this Instagram
  app ID and its corresponding secret for `INSTAGRAM_APP_ID` and
  `INSTAGRAM_APP_SECRET`; the parent app ID is different.
- Production Convex deployment: `calm-dachshund-294`. The Instagram app ID,
  app secret, `INSTAGRAM_GRAPH_VERSION=v26.0`, redirect URI, webhook verify
  token, and token-encryption secret are saved and verified there. Secret
  values are not stored in the repository.
- Registered OAuth redirect:
  `https://calm-dachshund-294.convex.site/instagram/callback`.
- Registered webhook:
  `https://calm-dachshund-294.convex.site/webhooks/instagram`.
  Meta accepted verification and reported a successful synthetic `messages`
  webhook test using v26.0. This verifies the test request path, not real DM
  ingestion, an AI response, or a booking.
- `instagram_business_basic` and `instagram_business_manage_messages` are
  added with **Ready for testing** status. Advanced access is not approved.
- `@opus.mk` accepted the **OPUS-IG** Instagram tester invitation. This is a
  tester role, not a connection to an OPUS studio's frontdesk.
- The app has its OPUS icon, `opus.mk` domain, privacy and terms URLs, and
  existing deletion-request instructions at `https://opus.mk/privacy#rights`.
  Meta reports that the required basic app settings are complete.

The app remains unpublished. OPUS was identified as a **Tech Provider** after
explicit user approval of Meta's irreversible classification. Meta requires
business verification, access verification, and App Review for serving other
businesses. Access verification is blocked until business verification is
complete. No verification or review was submitted.

The operator currently works as an individual without a registered business.
The North Macedonia verification form offers Sole Proprietorship, Corporation,
Partnership, Private Company, and Institution; it does not offer an unregistered
individual option. No business type was selected. Meta's
[business verification guidance](https://www.facebook.com/business/help/1095661473946872)
requires local business registration. This is a blocker for external studio
rollout, not for continuing development with the app's accepted test roles.

When legitimate registered-business details are available, resume verification
with the matching legal name, official address/phone, website, and proof of
connection to the business. Meta may request
[official business documents](https://www.facebook.com/business/help/159334372093366).
Its supported-language list does not include Macedonian; the guidance requests
English translations bearing an official translating-agency stamp for documents
in unsupported languages. Do not submit OPUS's brand name as a registered legal
entity without matching evidence.

Production has no `AI_FRONTDESK_OPENAI_API_KEY` or fallback `OPENAI_API_KEY`,
and `AI_FRONTDESK_ENABLED` is not set. Automatic AI replies remain disabled.
Remaining rollout work includes provider configuration, a deliberately selected
Pro test studio's OAuth connection, real DM and booking/handoff checks, and
Meta's approvals. Review public privacy disclosures for the actual Instagram
and AI processing before submitting for external studio access.

The deterministic tests cover signature verification, tenant isolation, duplicate
events, working hours/DST, malformed and low-confidence replies, takeover races,
delivery reconciliation, OAuth state, model/tool dispatch and atomic booking
confirmation. Run:

```sh
cd opus-dashboard
npm test
npm run typecheck
npm run lint
npm run build
```

The opt-in live Luna smoke test uses a synthetic studio and sends no Instagram
messages. It checks one grounded Macedonian answer and one unknown-ingredient
handoff:

```sh
RUN_FRONTDESK_LIVE_TEST=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/ai-frontdesk-live.test.ts
```

Before calling Instagram operational, connect a Meta test account, send an actual
incoming DM, check the recorded provider acceptance, confirm a proposed booking,
and verify the calendar and human takeover in Instagram. Mocked transport tests
and a successful Luna request do not establish that a Meta app is approved or
that a real Instagram message was sent. Deploying and activating live channels
are separate rollout steps.
