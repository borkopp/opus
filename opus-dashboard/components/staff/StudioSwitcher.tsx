"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { accountErrorMessage } from "@/lib/account-errors";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudioSwitcher({ orgId }: { orgId?: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const memberships = useQuery(api.users.listMemberships);
  const change = useMutation(api.users.switchOrg);
  const [busy, setBusy] = useState(false);
  if (!orgId || !memberships || memberships.length < 2) return null;
  return (
    <Select
      value={orgId}
      disabled={busy}
      onValueChange={async (value) => {
        setBusy(true);
        try {
          await change({ orgId: value as Id<"orgs"> });
          router.replace("/beauty");
        } catch (error) {
          toast.error(
            accountErrorMessage(
              error,
              t(
                "Could not switch studio",
                "Студиото не се смени",
                "Studioja nuk u ndryshua",
              ),
            ),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <SelectTrigger
        className="max-w-40"
        aria-label={t("Switch studio", "Промени студио", "Ndrysho studion")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {memberships.map((membership) => (
            <SelectItem key={membership.orgId} value={membership.orgId}>
              {membership.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
