import { fetchAuthAction, fetchAuthQuery } from "@/lib/auth-server";
import { ownerAccess, ownerOverview } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth-policy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST prevents link prefetches/crawlers from triggering a database scan.
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ message: "Request not allowed." }, { status: 403 });
  try {
    await fetchAuthQuery(ownerAccess, {});
  } catch {
    return Response.json(
      { message: "Please sign in again with the owner account." },
      { status: 401 },
    );
  }
  try {
    const overview = await fetchAuthAction(ownerOverview, {});
    return Response.json(overview, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      {
        message:
          "The overview could not be collected. Try refreshing in a moment.",
      },
      { status: 503 },
    );
  }
}
