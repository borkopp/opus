import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type PublicSite = NonNullable<
  FunctionReturnType<typeof api.publicSite.getBySlug>
>;
