import { makeFunctionReference } from "convex/server";
import type { OwnerOverview } from "../../shared/owner-overview";

// Shared data contract only: this app does not import the studio application.
export const ownerAccess = makeFunctionReference<
  "query",
  Record<string, never>,
  { email: string }
>("ownerAnalytics:access");
export const ownerOverview = makeFunctionReference<
  "action",
  Record<string, never>,
  OwnerOverview
>("ownerAnalytics:overview");
