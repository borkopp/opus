import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth";
import { resendWebhook } from "./emailWebhooks";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: resendWebhook,
});

export default http;
