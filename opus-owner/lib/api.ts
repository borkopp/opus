import { makeFunctionReference } from "convex/server";
import type {
  OwnerActivityKind,
  OwnerActivityPage,
  OwnerBookingStatus,
  OwnerOverview,
} from "../../shared/owner-overview";
import type {
  AllowanceCommand,
  AssistantAllowance,
  CleanupCommand,
  OrganizationCleanupPreview,
} from "../../shared/owner-controls";

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

export const ownerActivity = makeFunctionReference<
  "query",
  {
    orgId: string;
    kind: OwnerActivityKind;
    cursor: string | null;
    status: OwnerBookingStatus | "all";
  },
  OwnerActivityPage
>("ownerActivity:page");

export const ownerAssistant = makeFunctionReference<
  "query",
  { orgId: string },
  AssistantAllowance
>("ownerAssistant:get");
export const updateOwnerAssistant = makeFunctionReference<
  "mutation",
  AllowanceCommand,
  AssistantAllowance
>("ownerAssistant:update");
export const prepareOwnerCleanup = makeFunctionReference<
  "mutation",
  { orgId: string },
  OrganizationCleanupPreview
>("ownerCleanup:prepare");
export const executeOwnerCleanup = makeFunctionReference<
  "mutation",
  CleanupCommand,
  { deleted: boolean }
>("ownerCleanup:execute");
