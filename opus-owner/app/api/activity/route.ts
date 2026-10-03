import { fetchAuthQuery } from "@/lib/auth-server";
import { ownerAccess, ownerActivity } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth-policy";
import type {
  OwnerActivityKind,
  OwnerBookingStatus,
} from "../../../../shared/owner-overview";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json(
      { message: "Request not allowed." },
      { status: 403, headers },
    );
  try {
    await fetchAuthQuery(ownerAccess, {});
  } catch {
    return Response.json(
      { message: "Please sign in again with the owner account." },
      { status: 401, headers },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Invalid request." },
      { status: 400, headers },
    );
  }
  if (!body || typeof body !== "object")
    return Response.json(
      { message: "Invalid request." },
      { status: 400, headers },
    );
  const { orgId, kind, cursor, status } = body as Record<string, unknown>;
  if (
    typeof orgId !== "string" ||
    !orgId ||
    orgId.length > 100 ||
    typeof kind !== "string" ||
    !["bookings", "audit", "team"].includes(kind) ||
    (cursor !== null &&
      (typeof cursor !== "string" || cursor.length > 16_384)) ||
    typeof status !== "string" ||
    ![
      "all",
      "confirmed",
      "checked_in",
      "completed",
      "cancelled",
      "no_show",
    ].includes(status)
  ) {
    return Response.json(
      { message: "Invalid request." },
      { status: 400, headers },
    );
  }
  try {
    const result = await fetchAuthQuery(ownerActivity, {
      orgId,
      kind: kind as OwnerActivityKind,
      cursor: cursor as string | null,
      status: status as OwnerBookingStatus | "all",
    });
    return Response.json(result, { headers });
  } catch {
    // Recheck access so session expiry clears private records in the browser.
    try {
      await fetchAuthQuery(ownerAccess, {});
    } catch {
      return Response.json(
        { message: "Please sign in again with the owner account." },
        { status: 401, headers },
      );
    }
    return Response.json(
      {
        message:
          "Couldn’t load business activity. Refresh the overview and try again.",
      },
      { status: 503, headers },
    );
  }
}
