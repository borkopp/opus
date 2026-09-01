"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getImageStorageUrl } from "@/lib/file-validation";

export function useStorageImageUrl(
  orgId: Id<"orgs">,
  urlOrStorageId?: string | null,
) {
  const directUrl = getImageStorageUrl(urlOrStorageId);
  const storageId = urlOrStorageId && !directUrl ? urlOrStorageId : undefined;
  const resolvedStorageUrl = useQuery(
    api.files.getFileUrl,
    storageId
      ? { orgId, storageId: storageId as Id<"_storage"> }
      : "skip",
  );

  return directUrl ?? resolvedStorageUrl ?? undefined;
}
