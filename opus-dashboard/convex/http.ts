import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth";
import { resendWebhook } from "./emailWebhooks";
import { twilioWebhook } from "./smsWebhooks";
import { verify, receive, callback } from "./ai/webhooks";

const http = httpRouter();

http.route({
  path: "/webhooks/twilio",
  method: "POST",
  handler: twilioWebhook,
});

authComponent.registerRoutes(http, createAuth);

http.route({ path: "/webhooks/instagram", method: "GET", handler: verify });
http.route({ path: "/webhooks/instagram", method: "POST", handler: receive });
http.route({ path: "/instagram/callback", method: "GET", handler: callback });

http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: resendWebhook,
});

export default http;
