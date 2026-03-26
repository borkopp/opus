---
name: payments-payouts
description: Covers Braintree/PayPal integration, transaction lifecycle, split payout logic, and webhook handling in Omni-Service OS. Use when writing code that creates transactions, processes Braintree webhooks, calculates payout splits, or initiates transfers to staff and owner PayPal accounts.
---

# Payments & Payouts

All payment processing goes through **Braintree** (owned by PayPal). Braintree is used because Stripe is not available in Macedonia, the operator's country. The platform earns its fee by being a recipient in the split payout config — no separate invoicing needed.

## Why Braintree

- Available in Macedonia and across Europe
- Supports marketplace payments with split payouts via PayPal Referenced Payouts
- Customers can pay via card, PayPal, or local payment methods
- Staff and owners receive payouts to their PayPal accounts

## Environment variables required

```
BRAINTREE_MERCHANT_ID=...
BRAINTREE_PUBLIC_KEY=...
BRAINTREE_PRIVATE_KEY=...
BRAINTREE_ENVIRONMENT=sandbox   # change to production when live
BRAINTREE_WEBHOOK_SECRET=...    # used to verify webhook notifications
```

## SDK setup

Always initialise the Braintree gateway in a shared module, never inline:

```typescript
// convex/lib/braintree.ts
"use node";
import braintree from "braintree";

export const gateway = new braintree.BraintreeGateway({
  environment:
    process.env.BRAINTREE_ENVIRONMENT === "production"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID!,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
});
```

Note: Braintree SDK requires Node.js — always add `"use node";` to any file that imports it. Never import this in a file that also exports queries or mutations.

## Key tables

| Table | Purpose |
|---|---|
| `payment_intents` | Mirrors a Braintree Transaction — updated by webhooks. The field `stripePaymentIntentId` is repurposed as `providerTransactionId` (Braintree transaction ID). |
| `payout_splits` | Config defining how a payment is divided (e.g. 70/20/10) |
| `payouts` | Ledger of individual money movements — one row per recipient. `stripeTransferId` is repurposed as `providerTransferId` (PayPal payout batch item ID). |

## Schema field remapping

The schema uses `stripeAccountId` / `stripeConnectedAccountId` / `stripePaymentIntentId` / `stripeTransferId` as field names. These map to Braintree/PayPal as follows:

| Schema field | Braintree/PayPal equivalent |
|---|---|
| `stripeAccountId` on `orgs` | Braintree merchant sub-account ID |
| `stripeConnectedAccountId` on `staff_members` | Staff member's PayPal email address |
| `stripePaymentIntentId` on `payment_intents` | Braintree transaction ID |
| `stripeClientSecret` on `payment_intents` | Braintree client token |
| `stripeTransferId` on `payouts` | PayPal Payouts batch item ID |

Do not rename schema fields for MVP — treat them as provider-agnostic identifiers in the code.

## Payment lifecycle

```
created (client_token issued)
  → submitted_for_settlement  (card charged)
  → settling
  → settled                   ← trigger payout split here
  → failed / voided
```

Only trigger payout splits when the Braintree transaction status is `settled`. Never trigger on `submitted_for_settlement` — funds are not yet available.

## Creating a transaction (Action)

Always create transactions in a Convex **Action** with `"use node"`, never in a mutation. After Braintree responds, write to `payment_intents` via an internal mutation.

**Step 1 — Generate a client token** (called when the booking page loads):

```typescript
// convex/payments/getClientToken.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { gateway } from "../lib/braintree";
import { internal } from "../_generated/api";

export const getClientToken = action({
  args: { orgId: v.id("orgs") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(internal.orgs.getById, { orgId: args.orgId });
    if (!org?.stripeAccountId) throw new ConvexError("Org has no payment account configured.");

    const response = await gateway.clientToken.generate({
      merchantAccountId: org.stripeAccountId,
    });
    return response.clientToken;
  },
});
```

**Step 2 — Create the transaction** (called after customer submits payment nonce from Braintree Drop-in UI):

```typescript
// convex/payments/initiateDeposit.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { gateway } from "../lib/braintree";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

export const initiateDeposit = action({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    customerId: v.id("customers"),
    amountMinorUnits: v.number(),
    currency: v.string(),
    paymentMethodNonce: v.string(),      // from Braintree Drop-in UI on the frontend
  },
  returns: v.object({ transactionId: v.string(), status: v.string() }),
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(internal.orgs.getById, { orgId: args.orgId });
    if (!org?.stripeAccountId) throw new ConvexError("Org has no payment account configured.");

    // Braintree uses decimal amounts, not minor units
    const amountDecimal = (args.amountMinorUnits / 100).toFixed(2);

    const result = await gateway.transaction.sale({
      amount: amountDecimal,
      paymentMethodNonce: args.paymentMethodNonce,
      merchantAccountId: org.stripeAccountId,
      orderId: args.bookingId,           // traceable reference
      options: {
        submitForSettlement: true,        // charge immediately
      },
    });

    if (!result.success) {
      throw new ConvexError(
        result.message ?? "Payment failed. Please try again."
      );
    }

    await ctx.runMutation(internal.payments.recordPaymentIntent, {
      orgId: args.orgId,
      bookingId: args.bookingId,
      customerId: args.customerId,
      providerTransactionId: result.transaction.id,
      clientToken: "",                   // not needed post-transaction
      amountMinorUnits: args.amountMinorUnits,
      currency: args.currency,
      status: "processing",
    });

    return {
      transactionId: result.transaction.id,
      status: result.transaction.status,
    };
  },
});
```

## Braintree webhook handler

Webhooks arrive at `app/api/braintree/webhook/route.ts`. Always verify the signature before processing.

```typescript
// app/api/braintree/webhook/route.ts
import { gateway } from "@/convex/lib/braintree";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const body = await req.formData();
  const btSignature = body.get("bt_signature") as string;
  const btPayload = body.get("bt_payload") as string;

  // Verify webhook authenticity
  let notification: braintree.WebhookNotification;
  try {
    notification = await gateway.webhookNotification.parse(btSignature, btPayload);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (notification.kind) {
    case braintree.WebhookNotification.Kind.TransactionSettled:
      await convex.action(api.payments.handleTransactionSettled, {
        providerTransactionId: notification.transaction?.id ?? "",
      });
      break;

    case braintree.WebhookNotification.Kind.TransactionSettlementDeclined:
      await convex.action(api.payments.handleTransactionFailed, {
        providerTransactionId: notification.transaction?.id ?? "",
        reason: notification.transaction?.processorSettlementResponseText ?? "Settlement declined",
      });
      break;
  }

  return new Response("ok", { status: 200 });
}
```

## Split payout execution

When a transaction settles, read the `payout_splits` config and disburse funds to each recipient via the **PayPal Payouts API**. The platform share stays in the merchant account — no transfer needed.

```typescript
// convex/payments/handleTransactionSettled.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

export const handleTransactionSettled = action({
  args: { providerTransactionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.runQuery(internal.payments.getByProviderId, {
      providerTransactionId: args.providerTransactionId,
    });
    if (!intent) throw new ConvexError("Transaction not found.");
    if (intent.status === "succeeded") return null; // idempotency guard

    const booking = await ctx.runQuery(internal.bookings.getById, {
      bookingId: intent.bookingId!,
    });
    const splitConfig = await ctx.runQuery(internal.payouts.getSplitConfig, {
      orgId: intent.orgId,
      serviceId: booking?.serviceId,
    });

    // Build PayPal Payouts batch (excludes platform recipient)
    const payoutItems = splitConfig.recipients
      .filter((r) => r.type !== "platform" && r.stripeAccountId) // stripeAccountId = PayPal email
      .map((r) => ({
        recipient_type: "EMAIL",
        amount: {
          value: (Math.round(intent.amountMinorUnits * r.sharePct / 100) / 100).toFixed(2),
          currency: intent.currency.toUpperCase(),
        },
        receiver: r.stripeAccountId,     // PayPal email of recipient
        note: `Payout for booking ${intent.bookingId}`,
        sender_item_id: `${intent.bookingId}_${r.type}_${r.staffId ?? "owner"}`,
      }));

    if (payoutItems.length === 0) {
      // No external recipients — just mark as succeeded
      await ctx.runMutation(internal.payments.updatePaymentIntentStatus, {
        providerTransactionId: args.providerTransactionId,
        status: "succeeded",
        succeededAt: Date.now(),
      });
      return null;
    }

    // Call PayPal Payouts API
    // Use node-fetch or the @paypal/payouts-sdk package
    const paypalResponse = await createPayPalPayoutBatch(payoutItems, intent.bookingId!);

    // Record each payout row
    for (const item of paypalResponse.items) {
      const recipient = splitConfig.recipients.find(
        (r) => `${intent.bookingId}_${r.type}_${r.staffId ?? "owner"}` === item.sender_item_id
      );
      await ctx.runMutation(internal.payouts.recordPayout, {
        orgId: intent.orgId,
        bookingId: intent.bookingId!,
        paymentIntentId: intent._id,
        recipientType: recipient!.type,
        staffId: recipient!.staffId,
        connectedAccountId: recipient!.stripeAccountId!,
        amountMinorUnits: Math.round(intent.amountMinorUnits * recipient!.sharePct / 100),
        currency: intent.currency,
        providerTransferId: item.payout_item_id,
        status: "in_transit",
      });
    }

    await ctx.runMutation(internal.payments.updatePaymentIntentStatus, {
      providerTransactionId: args.providerTransactionId,
      status: "succeeded",
      succeededAt: Date.now(),
    });

    return null;
  },
});
```

## Payout split validation

Always validate before saving a `payout_splits` config:

```typescript
const total = recipients.reduce((sum, r) => sum + r.sharePct, 0);
if (total !== 100) throw new ConvexError("Payout split percentages must sum to 100.");
```

## Idempotency

Braintree webhooks can fire multiple times. Always guard:
- Check `payment_intents.status === "succeeded"` before running split logic — return early if already processed
- Check if `payouts` rows already exist for the `bookingId` before creating new ones
- Use `sender_item_id` in PayPal Payouts batch (set to `bookingId_recipientType_staffId`) to make individual transfers traceable

## Frontend: Braintree Drop-in UI

On the public booking page, replace Stripe Elements with the Braintree Drop-in UI:

```typescript
// In your booking page component
import dropin from "braintree-web-drop-in";

const { clientToken } = await convex.action(api.payments.getClientToken, { orgId });

const dropinInstance = await dropin.create({
  authorization: clientToken,
  container: "#dropin-container",  // a div in your JSX
});

// On form submit:
const { nonce } = await dropinInstance.requestPaymentMethod();
await convex.action(api.payments.initiateDeposit, {
  orgId,
  bookingId,
  customerId,
  amountMinorUnits: depositAmount,
  currency: "GBP",
  paymentMethodNonce: nonce,
});
```

## Important rules

- Never store card details anywhere — Braintree handles PCI compliance
- The platform recipient (`type: "platform"`) never gets a PayPal transfer — its share stays in the Braintree merchant account
- All Braintree and PayPal API calls go in **Actions** with `"use node"` — never in mutations
- Always write an `audit_log` entry after a payout row is created or a status changes
- Currency: stored as uppercase in DB (`"GBP"`), passed to PayPal as uppercase, passed to Braintree as a decimal string (`"25.00"` not `2500`)
- Braintree uses decimal amounts — always divide `amountMinorUnits / 100` before passing to Braintree
- Never mix up minor units (Convex DB) and decimal amounts (Braintree API) — convert at the boundary only