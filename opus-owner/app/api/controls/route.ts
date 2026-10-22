import { ConvexError } from "convex/values";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";
import {
  ownerAccess,
  ownerAssistant,
  updateOwnerAssistant,
  prepareOwnerCleanup,
  executeOwnerCleanup,
} from "@/lib/api";
import { isSameOrigin } from "@/lib/auth-policy";
import { OWNER_MAX_PROMPTS } from "../../../../shared/owner-controls";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const failure = (message: string, status: number) =>
  Response.json({ message }, { status, headers });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return failure("Request not allowed.", 403);
  try {
    await fetchAuthQuery(ownerAccess, {});
  } catch {
    return failure("Please sign in again with the owner account.", 401);
  }
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 4_096) return failure("Invalid request.", 400);
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return failure("Invalid request.", 400);
    body = value as Record<string, unknown>;
  } catch {
    return failure("Invalid request.", 400);
  }
  const { orgId, action } = body;
  if (typeof orgId !== "string" || !orgId || orgId.length > 100)
    return failure("Invalid business.", 400);
  try {
    if (action === "allowance")
      return Response.json(await fetchAuthQuery(ownerAssistant, { orgId }), {
        headers,
      });
    if (action === "previewDeletion")
      return Response.json(
        await fetchAuthMutation(prepareOwnerCleanup, { orgId }),
        { headers },
      );
    if (action === "delete") {
      const { confirmationId, slug } = body;
      if (
        typeof confirmationId !== "string" ||
        !confirmationId ||
        confirmationId.length > 100 ||
        typeof slug !== "string" ||
        !slug ||
        slug.length > 100
      )
        return failure("Invalid confirmation.", 400);
      return Response.json(
        await fetchAuthMutation(executeOwnerCleanup, {
          orgId,
          confirmationId,
          slug,
        }),
        { headers },
      );
    }
    if (action === "setAllowance") {
      const { operation, limit, deepLimit } = body;
      if (
        operation !== "reset" &&
        operation !== "defaults" &&
        operation !== "custom"
      )
        return failure("Invalid operation.", 400);
      if (operation === "custom") {
        if (
          typeof limit !== "number" ||
          typeof deepLimit !== "number" ||
          ![limit, deepLimit].every(
            (n) => Number.isSafeInteger(n) && n >= 0 && n <= OWNER_MAX_PROMPTS,
          ) ||
          deepLimit > limit
        )
          return failure("Enter valid whole-number allowances.", 400);
        return Response.json(
          await fetchAuthMutation(updateOwnerAssistant, {
            orgId,
            operation,
            limit,
            deepLimit,
          }),
          { headers },
        );
      }
      return Response.json(
        await fetchAuthMutation(updateOwnerAssistant, { orgId, operation }),
        { headers },
      );
    }
    return failure("Unknown action.", 400);
  } catch (error) {
    try {
      await fetchAuthQuery(ownerAccess, {});
    } catch {
      return failure("Please sign in again with the owner account.", 401);
    }
    return failure(
      error instanceof ConvexError && typeof error.data === "string"
        ? error.data
        : "Couldn’t complete the action. Refresh and try again.",
      error instanceof ConvexError ? 409 : 503,
    );
  }
}
