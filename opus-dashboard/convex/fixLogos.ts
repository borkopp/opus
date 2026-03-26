import { mutation } from "./_generated/server";

export const fixLogoUrls = mutation(async (ctx) => {
  const orgs = await ctx.db.query("orgs").collect();
  for (const org of orgs) {
    if (org.logoUrl && org.logoUrl.includes("/api/storage/api/storage/")) {
      const fixedUrl = org.logoUrl.replace("/api/storage/api/storage/", "/api/storage/");
      await ctx.db.patch(org._id, { logoUrl: fixedUrl });
    }
  }
});
