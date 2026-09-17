"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { formatPrice } from "@/lib/format-price";
import { recoveryErrorMessage, recoveryStatusLabel } from "@/lib/gap-recovery";
import { RecoveryContacts } from "./RecoveryContacts";

type Dashboard = FunctionReturnType<
  typeof api.ai.gapOptimizerHelpers.getRecoveryDashboard
>;
type Gap = Dashboard["gaps"][number];
type Candidate = Gap["topCandidates"][number];
const time = (value: number) => new Date(value).toISOString().slice(11, 16);

export function GapList({
  data,
  orgId,
}: {
  data: Dashboard;
  orgId: Id<"orgs">;
}) {
  const { t } = useDashboardI18n();
  if (!data.gaps.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>
            {data.lastScanAt
              ? t(
                  "No bookable openings found",
                  "Не се пронајдени соодветни слободни термини",
                )
              : t(
                  "Scan a day to find openings",
                  "Скенирајте ден за да пронајдете слободни термини",
                )}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Results depend on working hours, services, buffers, and your minimum opening duration.",
              "Резултатите зависат од работното време, услугите, паузите меѓу термини и минималното времетраење.",
            )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-4">
      {data.gaps.map((gap) => (
        <GapCard key={gap._id} gap={gap} orgId={orgId} data={data} />
      ))}
    </div>
  );
}

function GapCard({
  gap,
  orgId,
  data,
}: {
  gap: Gap;
  orgId: Id<"orgs">;
  data: Dashboard;
}) {
  const { t } = useDashboardI18n();
  const dismiss = useMutation(api.ai.gapOptimizerHelpers.dismissGap);
  const [busy, setBusy] = useState(false);
  const active =
    gap.hasBookableServices && ["open", "outreach_sent"].includes(gap.status);
  async function dismissOpening() {
    setBusy(true);
    try {
      await dismiss({ orgId, gapId: gap._id });
    } catch (error) {
      toast.error(recoveryErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {time(gap.gapStartAt)}–{time(gap.gapEndAt)} · {gap.staffName}
        </CardTitle>
        <CardDescription>
          {gap.serviceDate} · {gap.durationMins}{" "}
          {t("minutes of open time", "минути слободно време")}
          {!active && ` · ${t("Closed", "Затворено")}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {gap.activeOffer && (
          <Alert>
            <AlertTitle>
              {t("Waiting for a response", "Се чека одговор")}
            </AlertTitle>
            <AlertDescription>
              {t(
                "One offer is active. You can choose another client after it expires or is declined.",
                "Има една активна понуда. Може да изберете друг клиент по истекување или одбивање.",
              )}
            </AlertDescription>
          </Alert>
        )}
        {gap.topCandidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "No eligible clients yet. Review client permissions, then scan again or choose a client.",
              "Сè уште нема соодветни клиенти. Проверете ги дозволите, па скенирајте повторно или изберете клиент.",
            )}
          </p>
        ) : (
          gap.topCandidates.map((candidate) => (
            <CandidateRow
              key={candidate._id}
              candidate={candidate}
              orgId={orgId}
              canManage={data.canManage}
              canSend={
                data.enabled && data.emailReady && !gap.activeOffer && active
              }
              locale={data.locale}
            />
          ))
        )}
      </CardContent>
      {data.canManage && active && (
        <CardFooter className="flex-wrap gap-2 pb-5">
          <RecoveryContacts
            orgId={orgId}
            gapId={gap._id}
            disabled={gap.activeOffer}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissOpening}
            disabled={busy}
          >
            {t("Dismiss opening", "Отфрли слободен термин")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function CandidateRow({
  candidate,
  orgId,
  canManage,
  canSend,
  locale,
}: {
  candidate: Candidate;
  orgId: Id<"orgs">;
  canManage: boolean;
  canSend: boolean;
  locale: string;
}) {
  const { t } = useDashboardI18n();
  const approve = useAction(api.ai.gapOptimizer.approveAndSendCandidate);
  const skip = useMutation(api.ai.gapOptimizerHelpers.dismissCandidate);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function approveEmail() {
    setBusy(true);
    try {
      await approve({ orgId, candidateId: candidate._id });
      setOpen(false);
      toast.success(
        t(
          "Email queued. Delivery status will update here.",
          "Пораката е во ред за испраќање. Статусот ќе се ажурира тука.",
        ),
      );
    } catch (error) {
      toast.error(recoveryErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  async function skipClient() {
    setBusy(true);
    try {
      await skip({ orgId, candidateId: candidate._id });
    } catch (error) {
      toast.error(recoveryErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  const price = formatPrice(
    candidate.priceMinorUnits,
    candidate.currency,
    locale,
  );
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{candidate.customerName}</p>
        <Badge
          variant={candidate.status === "failed" ? "destructive" : "secondary"}
        >
          {recoveryStatusLabel(candidate.status, t)}
        </Badge>
      </div>
      <p className="text-sm">
        {candidate.serviceName} · {time(candidate.startAt)}–
        {time(candidate.endAt)} · {price}
      </p>
      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        {candidate.reasons.map((reason, i) => (
          <li key={i}>{t(reason.en, reason.mk)}</li>
        ))}
      </ul>
      {candidate.failureReason && candidate.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>
            {t("The email was not delivered", "Пораката не е доставена")}
          </AlertTitle>
          <AlertDescription>{candidate.failureReason}</AlertDescription>
        </Alert>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                {t("Review email", "Прегледај порака")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("Opening offer", "Понуда за слободен термин")}
                </DialogTitle>
                <DialogDescription>
                  {candidate.customerEmail} · {candidate.serviceName} ·{" "}
                  {time(candidate.startAt)} · {price}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-6">{candidate.draftedMessage}</p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "The email includes a booking link. The offer lasts up to two hours, while the appointment remains available.",
                  "Пораката содржи линк за резервирање. Понудата важи најмногу два часа, додека терминот е слободен.",
                )}
              </p>
              <DialogFooter>
                <Button
                  onClick={approveEmail}
                  disabled={busy || !canSend || !candidate.canApprove}
                >
                  {busy && <Spinner data-icon="inline-start" />}
                  {candidate.status === "failed"
                    ? t("Retry email", "Испрати повторно")
                    : t("Approve email", "Одобри порака")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {candidate.canApprove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={skipClient}
              disabled={busy}
            >
              {t("Skip client", "Прескокни клиент")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
