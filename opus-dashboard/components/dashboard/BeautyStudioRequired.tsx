"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { StudioSwitcher } from "@/components/staff/StudioSwitcher";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function BeautyStudioRequired({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const signOut = usePushSignOut();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Empty className="max-w-lg">
        <EmptyHeader>
          <EmptyTitle>
            <h1>
              {t(
                "Choose a beauty studio",
                "Избери студио за убавина",
                "Zgjidh një studio bukurie",
              )}
            </h1>
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "The selected business is not a beauty studio. Switch to a beauty studio or sign in with another account to open this dashboard.",
              "Избраниот бизнис не е студио за убавина. Префрли се на студио за убавина или најави се со друга сметка за да ја отвориш оваа контролна табла.",
              "Biznesi i zgjedhur nuk është studio bukurie. Kalo te një studio bukurie ose hyr me një llogari tjetër për të hapur këtë panel.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <StudioSwitcher orgId={orgId} />
          <Button
            type="button"
            variant="outline"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                const result = await signOut();
                if (result.error) throw new Error(result.error.message);
                router.replace("/login");
              } catch {
                toast.error(
                  t(
                    "Could not sign out. Please try again.",
                    "Одјавувањето не успеа. Обидете се повторно.",
                    "Dalja dështoi. Ju lutemi provoni përsëri.",
                  ),
                );
              } finally {
                setSigningOut(false);
              }
            }}
          >
            {t("Sign out", "Одјави се", "Dil")}
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
