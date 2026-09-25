"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TabsContent } from "@/components/ui/tabs";
import { BillingPlanSummary } from "./BillingPlanSummary";
import { SettingsCard } from "../SettingsCard";

export function BillingTab() {
  const { t } = useDashboardI18n();
  const data = useQuery(api.billing.getStatus);
  const checkout = useAction(api.billingActions.createCheckout);
  const portal = useAction(api.billingActions.createPortal);
  const refresh = useAction(api.billingActions.refresh);
  const returned = useSearchParams().get("checkout") === "returned";
  const refreshed = useRef(false);
  const [pending, setPending] = useState<
    "checkout" | "portal" | "refresh" | null
  >(null);

  useEffect(() => {
    if (
      !returned ||
      !data?.canManage ||
      !(data.checkoutAvailable || data.portalAvailable) ||
      refreshed.current
    )
      return;
    refreshed.current = true;
    // A return URL is only a prompt to reconcile, never proof of payment.
    void refresh().catch(() => {
      toast.error(
        t(
          "Could not refresh your subscription. Please try again.",
          "Претплатата не може да се освежи. Обидете се повторно.",
        ),
      );
    });
  }, [
    returned,
    data?.canManage,
    data?.checkoutAvailable,
    data?.portalAvailable,
    refresh,
    t,
  ]);

  async function run(kind: "checkout" | "portal" | "refresh") {
    setPending(kind);
    try {
      if (kind === "refresh") await refresh();
      else {
        const result = await (kind === "checkout" ? checkout() : portal());
        window.location.assign(result.url);
      }
    } catch (error) {
      const code = error instanceof ConvexError ? error.data : null;
      const message =
        code === "ALREADY_PRO" || code === "SUBSCRIPTION_EXISTS"
          ? t(
              "A subscription already exists. Refresh the status, then open Manage billing.",
              "Веќе постои претплата. Освежете го статусот, па отворете Управување со наплата.",
            )
          : code === "CHECKOUT_BUSY" || code === "CHECKOUT_PENDING"
            ? t(
                "Your checkout is still being processed. Please wait, then refresh the status.",
                "Плаќањето сè уште се обработува. Почекајте, па освежете го статусот.",
              )
            : t(
                "Billing is temporarily unavailable. Please try again later.",
                "Наплатата моментално не е достапна. Обидете се повторно подоцна.",
              );
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <TabsContent value="billing" className="m-0">
      {data === undefined ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <SettingsCard
          className="min-w-0"
          title={t("Subscription", "Претплата")}
          description={t(
            "Your studio’s plan, payments, and invoices.",
            "Планот на вашето студио, плаќањата и фактурите.",
          )}
          footer={
            data.canManage ? (
              <>
                {data.plan === "free" && !data.hasOpenSubscription && (
                  <Button
                    onClick={() => void run("checkout")}
                    disabled={pending !== null || !data.checkoutAvailable}
                  >
                    {pending === "checkout" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <ArrowUpRight data-icon="inline-start" />
                    )}
                    {t("Subscribe to Pro", "Претплатете се на Pro")}
                  </Button>
                )}
                {data.portalAvailable && (
                  <Button
                    variant={
                      data.plan === "paid" || data.hasOpenSubscription
                        ? "default"
                        : "outline"
                    }
                    onClick={() => void run("portal")}
                    disabled={pending !== null}
                  >
                    {pending === "portal" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <CreditCard data-icon="inline-start" />
                    )}
                    {t("Manage billing", "Управување со наплата")}
                  </Button>
                )}
                {(data.checkoutAvailable || data.portalAvailable) && (
                  <Button
                    variant="ghost"
                    onClick={() => void run("refresh")}
                    disabled={pending !== null}
                  >
                    {pending === "refresh" || data.syncing ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <RefreshCw data-icon="inline-start" />
                    )}
                    {t("Refresh status", "Освежи статус")}
                  </Button>
                )}
              </>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-5">
            <BillingPlanSummary data={data} />
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {!data.canManage
                ? t(
                    "Only the studio owner can change the subscription or manage payments.",
                    "Само сопственикот на студиото може да ја менува претплатата и да управува со плаќањата.",
                  )
                : data.plan === "paid" && !data.managed
                  ? t(
                      "Pro is already enabled for your studio. Contact us if you need help with your plan.",
                      "Pro е веќе активиран за вашето студио. Контактирајте нè за помош со планот.",
                    )
                  : data.portalAvailable
                    ? t(
                        "Open Manage billing to update your card, download invoices, or cancel your subscription.",
                        "Отворете Управување со наплата за промена на картичката, преземање фактури или откажување на претплатата.",
                      )
                    : t(
                        "Subscribe monthly to Pro. Review the price and any taxes before confirming your payment at checkout.",
                        "Претплатете се месечно на Pro. Проверете ги цената и евентуалните даноци пред да го потврдите плаќањето.",
                      )}
            </p>
            {data.subscription?.cancelAtPeriodEnd && data.plan === "paid" && (
              <Alert>
                <AlertDescription>
                  {t(
                    "Your subscription will not renew. Pro stays active until the end of your current billing period.",
                    "Претплатата нема да се обнови. Pro останува активен до крајот на тековниот платен период.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {data.managed && data.plan === "free" && (
              <Alert>
                <AlertDescription>
                  {t(
                    "Pro is not active. Open Manage billing to check your payment or subscription status.",
                    "Pro не е активен. Отворете Управување со наплата за да го проверите плаќањето или статусот на претплатата.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {data.canManage &&
              !data.checkoutAvailable &&
              !data.portalAvailable &&
              data.plan === "free" && (
                <Alert>
                  <AlertDescription>
                    {t(
                      "Online subscriptions are not available yet. Your Free plan remains available.",
                      "Онлајн претплатите сè уште не се достапни. Бесплатниот план останува достапен.",
                    )}
                  </AlertDescription>
                </Alert>
              )}
            {data.syncFailed && (
              <Alert variant="destructive">
                <AlertDescription>
                  {t(
                    "We could not confirm the latest subscription status. Please refresh or contact support.",
                    "Не можевме да го потврдиме најновиот статус на претплатата. Освежете или контактирајте со поддршката.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {(returned || data.syncing) && (
              <p role="status" className="text-sm text-muted-foreground">
                {data.plan === "paid"
                  ? t(
                      "Pro is active for your studio.",
                      "Pro е активен за вашето студио.",
                    )
                  : t(
                      "Pro will activate after your payment is confirmed. If you have just paid, wait a moment and refresh the status.",
                      "Pro ќе се активира по потврдата на плаќањето. Ако штотуку плативте, почекајте малку и освежете го статусот.",
                    )}
              </p>
            )}
          </div>
        </SettingsCard>
      )}
    </TabsContent>
  );
}
