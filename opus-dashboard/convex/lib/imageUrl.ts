import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type StorageReader = Pick<QueryCtx, "storage">;

function isDirectImageUrl(value: string) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:image/")
  );
}

export async function resolveStoredImageUrl(
  ctx: StorageReader,
  urlOrStorageId?: string | null,
): Promise<string | undefined> {
  if (!urlOrStorageId) return undefined;
  if (isDirectImageUrl(urlOrStorageId)) return urlOrStorageId;

  try {
    return (
      (await ctx.storage.getUrl(urlOrStorageId as Id<"_storage">)) ?? undefined
    );
  } catch {
    return undefined;
  }
}
