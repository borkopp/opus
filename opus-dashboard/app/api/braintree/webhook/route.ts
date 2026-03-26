import { getGateway } from "@/convex/lib/braintree";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    const body = await req.formData();

    const btSignature = body.get("bt_signature") as string;
    const btPayload = body.get("bt_payload") as string;

    if (!btSignature || !btPayload) {
        return new Response("Missing signature or payload", { status: 400 });
    }

    const gateway = getGateway();

    // Verify webhook authenticity
    let notification: any;
    try {
        notification = await gateway.webhookNotification.parse(btSignature, btPayload);
    } catch (error) {
        console.error("Webhook signature verification failed.", error);
        return new Response("Webhook verification failed", { status: 400 });
    }

    try {
        switch (notification.kind) {
            case "transaction_settled":
                await convex.action(api.payments.handleTransactionSettled.handleTransactionSettled, {
                    providerTransactionId: notification.transaction?.id ?? "",
                });
                break;

            case "transaction_settlement_declined":
                await convex.action(api.payments.handleTransactionFailed.handleTransactionFailed, {
                    providerTransactionId: notification.transaction?.id ?? "",
                    reason: notification.transaction?.processorSettlementResponseText ?? "Settlement declined",
                });
                break;

            default:
                // We safely ignore unhandled notification kinds
                console.log(`Unhandled Braintree webhook event type: ${notification.kind}`);
                break;
        }
    } catch (error) {
        console.error(`Error processing webhook event ${notification.kind}`, error);
        // Even if internal logic failed, sending 200 tells Braintree not to endlessly retry if it's a hard bug.
        // Depending on architectural preference, returning 500 would enforce retries.
        return new Response("Webhook handled with errors", { status: 500 });
    }

    return new Response("ok", { status: 200 });
}
