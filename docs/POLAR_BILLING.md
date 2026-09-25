# OPUS subscription billing with Polar

This integration sells the existing **monthly OPUS Pro subscription**. It does
not sell AI credits, SMS credits, yearly plans, appointment payments, or payments
on behalf of studios. The Free plan remains available without a payment method.

## Customer journey

Studio owners open **Settings → Subscription**, or select OPUS Pro in their
account menu. Subscribe opens a hosted Polar checkout. The price and taxes are
shown before the owner confirms payment. Manage billing opens an authenticated
Polar customer portal for invoices, payment methods, and cancellation.

The return URL does not activate Pro. A signed webhook durably schedules a
provider lookup; only a current `active` subscription for the studio's configured
Pro product and an unexpired period enables `orgs.plan = "paid"`. Owners can also
refresh status to recover from delayed events. Existing manually enabled Pro
studios are preserved and are not automatically enrolled or charged.

## Configure the sandbox first

1. Create a dedicated user and organization at
   [Polar Sandbox](https://sandbox.polar.sh). Production credentials and products
   do not work there. Use a separate local/development Convex deployment; do not
   change the production deployment to sandbox mode.
2. Create one fixed-price, monthly product for OPUS Pro: every **1 month**, with
   **MKD** pricing. The current landing offer is **1,190 MKD/month**; in API minor
   units that is **119000**. Use tax-inclusive pricing, matching production, and
   verify that the checkout total matches the advertised price. No trial, usage
   meters, credits, seat billing, or one-time product is used by this integration.
3. In Polar's subscription settings, turn **Allow multiple subscriptions off**.
   The checkout action verifies this setting. Keep customer plan switching and
   pauses disabled for this single-plan launch.
4. Create an organization access token with the required scopes:
   `checkouts:read`, `checkouts:write`, `products:read`, `organizations:read`,
   `subscriptions:read`, and `customer_sessions:write`.
5. Set the following variables on the **Convex deployment**, through its
   dashboard or `npx convex env set`. Putting them only in Vercel or a Next.js
   `.env.local` does not configure Convex actions. Never use `NEXT_PUBLIC_`.

   ```dotenv
   POLAR_ENABLED=true
   POLAR_SERVER=sandbox
   POLAR_ACCESS_TOKEN=<organization access token>
   POLAR_PRO_PRODUCT_ID=<monthly Pro product ID>
   POLAR_WEBHOOK_SECRET=<webhook signing secret>
   SITE_URL=http://localhost:3000
   ```

6. Add a **Raw** webhook endpoint at:

   ```text
   https://<your-development-deployment>.convex.site/webhooks/polar
   ```

   For the local Convex backend, run `npm run dev` from `opus-dashboard` and
   expose port **3211** through a public HTTPS tunnel. Register
   `https://<your-tunnel-host>/webhooks/polar` in the sandbox organization.
   The webhook runs in Convex, not the Next.js frontend on port 3000. Keep the
   tunnel running during tests. Polar also documents its
   [local webhook forwarding tool](https://polar.sh/docs/integrate/webhooks/locally);
   if using that tool, select the sandbox environment/organization and use its
   signing secret for the development Convex deployment.

7. Use webhook API version **2026-04** and subscribe to
   `customer.state_changed`, `customer.deleted`,
   `subscription.created`, `subscription.updated`, `subscription.revoked`,
   `subscription.past_due`, `order.paid`, and `order.refunded`.
   Additional active/canceled/uncanceled/paused/resumed events are safe but not
   required when `subscription.updated` is enabled.

New Standard Webhooks secrets and Polar's legacy HMAC secrets are both verified
with the Standard Webhooks library. The legacy verifier in SDK 0.49 is deliberately
not used: it only supports the older signing format. Signatures cover the raw
body, delivery ID, and a timestamp within five minutes.

The server chooses the product, studio identity, owner email, MKD currency, and
return URLs. Browser input cannot choose a tenant, price, product, or portal
customer. A Polar customer is keyed by the studio's server-derived external ID,
not matched by email. Review multi-studio owners in sandbox: Polar's customer
email uniqueness rules may require separate billing email arrangements; never
merge two studios' billing customers to work around that restriction.

## Subscription lifecycle

- `active` with a future period end: Pro access.
- Scheduled cancellation: access continues while the status is active and the
  confirmed paid period has not ended.
- `past_due`, `unpaid`, `paused`, `canceled`, `incomplete`, or `trialing`: Free
  access. This version intentionally provides no trial or payment-failure grace
  period. The portal remains available to update payment details.
- Refunds trigger a fresh subscription lookup. A refund is not interpreted as
  cancellation: for example, a partial refund must not revoke an active plan.
  If access should end, revoke the subscription in Polar as well.
- A scheduled expiry removes access at the last confirmed period end and starts
  reconciliation, so missed events cannot leave Pro enabled indefinitely. A
  confirmed renewal supersedes the old expiry job.

Webhook receipts are deduplicated by studio and delivery ID. Each reconciliation
has a version; a slower worker cannot overwrite a newer one. The worker reads all
subscription-history pages and prioritizes an active subscription, so an old
cancellation cannot revoke a replacement subscription. API failures preserve the
last confirmed state until expiry and retry with backoff up to eight times. An
exhausted retry is visible in billing settings; owner refresh can restart it.

All subscription state and receipts are tenant-indexed. Plan changes and checkout
creation are recorded in the append-only audit log. No card details are stored.

## Production activation

Use a separate production Polar organization/environment and Convex deployment.
Do not switch a sandbox billing account to production in the same database;
the environment check intentionally rejects that reuse.

Complete Polar's merchant/payout review and confirm the accepted product scope.
Create the production monthly product and webhook, then set the production
credentials, `POLAR_SERVER=production`, and `SITE_URL=https://studio.opus.mk`.
Keep `POLAR_ENABLED=false` until the sandbox checks below are verified. That flag
only stops new checkout; existing reconciliation and portal access remain usable.

Keep the product ID stable. Change the price of the existing product in Polar
when appropriate; do not replace the environment variable with a different
product without a deliberate subscription migration.

### Production account setup recorded September 25, 2026

The `opus-mk` Polar organization now has a private **OPUS Pro** product at
**1,190 MKD every month**, without a trial. Its product ID is
`76a4e725-6d5d-43ae-b84b-8e76ac403b6f`. The organization country is North
Macedonia and the customer support address is `hello@opus.mk`.
The saved settings were verified through Polar's API: tax-inclusive pricing,
multiple subscriptions disabled, and portal usage, seat management, plan changes,
and pausing disabled.

The production Convex deployment is `calm-dachshund-294`. It contains the
production product ID, `POLAR_SERVER=production`, an organization access token
with the six scopes listed above, and the matching webhook secret. Credentials
are stored only in the server environment, not in this repository. The token is
named **OPUS production subscriptions** and has no expiration.

The Raw webhook uses API version **2026-04** and the eight events listed above:

```text
https://calm-dachshund-294.convex.site/webhooks/polar
```

Its Polar endpoint ID is `a0c9a736-0538-4717-a875-8488d45d587f`.

**Deployed with new checkout disabled:** `POLAR_ENABLED=false`. Polar's account
screen showed **Account approved**, **Identity verified**, and the connected
payout account. The dashboard and Convex backend were deployed on September 25,
2026, with Vercel deployment `dpl_A5mkJUtcLLmDARh6MMdwVupgDnn5` ready and aliased
to `https://studio.opus.mk` and `https://*.opus.mk`.

Live smoke checks passed: the webhook returned HTTP **200** for a valid signed
synthetic event with no matching studio, and **401** for unsigned and expired
signatures. The production login returned **200**, subscription settings
redirected unauthenticated requests to login, and `/dashboard-preview` remained
**404**. The synthetic event changed no studio's plan and did not exercise a
real Polar delivery, checkout, or payment.

Release checks passed: 406 tests (one skipped), frontend and Convex type checks,
lint, and the production build. After correcting a Convex-specific headers type
error caught by the first deployment attempt, all 36 billing tests and the
backend type check passed again; the replacement deployment succeeded.

The production API token was verified against the real monthly product. The
sandbox connection below is now configured and its checkout opens from OPUS.
Hosted payment, portal, and authenticated Pro activation tests are still needed
before enabling new live subscriptions.

### Sandbox setup recorded September 25, 2026

The sandbox organization is **OPUS MK Sandbox** (`opus-mk`), ID
`b14a1c96-55e9-47cd-9c82-ebb317b6d2b6`. Its private **OPUS Pro** product is
`1fcb24bd-9343-4e6b-897e-230ed69f7a4c`: fixed **1,190 MKD every month**, no trial.
The saved API settings confirm inclusive tax, one subscription per customer,
and disabled portal usage, seats, plan switching, and pauses.

The local Convex deployment `local-borko_petrevski-opus` has
`POLAR_ENABLED=true`, `POLAR_SERVER=sandbox`, this sandbox product ID, its own
access token and webhook secret, and `SITE_URL=http://localhost:3000`.
The six-scope token **OPUS sandbox subscriptions** expires on **October 25,
2026**. Secrets are stored in the local backend environment, not repository files.
Production remains on its separate credentials with checkout disabled.

The enabled Raw webhook uses API version **2026-04**, the eight events above,
and endpoint ID `e4a570a8-2fa8-4bdf-ad50-3ce5817f4399`:

```text
https://nell-archiblastic-paly.ngrok-free.dev/webhooks/polar
```

This forwards to the local Convex HTTP server on port **3211**. The tracked
`opus-dashboard/scripts/polar-sandbox-ngrok.yml` policy exposes only
`POST /webhooks/polar`; all other paths and methods return 404. Request inspection
is disabled in ngrok. The public endpoint returned 200 for a valid signed
synthetic event and 401 for an unsigned request. These probes did not change a
studio or represent an actual Polar payment.

The existing local Free studio successfully opened the hosted sandbox checkout
from **Settings → Subscription**, with **1,190 MKD/month** displayed. The card
form was left ready for the owner's test payment; no payment was submitted and
Pro activation has not yet been verified end to end.

The local frontend, Convex backend, and tunnel must remain running during
checkout and webhook testing. To restart them, run each command in a separate
terminal from `opus-dashboard`:

```sh
npm run dev:backend -- --tail-logs=disable
```

```sh
npm run dev:frontend
```

```sh
ngrok http http://127.0.0.1:3211 \
  --url https://nell-archiblastic-paly.ngrok-free.dev \
  --traffic-policy-file scripts/polar-sandbox-ngrok.yml \
  --inspect=false
```

If ngrok assigns a different URL, update this sandbox webhook endpoint in Polar.
The one-time local Convex dashboard used to save credentials is not needed for
checkout. Start testing at `http://localhost:3000/settings?tab=billing`.

## Validation

Run `npm test -- tests/convex/billing.test.ts` from `opus-dashboard`, and check
backend types with `npx tsc --noEmit -p convex/tsconfig.json`. Convex has its own
TypeScript configuration, so the frontend type check alone is insufficient.
The automated suite uses a mocked Polar client plus real webhook
signing/verification. It covers
owner permissions, tenant/customer separation, checkout reuse, configuration
guards, activation, cancellation, failed payments, renewal, stale updates,
idempotent receipt handling, provider failures, refunds, and expiry.

### Hosted checkout and Pro activation checklist

The sandbox setup above must be completed first; production setup does not
create a test environment. Sign in to the development OPUS app as the owner of
a **Free** studio. A studio with manually granted Pro intentionally has no
subscription checkout. Use a sandbox organization member's email (or its `+test`
alias) if you also want to receive Polar's test emails.

Start from **Settings → Subscription → Subscribe to Pro**
(`/settings?tab=billing`). Do not start from a standalone Polar product link:
OPUS creates the checkout with the studio's billing identity. Confirm that the
hosted checkout is on `sandbox.polar.sh`, shows **1,190 MKD/month**, and has no
trial before entering a test card.

For a successful sandbox payment use **4242 4242 4242 4242**, expiry **12/34**,
and CVC **123**. For a declined payment use **4000 0000 0000 0002** with the
same future expiry and CVC. These are sandbox-only values; do not enter real card
details. See [Polar's sandbox guide](https://polar.sh/docs/integrate/sandbox) and
[Stripe's test cards](https://docs.stripe.com/testing).

| Test | Expected result |
| --- | --- |
| Open checkout, then leave without paying | Studio stays Free. Returning to a success-looking URL alone must not activate Pro. |
| Pay with the declined card | Payment fails and the studio stays Free. Retry with the successful card. |
| Complete a successful payment | Returning to OPUS shows **OPUS Pro / Active**, the monthly amount, and the current period end. If delivery is delayed, use **Refresh status**. Reloading preserves Pro. |
| Open a Pro-only screen, such as the client directory | Access is available after activation; confirm an actual operation as well as the badge. |
| Open **Manage billing** | The portal shows this studio's subscription, invoices, and payment method. Download the invoice and check its MKD total/tax breakdown. |
| Repeat Subscribe in two tabs or double-click | No second active subscription or duplicate charge is created. Existing checkout/subscription is reused or rejected. |
| Cancel through the customer portal at period end | OPUS shows **Access until** and keeps Pro until that date. It must not downgrade immediately. |
| Undo the scheduled cancellation in Polar before expiry | After reconciliation, Pro stays active and the cancellation notice disappears. |
| Revoke the subscription immediately in Polar Sandbox | OPUS returns to Free. Pro-only operations reject access; existing data and ordinary free bookings still work. |
| Partially refund an active subscription's order in Polar Sandbox | The refund alone does not remove Pro. Revoke the subscription separately when access should end. |
| Redeliver an existing webhook in Polar Sandbox | Delivery succeeds without duplicate plan changes or receipts. |
| Repeat using another studio/account | Each studio sees only its own billing portal and subscription. Non-owner staff cannot manage billing. |

In Polar Sandbox, inspect the webhook endpoint's deliveries for HTTP **2xx**.
In the development Convex dashboard, inspect the studio's `billing_accounts` row:
the customer/subscription should match Polar, `lastSyncedAt` should advance, and
`syncFailed` should be false. `orgs.plan` should change through reconciliation;
do not edit it manually to make a test pass. A scheduled cancellation's final
expiry and the next monthly renewal need their own lifecycle checks. Automated
tests cover these reconciliation rules, but are not evidence of a real provider
renewal.

After these checks pass, enable production checkout from `opus-dashboard`:

```sh
npx convex env set --prod POLAR_ENABLED true
```

This is the switch that makes the production **Subscribe to Pro** button usable.
No additional frontend deployment is needed. Leave production's server,
product ID, and credentials on their production values. To stop new checkouts,
set `POLAR_ENABLED` back to `false`; existing subscriptions still reconcile.

Local unit tests and builds do **not** establish that a Polar account, product,
credentials, webhook endpoint, payout account, or production billing is configured.

References: [Checkout API](https://polar.sh/docs/features/checkout/session),
[webhook signing and retries](https://polar.sh/docs/integrate/webhooks/delivery),
[subscription events](https://polar.sh/docs/integrate/webhooks/events), and
[customer portal](https://polar.sh/docs/features/customer-portal/introduction).
