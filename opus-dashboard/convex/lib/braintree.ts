"use node";
import braintree from "braintree";

export const getGateway = () => {
    const environment = process.env.BRAINTREE_ENVIRONMENT === "production"
        ? braintree.Environment.Production
        : braintree.Environment.Sandbox;

    const merchantId = process.env.BRAINTREE_MERCHANT_ID;
    const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
    const privateKey = process.env.BRAINTREE_PRIVATE_KEY;

    if (!merchantId || !publicKey || !privateKey) {
        throw new Error("Missing Braintree configuration (BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, or BRAINTREE_PRIVATE_KEY). Please check your environment variables.");
    }

    return new braintree.BraintreeGateway({
        environment,
        merchantId,
        publicKey,
        privateKey,
    });
};
