"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WebsiteEditorWorkspace } from "./WebsiteEditorWorkspace";

export function WebsiteEditor() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const data = useQuery(
    api.websiteDesigns.getEditor,
    profile?.role === "owner" ? {} : "skip",
  );
  if (
    profile === undefined ||
    (profile?.role === "owner" && data === undefined)
  )
    return (
      <div className="sites-editor sites-editor-loading">
        <Skeleton className="h-16 w-full" />
        <div className="flex min-h-0 flex-1 gap-5 p-5">
          <Skeleton className="hidden w-80 md:block" />
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  if (!data || profile?.role !== "owner")
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6">
        <p>
          {t(
            "Only studio owners can edit their website.",
            "Само сопствениците може да ја уредуваат веб-страницата.",
            "Vetëm pronarët e studios mund të redaktojnë uebsajtin.",
          )}
        </p>
        <Button asChild variant="outline">
          <Link href="/beauty">
            {t("Back to studio", "Назад во студио", "Kthehuni në studio")}
          </Link>
        </Button>
      </div>
    );
  return <WebsiteEditorWorkspace key={data.site._id} data={data} />;
}
