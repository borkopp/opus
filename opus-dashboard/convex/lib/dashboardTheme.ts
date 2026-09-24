import { v } from "convex/values";

export const dashboardThemeValidator = v.union(
  v.literal("clarity"),
  v.literal("studio"),
);
