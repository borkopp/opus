import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth";
import { resendWebhook } from "./emailWebhooks";
import { verify, receive, callback } from "./ai/webhooks";

const http = httpRouter();

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
