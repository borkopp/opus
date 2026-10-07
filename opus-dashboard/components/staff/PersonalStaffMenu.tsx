"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function PersonalStaffMenu() {
  const signOut = usePushSignOut();
  const { t } = useDashboardI18n();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/notifications/preferences">
          {t(
            "Notification preferences",
            "Поставки за известувања",
            "Preferencat e njoftimeve",
          )}
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href="/account">
          {t("My OPUS account", "Моја OPUS сметка", "Llogaria ime OPUS")}
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            const result = await signOut();
            if (result.error) toast.error(result.error.message);
            else router.replace("/login");
          } catch {
            toast.error(
              t(
                "Could not sign out. Try again.",
                "Одјавувањето не успеа. Обиди се повторно.",
                "Dalja dështoi. Provoni përsëri.",
              ),
            );
          }
        }}
      >
        {t("Sign out", "Одјави се", "Dil")}
      </Button>
    </div>
  );
}
