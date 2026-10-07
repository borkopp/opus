"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useSettingsDraft } from "./use-settings-draft";

type EmailDraft = Omit<
  FunctionArgs<typeof api.orgSettings.updateEmailNotificationSettings>,
  "orgId"
>;
export function useEmailNotificationSettings<T extends EmailDraft>(
  orgId: Id<"orgs">,
  initial: T,
) {
  const form = useSettingsDraft(initial);
  const { t } = useDashboardI18n();
  const update = useMutation(api.orgSettings.updateEmailNotificationSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setSaving(true);
    setError("");
    try {
      await update({ orgId, ...form.changes });
      toast.success(
        t(
          "Email settings saved",
          "Поставките за е-пошта се зачувани",
          "Cilësimet e email-it u ruajtën",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t(
              "Could not save email settings.",
              "Поставките за е-пошта не се зачувани.",
              "Cilësimet e email-it nuk mund të ruheshin.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  return { ...form, saving, error, save };
}
