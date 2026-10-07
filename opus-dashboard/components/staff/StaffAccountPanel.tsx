"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { accountErrorMessage } from "@/lib/account-errors";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function StaffAccountPanel({
  orgId,
  staffId,
  role,
  owner,
  paid,
}: {
  orgId: Id<"orgs">;
  staffId: Id<"staff_members">;
  role: "owner" | "manager" | "staff";
  owner: boolean;
  paid: boolean;
}) {
  const { t } = useDashboardI18n();
  const access = useQuery(api.staff.getAccountAccess, { orgId, staffId });
  const invite = useMutation(api.staff.inviteStaffMember);
  const update = useMutation(api.staff.updateAccountAccess);
  const revoke = useMutation(api.staff.revokeAccountAccess);
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(access?.invite?.email ?? "");
  }, [access?.invite?.email]);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error(
        accountErrorMessage(
          error,
          t(
            "Could not update access",
            "Пристапот не се ажурираше",
            "Qasja nuk u përditësua",
          ),
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("Login & access", "Најава и пристап", "Hyrja dhe qasja")}
        </CardTitle>
        <CardDescription>
          {t(
            "Invite this person to sign in with their own email and manage their appointments.",
            "Поканете го ова лице да се најавува со своја е-пошта и да управува со термините.",
            "Ftoni këtë person të hyjë me emailin e vet dhe të menaxhojë terminet.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!access ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            {access.linked ? (
              <p className="break-all text-sm">
                {t("Sign-in email", "Е-пошта за најава", "Emaili i hyrjes")}:{" "}
                {access.email}
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(
                    () => invite({ orgId, staffId, email }),
                    t(
                      "Invitation queued",
                      "Поканата е ставена во ред за испраќање",
                      "Ftesa u vendos në radhë",
                    ),
                  );
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="staff-login-email">
                      {t(
                        "Sign-in email",
                        "Е-пошта за најава",
                        "Emaili i hyrjes",
                      )}
                    </FieldLabel>
                    <Input
                      id="staff-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={!paid || busy}
                    />
                    <FieldDescription>
                      {access.invite
                        ? t(
                            `An invitation is pending for ${access.invite.email}. Sending another replaces it.`,
                            `Испратена е покана за ${access.invite.email}. Нова покана ја заменува претходната.`,
                            `Ka një ftesë për ${access.invite.email}. Dërgimi i një tjetre e zëvendëson atë.`,
                          )
                        : t(
                            "The recipient must verify this email. Invitations expire after 72 hours.",
                            "Примачот мора да ја потврди оваа е-пошта. Поканите истекуваат по 72 часа.",
                            "Marrësi duhet të verifikojë këtë email. Ftesat skadojnë pas 72 orësh.",
                          )}
                    </FieldDescription>
                  </Field>
                  <Button
                    type="submit"
                    disabled={!paid || busy || !email.trim()}
                  >
                    {busy && <Spinner data-icon="inline-start" />}
                    {t("Send invitation", "Испрати покана", "Dërgo ftesën")}
                  </Button>
                  {!paid && (
                    <FieldDescription>
                      {t(
                        "New team account invitations require Pro. Existing accounts keep their access.",
                        "Поканите за нови сметки на тимот бараат Pro. Постојните сметки го задржуваат пристапот.",
                        "Ftesat për llogari të reja ekipi kërkojnë Pro. Llogaritë ekzistuese ruajnë qasjen.",
                      )}
                    </FieldDescription>
                  )}
                </FieldGroup>
              </form>
            )}
            {role === "staff" && (
              <Field>
                <FieldLabel htmlFor="staff-appointment-access">
                  {t(
                    "Appointment access",
                    "Пристап до термини",
                    "Qasja në termine",
                  )}
                </FieldLabel>
                <Select
                  value={access.bookingAccess}
                  disabled={!owner || busy}
                  onValueChange={(value) => {
                    if (value === "own" || value === "team")
                      void run(
                        () => update({ orgId, staffId, bookingAccess: value }),
                        t(
                          "Access saved",
                          "Пристапот е зачуван",
                          "Qasja u ruajt",
                        ),
                      );
                  }}
                >
                  <SelectTrigger
                    id="staff-appointment-access"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="own">
                        {t(
                          "Own appointments only",
                          "Само сопствени термини",
                          "Vetëm terminet e veta",
                        )}
                      </SelectItem>
                      <SelectItem value="team">
                        {t("Team access", "Пристап до тимот", "Qasje në ekip")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t(
                    "Personal access includes assigned appointments and their client details. Team access retains the existing staff dashboard permissions.",
                    "Личниот пристап ги вклучува доделените термини и деталите за нивните клиенти. Тимскиот пристап ги задржува постојните дозволи за контролната табла.",
                    "Qasja personale përfshin terminet e caktuara dhe detajet e klientëve të tyre. Qasja e ekipit ruan lejet ekzistuese të panelit.",
                  )}
                </FieldDescription>
              </Field>
            )}
            {owner && role !== "owner" && (access.linked || access.invite) && (
              <div className="flex flex-wrap gap-2">
                {confirmRevoke ? (
                  <>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          async () => {
                            await revoke({ orgId, staffId });
                            setConfirmRevoke(false);
                          },
                          t(
                            "Account access removed",
                            "Пристапот до сметката е отстранет",
                            "Qasja në llogari u hoq",
                          ),
                        )
                      }
                    >
                      {t(
                        "Confirm removal",
                        "Потврди отстранување",
                        "Konfirmo heqjen",
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmRevoke(false)}
                    >
                      {t("Keep access", "Задржи пристап", "Mbaj qasjen")}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmRevoke(true)}
                  >
                    {t(
                      "Remove account access",
                      "Отстрани пристап до сметката",
                      "Hiq qasjen në llogari",
                    )}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
