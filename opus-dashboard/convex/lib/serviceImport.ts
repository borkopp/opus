import { v } from "convex/values";
import { z } from "zod";

export const MAX_IMPORT_SERVICES = 50;
export const MAX_IMPORT_IMAGE_LENGTH = 900_000;
export const serviceImportRow = v.object({
  name: v.string(),
  // Optional for drafts extracted before category support was added.
  categoryName: v.optional(v.union(v.string(), v.null())),
  priceMinorUnits: v.union(v.number(), v.null()),
  durationMins: v.union(v.number(), v.null()),
  durationSource: v.union(
    v.literal("photo"),
    v.literal("suggested"),
    v.literal("missing"),
  ),
  confidenceScore: v.number(),
});

export const serviceImportSchema = z.object({
  services: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        categoryName: z.string().min(1).max(120).nullable(),
        priceMinorUnits: z.number().int().min(0).max(100_000_000).nullable(),
        durationMins: z.number().int().min(1).max(720).nullable(),
        durationSource: z.enum(["photo", "suggested", "missing"]),
        confidenceScore: z.number().min(0).max(1),
      }),
    )
    .max(MAX_IMPORT_SERVICES),
});

export type ExtractedService = z.infer<
  typeof serviceImportSchema
>["services"][number];

export function normalizeServiceName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function serviceImportIdentity(
  name: string,
  categoryName?: string | null,
) {
  return JSON.stringify([
    normalizeServiceName(categoryName ?? ""),
    normalizeServiceName(name),
  ]);
}

export function normalizeExtractedServices(
  rows: ExtractedService[],
  slotMins: number,
) {
  return rows.map((row) => {
    const duration = row.durationSource === "missing" ? null : row.durationMins;
    const rounded =
      duration === null ? null : Math.ceil(duration / slotMins) * slotMins;
    return {
      ...row,
      name: row.name.trim(),
      categoryName: row.categoryName?.trim().replace(/\s+/g, " ") || null,
      durationMins: rounded,
      durationSource:
        rounded === null
          ? ("missing" as const)
          : rounded !== duration
            ? ("suggested" as const)
            : row.durationSource,
    };
  });
}
