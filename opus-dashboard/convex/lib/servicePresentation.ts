import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type ServiceCategoryNames = ReadonlyMap<
  Id<"service_categories">,
  string
>;

export async function serviceCategoryNamesForOrg(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
) {
  const categories = await ctx.db
    .query("service_categories")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  return new Map(
    categories
      .filter((category) => !category.isDeleted)
      .map((category) => [category._id, category.name]),
  );
}

export function serviceDisplayName(
  service: Pick<Doc<"services">, "name" | "categoryId">,
  categoryNames: ServiceCategoryNames,
) {
  const categoryName = service.categoryId
    ? categoryNames.get(service.categoryId)
    : undefined;
  return categoryName ? `${service.name} · ${categoryName}` : service.name;
}
