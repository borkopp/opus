"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useStudioInstallContext } from "./StudioInstallProvider";

export function StudioInstallMenuItem() {
  const install = useStudioInstallContext();
  const { t } = useDashboardI18n();
  if (!install?.state.ready || install.state.installed) return null;
  return (
    <DropdownMenuItem asChild>
      <Link href="/notifications/preferences#install-app" data-replay-public>
        <Download aria-hidden="true" />
        {t(
          "Install web app",
          "Инсталирај веб-апликација",
          "Instalo aplikacionin web",
        )}
      </Link>
    </DropdownMenuItem>
  );
}
