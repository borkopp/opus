# OPUS subscription billing with Polar

This integration sells the existing **monthly OPUS Pro subscription**. It does
not sell AI credits, SMS credits, yearly plans, appointment payments, or payments
on behalf of studios. The Free plan remains available without a payment method.

## Customer journey

Landing-page Pro buttons open `https://studio.opus.mk/upgrade`. Signed-out
visitors verify their email first, retaining the upgrade destination. New owners
complete the core studio setup at `/onboarding?plan=pro` (business, location,
service, and hours), then continue to `/settings?tab=billing`. The plan parameter
survives refreshes and reauthentication. Website branding and publication are not
required before subscribing. Ordinary Free onboarding is unchanged.

Existing operational studio owners go directly to Subscription. Existing Pro
owners see their current plan, and staff/managers see the owner-only billing
notice. Entering the flow does not create a checkout or change the plan; the
owner explicitly selects Subscribe before proceeding to Polar.

Studio owners open **Settings → Subscription**, or select OPUS Pro in their
account menu. Subscribe opens a hosted Polar checkout. The price and taxes are
shown before the owner confirms payment. Manage billing opens an authenticated
Polar customer portal for invoices, payment methods, and cancellation.

Choose a team package before Subscribe. Landing-page selections survive login
and onboarding. Existing subscribers change packages in Manage billing.

The return URL does not activate Pro. A signed webhook durably schedules a
provider lookup; only a current `active` subscription for one of the server-configured
Pro products and an unexpired period enables `orgs.plan = "paid"`. Owners can also
refresh status to recover from delayed events. Existing manually enabled Pro
studios are preserved and are not automatically enrolled or charged.

## Configure the sandbox first

1. Create a dedicated user and organization at
   [Polar Sandbox](https://sandbox.polar.sh). Production credentials and products
   do not work there. Use a separate local/development Convex deployment; do not
   change the production deployment to sandbox mode.
2. Create five fixed-price, monthly Pro products, each billed every **1 month**
   in **MKD**, without trials, meters, seat billing, or one-time charges:

   | Active team limit | MKD/month | API minor units | Convex environment variable |
   | --- | --- | --- | --- |
   | 4 | 1,490 | 149000 | `POLAR_PRO_PRODUCT_ID` |
   | 5 | 1,790 | 179000 | `POLAR_PRO_5_PRODUCT_ID` |
   | 6 | 2,090 | 209000 | `POLAR_PRO_6_PRODUCT_ID` |
   | 8 | 2,490 | 249000 | `POLAR_PRO_8_PRODUCT_ID` |
   | 12 | 3,290 | 329000 | `POLAR_PRO_12_PRODUCT_ID` |

   Use inclusive tax and verify the hosted total. Set each product's visibility
   to **Public** so subscribers can choose it in the customer portal. Product
   `team_limit` metadata is an administrative label; OPUS grants capacity from
   its server-side product mapping, never customer input or metadata.
3. Turn **Allow multiple subscriptions off** and **Enable subscription plan
   changes on**. Keep seat/unit management, usage, and pausing disabled. Portal
   changes follow Polar's proration settings. OPUS keeps the current limit until
   a scheduled product change is applied by Polar.
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
   POLAR_PRO_PRODUCT_ID=<4-member monthly Pro product ID>
   POLAR_PRO_5_PRODUCT_ID=<5-member monthly Pro product ID>
   POLAR_PRO_6_PRODUCT_ID=<6-member monthly Pro product ID>
   POLAR_PRO_8_PRODUCT_ID=<8-member monthly Pro product ID>
   POLAR_PRO_12_PRODUCT_ID=<12-member monthly Pro product ID>
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

The browser may select only 4, 5, 6, 8, or 12 members. The server chooses the
corresponding product, studio identity, owner email, currency, and return URLs.
It checks existing active team size and each configured product's exact monthly
MKD price before opening checkout. Polar checkout offers the configured packages;
changing the selection reuses the same open session. Browser input cannot supply
a tenant, amount, arbitrary product, capacity, or portal customer. A Polar customer is keyed by the studio's server-derived external ID,
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

Keep all five product IDs stable. Reconciliation reads subscription history
across the configured products, so changing packages retains the same studio
customer and subscription. Existing manually granted Pro studios are preserved
with their previous 12-person capacity and are never automatically charged.

### Pro team packages — October 11, 2026

The production `opus-mk` catalogue was updated in the logged-in Polar browser.
There were no subscriptions or orders on the original Pro product. Its ID was
retained for the 4-person package; four additional monthly products were created.
All five are public in the customer portal, have no trial, and include the same
Pro features. Inclusive tax and one-subscription-per-customer remain configured;
self-service plan changes are now enabled with the existing **Prorate on next
invoice** setting.

| Team limit | MKD/month | Production product ID |
| --- | --- | --- |
| 4 | 1,490 | `76a4e725-6d5d-43ae-b84b-8e76ac403b6f` |
| 5 | 1,790 | `2166a073-984e-4d5e-aceb-c61d440b260e` |
| 6 | 2,090 | `fd244a57-34fd-4536-9ce8-244e191e0e73` |
| 8 | 2,490 | `78ffea5a-f85f-49f3-8055-6ec072607db2` |
| 12 | 3,290 | `d5c7f8f6-8868-41a4-8a1d-b7dbecc68f85` |

The corresponding product variables are configured on production Convex
`calm-dachshund-294`. On inspection, production already had
`POLAR_ENABLED=true` and `POLAR_SERVER=production`; this work preserves them.
The backend and dashboard were released together on October 11, 2026, through
Vercel production deployment `dpl_EBwMvpnC5BE8Zy9CRQXD95mMsXgB`. The build published
the matching Convex functions to `calm-dachshund-294` before promoting the dashboard
at `studio.opus.mk` and `*.opus.mk`. The release started from production commit
`7f64ae5a1e37668e6efff4a36f93d9823e8533fe` and included only the dashboard/backend
team-package changes and their shared pricing contract; the separate local
dashboard styling edit and landing-page changes were excluded.

The isolated release passed 730 tests (2 skipped), frontend/backend type checks,
lint, and the production build. Production function metadata confirms checkout
accepts only 4, 5, 6, 8, or 12 members. The authenticated subscription screen loads
the new active-team counter and confirmed limit. Login and auth-session checks
passed, anonymous subscription access redirects to login, production preview
routes remain unavailable, and unsigned Polar webhooks remain rejected.
Historical setup and payment verification below predate these packages.

The sandbox catalogue and portal settings now match production. The local
`local-digilence-opus` Convex deployment uses these separate sandbox products:

| Team limit | Sandbox product ID |
| --- | --- |
| 4 | `1fcb24bd-9343-4e6b-897e-230ed69f7a4c` |
| 5 | `328a98f2-ee81-42bd-8118-0d8138a7f5e1` |
| 6 | `db411349-94ae-4b03-9d00-153066184edd` |
| 8 | `a9594764-9b5b-4e19-9dae-14a6d3be411b` |
| 12 | `2f35e792-1d4b-4a08-b6e4-1efb6b984dc8` |

The existing sandbox subscription remains at its previously purchased price.
All five selector prices and capacity counters were checked in a temporary
component preview, including 390px and 320px widths; the preview was removed.
The authenticated local subscription screen shows the provider-confirmed
4-person limit. No real payment, production checkout, or package migration was
performed as part of this update.

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
hosted checkout is on `sandbox.polar.sh`, shows the selected package's monthly
MKD price (1,490 / 1,790 / 2,090 / 2,490 / 3,290), and has no trial before entering
a test card. An existing subscription may retain its older price.

For a successful sandbox payment use **4242 4242 4242 4242**, expiry **12/34**,
and CVC **123**. For a declined payment use **4000 0000 0000 0002** with the
same future expiry and CVC. These are sandbox-only values; do not enter real card
details. See [Polar's sandbox guide](https://polar.sh/docs/integrate/sandbox) and
[Stripe's test cards](https://docs.stripe.com/testing).

| Test | Expected result |
| --- | --- |
| Open checkout, then leave without paying | Studio stays Free. Returning to a success-looking URL alone must not activate Pro. |
| Repeat checkout for each of the five packages | The monthly price matches the selection; only a verified active subscription grants its 4 / 5 / 6 / 8 / 12 team limit. |
| Change package through the customer portal | OPUS follows the confirmed product. A pending change retains the current limit until Polar applies it. A downgrade preserves existing staff and blocks additions above the new limit. |
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
