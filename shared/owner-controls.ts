/** Contracts shared by the independent owner app and the Convex backend. */
export type AssistantAllowance = {
  orgId: string;
  plan: "free" | "paid";
  limit: number;
  deepLimit: number;
  defaultLimit: number;
  defaultDeepLimit: number;
  custom: boolean;
  used: number;
  deepUsed: number;
  budgetUsedMicroUsd: number;
  budgetMicroUsd: number;
  resetAt: number;
  busy: boolean;
};

export type AllowanceCommand = {
  orgId: string;
  operation: "reset" | "defaults" | "custom";
  limit?: number;
  deepLimit?: number;
};

export type CleanupLine = { key: string; label: string; count: number };
export type OrganizationCleanupPreview = {
  confirmationId: string;
  orgId: string;
  name: string;
  slug: string;
  expiresAt: number;
  remove: CleanupLine[];
  retain: CleanupLine[];
  blockers: string[];
  notes: string[];
};

export type CleanupCommand = {
  orgId: string;
  confirmationId: string;
  slug: string;
};

export const OWNER_DELETE_HOLD_MS = 5_000;
export const OWNER_MAX_PROMPTS = 10_000;
