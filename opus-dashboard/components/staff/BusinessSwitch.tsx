"use client";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { accountErrorMessage } from "@/lib/account-errors";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Mount outside DashboardShell so old tenant subscriptions are gone before changing identity scope. */
export function BusinessSwitch({ orgId }: { orgId?: string }) {
  const { t } = useDashboardI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const change = useMutation(api.users.switchOrg);
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const fallback = t(
    "Could not switch business. Return to your workspace and try again.",
    "Бизнисот не се смени. Вратете се во работниот простор и обидете се повторно.",
    "Biznesi nuk u ndryshua. Kthehuni te hapësira juaj e punës dhe provoni përsëri.",
  );
  useEffect(() => {
    if (isLoading || !orgId || started.current) return;
    if (!isAuthenticated) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/business/switch?org=${encodeURIComponent(orgId)}`)}`,
      );
      return;
    }
    started.current = true;
    void change({ orgId: orgId as Id<"orgs"> })
      .then(() => router.replace("/"))
      .catch((cause) => setError(accountErrorMessage(cause, fallback)));
  }, [change, fallback, isAuthenticated, isLoading, orgId, router]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6">
      {error || !orgId ? (
        <>
          <Alert variant="destructive">
            <AlertDescription>{error ?? fallback}</AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link href="/">
              {t(
                "Return to workspace",
                "Назад во работниот простор",
                "Kthehu te hapësira e punës",
              )}
            </Link>
          </Button>
        </>
      ) : (
        <>
          <Spinner />
          <p role="status">
            {t(
              "Switching business…",
              "Се менува бизнисот…",
              "Po ndryshohet biznesi…",
            )}
          </p>
        </>
      )}
    </main>
  );
}
