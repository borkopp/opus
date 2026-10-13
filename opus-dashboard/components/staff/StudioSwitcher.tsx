"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
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
  if (!memberships?.some((membership) => membership.orgId !== orgId))
    return null;
  return (
    <Select
      value={
        memberships.some((membership) => membership.orgId === orgId)
          ? orgId
          : undefined
      }
      onValueChange={(value) =>
        router.push(`/business/switch?org=${encodeURIComponent(value)}`)
      }
    >
      <SelectTrigger
        className="max-w-40"
        aria-label={t("Switch business", "Промени бизнис", "Ndrysho biznesin")}
      >
        <SelectValue
          placeholder={t("Choose business", "Избери бизнис", "Zgjidh biznesin")}
        />
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
