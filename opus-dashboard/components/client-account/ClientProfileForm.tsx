"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { accountErrorMessage } from "@/lib/account-errors";
import type { Doc } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ClientProfileForm({ user }: { user: Doc<"opus_users"> }) {
  const { t } = useDashboardI18n();
  const update = useMutation(api.opusUsers.updateProfile);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await update({ name, phone });
          toast.success(
            t("Details saved", "Деталите се зачувани", "Detajet u ruajtën"),
          );
        } catch (error) {
          toast.error(
            accountErrorMessage(
              error,
              t(
                "Could not save details",
                "Деталите не се зачуваа",
                "Detajet nuk u ruajtën",
              ),
            ),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="client-name">
            {t("Full name", "Име и презиме", "Emri i plotë")}
          </FieldLabel>
          <Input
            id="client-name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-phone">
            {t("Phone", "Телефон", "Telefoni")}
          </FieldLabel>
          <Input
            id="client-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FieldDescription>
            {t(
              "Used to prefill your bookings. Each studio keeps its own client records.",
              "За пополнување на вашите резервации. Секое студио има свои записи за клиентите.",
              "Përdoret për të plotësuar rezervimet tuaja. Çdo studio ruan regjistrat e vet të klientëve.",
            )}
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          {t("Save details", "Зачувај детали", "Ruaj detajet")}
        </Button>
      </FieldGroup>
    </form>
  );
}
