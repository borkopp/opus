import { requestBillingCurrency } from "../../../../../shared/billing-currency";

export function GET(request: Request) {
  return Response.json(
    { currency: requestBillingCurrency(request.headers) },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie, X-Vercel-IP-Country",
      },
    },
  );
}
