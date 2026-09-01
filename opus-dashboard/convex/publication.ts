import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getBeautyActivationState } from "./lib/activation";
import { getWebsiteStatus } from "./lib/publication";

export const recomputeWebsiteStatus = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const state = await getBeautyActivationState(ctx, args.orgId);
    if (!state) return;

    const currentWebsiteStatus = getWebsiteStatus(state.org);
    let nextWebsiteStatus = currentWebsiteStatus;
    if (
      currentWebsiteStatus === "published" &&
      !state.allWebsiteRequirementsComplete
    ) {
      nextWebsiteStatus = "suspended";
    } else if (
      currentWebsiteStatus === "suspended" &&
      state.allWebsiteRequirementsComplete
    ) {
      nextWebsiteStatus = "published";
    }

    const websiteChanged = nextWebsiteStatus !== currentWebsiteStatus;
    if (!websiteChanged) return;

    const now = Date.now();
    await ctx.db.patch(args.orgId, {
      websiteStatus: nextWebsiteStatus,
      updatedAt: now,
    });

    const incompleteRequirements = state.websiteRequirements
      .filter((item) => !item.complete)
      .map((item) => item.code);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: `org.website_status.${nextWebsiteStatus}`,
      resourceType: "orgs",
      resourceId: args.orgId,
      before: { websiteStatus: currentWebsiteStatus },
      after: {
        websiteStatus: nextWebsiteStatus,
        incompleteRequirements,
      },
      createdAt: now,
    });
  },
});
