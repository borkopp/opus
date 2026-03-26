import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Convex boilerplate retained for CLI compatibility.
// The `numbers` table was removed from the schema.
// These functions are no-ops kept to avoid breaking the generated API surface.

export const myAction = action({
  args: {
    first: v.number(),
    second: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log("myAction called:", args.first, args.second);
  },
});
