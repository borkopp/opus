"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { recoveryErrorMessage } from "@/lib/gap-recovery";

export function RecoveryContacts({
  orgId,
  gapId,
  disabled = false,
}: {
  orgId: Id<"orgs">;
  gapId?: Id<"gap_suggestions">;
  disabled?: boolean;
}) {
  const { t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const contacts = useQuery(
    api.ai.gapOptimizerHelpers.listRecoveryContacts,
    open ? { orgId, search } : "skip",
  );
  const setConsent = useMutation(
    api.ai.gapOptimizerHelpers.setRecoveryContactConsent,
  );
  const choose = useMutation(api.ai.gapOptimizerHelpers.chooseRecoveryCustomer);
  async function act(customerId: Id<"customers">, optedIn?: boolean) {
    setBusy(true);
    try {
      if (gapId) {
        await choose({ orgId, gapId, customerId });
        setOpen(false);
        toast.success(
          t("Customer added for review", "Клиентот е додаден за преглед"),
        );
      } else {
        await setConsent({ orgId, customerId, optedIn: !!optedIn });
        toast.success(t("Permission updated", "Дозволата е ажурирана"));
      }
    } catch (error) {
      toast.error(recoveryErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-replay-public
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          {gapId
            ? t("Choose another client", "Избери друг клиент")
            : t("Client permissions", "Дозволи од клиенти")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle data-replay-public>
            {gapId
              ? t("Choose a client", "Изберете клиент")
              : t(
                  "Permission for opening offers",
                  "Дозвола за понуди за слободни термини",
                )}
          </DialogTitle>
          <DialogDescription data-replay-public>
            {gapId
              ? t(
                  "Only clients who allow these emails can be selected. Availability and upcoming appointments are checked before adding them.",
                  "Може да се изберат само клиенти што ги дозволуваат овие пораки. Се проверуваат достапноста и идните резервации.",
                )
              : t(
                  "Record permission only after the client agrees to receive opening offers by email. A booking alone is not permission.",
                  "Евидентирајте дозвола само откако клиентот ќе се согласи да добива понуди по е-пошта. Самото резервирање не е дозвола.",
                )}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel
            data-replay-public
            htmlFor={gapId ? "choose-client-search" : "permission-search"}
          >
            {t("Search clients", "Пребарај клиенти")}
          </FieldLabel>
          <Input
            id={gapId ? "choose-client-search" : "permission-search"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <div className="flex max-h-80 flex-col gap-4 overflow-y-auto">
          {contacts === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : contacts.length === 0 ? (
            <p data-replay-public className="text-sm text-muted-foreground">
              {t("No clients found.", "Нема пронајдени клиенти.")}
            </p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact._id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{contact.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.email ||
                      t("No email address", "Нема адреса за е-пошта")}
                  </p>
                </div>
                {gapId ? (
                  <Button
                    data-replay-public
                    size="sm"
                    variant="outline"
                    disabled={busy || !contact.optedIn || !contact.email}
                    onClick={() => act(contact._id)}
                  >
                    {contact.optedIn
                      ? t("Choose", "Избери")
                      : t("No permission", "Нема дозвола")}
                  </Button>
                ) : (
                  <Switch
                    checked={contact.optedIn}
                    disabled={busy || !contact.email}
                    aria-label={`${t("Permission recorded for", "Евидентирана дозвола за")} ${contact.name}`}
                    onCheckedChange={(value) => act(contact._id, value)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
