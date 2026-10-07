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
import { SettingsCard } from "@/components/settings/SettingsCard";

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
          "Nuk mund të rifreskohej abonimi juaj. Ju lutemi provoni përsëri.",
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
              "Një abonim ekziston tashmë. Rifreskoni statusin, pastaj hapni Menaxho faturimin.",
            )
          : code === "CHECKOUT_BUSY" || code === "CHECKOUT_PENDING"
            ? t(
                "Your checkout is still being processed. Please wait, then refresh the status.",
                "Плаќањето сè уште се обработува. Почекајте, па освежете го статусот.",
                "Pagesa juaj është ende duke u përpunuar. Ju lutemi prisni, pastaj rifreskoni statusin.",
              )
            : t(
                "Billing is temporarily unavailable. Please try again later.",
                "Наплатата моментално не е достапна. Обидете се повторно подоцна.",
                "Faturimi është përkohësisht i padisponueshëm. Ju lutemi provoni përsëri më vonë.",
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
          title={t("Subscription", "Претплата", "Abonimi")}
          description={t(
            "Your studio’s plan, payments, and invoices.",
            "Планот на вашето студио, плаќањата и фактурите.",
            "Plani i studios suaj, pagesat dhe faturat.",
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
                    {t(
                      "Subscribe to Pro",
                      "Претплатете се на Pro",
                      "Abonohuni në Pro",
                    )}
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
                    {t(
                      "Manage billing",
                      "Управување со наплата",
                      "Menaxhoni faturimin",
                    )}
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
                    {t("Refresh status", "Освежи статус", "Rifresko statusin")}
                  </Button>
                )}
              </>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-5">
            <BillingPlanSummary data={data} />
            <p
              data-replay-public
              className="max-w-2xl text-sm leading-6 text-muted-foreground"
            >
              {!data.canManage
                ? t(
                    "Only the studio owner can change the subscription or manage payments.",
                    "Само сопственикот на студиото може да ја менува претплатата и да управува со плаќањата.",
                    "Vetëm pronari i studios mund të ndryshojë abonimin ose të menaxhojë pagesat.",
                  )
                : data.plan === "paid" && !data.managed
                  ? t(
                      "Pro is already enabled for your studio. Contact us if you need help with your plan.",
                      "Pro е веќе активиран за вашето студио. Контактирајте нè за помош со планот.",
                      "Pro është tashmë i aktivizuar për studion tuaj. Na kontaktoni nëse keni nevojë për ndihmë me planin tuaj.",
                    )
                  : data.portalAvailable
                    ? t(
                        "Open Manage billing to update your card, download invoices, or cancel your subscription.",
                        "Отворете Управување со наплата за промена на картичката, преземање фактури или откажување на претплатата.",
                        "Hapni Menaxho faturimin për të përditësuar kartën tuaj, shkarkuar faturat ose anuluar abonimin tuaj.",
                      )
                    : t(
                        "Subscribe monthly to Pro. Review the price and any taxes before confirming your payment at checkout.",
                        "Претплатете се месечно на Pro. Проверете ги цената и евентуалните даноци пред да го потврдите плаќањето.",
                        "Abonohuni çdo muaj në Pro. Rishikoni çmimin dhe taksat para se të konfirmoni pagesën tuaj.",
                      )}
            </p>
            {data.subscription?.cancelAtPeriodEnd && data.plan === "paid" && (
              <Alert>
                <AlertDescription data-replay-public>
                  {t(
                    "Your subscription will not renew. Pro stays active until the end of your current billing period.",
                    "Претплатата нема да се обнови. Pro останува активен до крајот на тековниот платен период.",
                    "Abonimi juaj nuk do të rinovohet. Pro mbetet aktiv deri në fund të periudhës suaj aktuale të faturimit.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {data.managed && data.plan === "free" && (
              <Alert>
                <AlertDescription data-replay-public>
                  {t(
                    "Pro is not active. Open Manage billing to check your payment or subscription status.",
                    "Pro не е активен. Отворете Управување со наплата за да го проверите плаќањето или статусот на претплатата.",
                    "Pro nuk është aktiv. Hapni Menaxho faturimin për të kontrolluar pagesën tuaj ose statusin e abonimit.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {data.canManage &&
              !data.checkoutAvailable &&
              !data.portalAvailable &&
              data.plan === "free" && (
                <Alert>
                  <AlertDescription data-replay-public>
                    {t(
                      "Online subscriptions are not available yet. Your Free plan remains available.",
                      "Онлајн претплатите сè уште не се достапни. Бесплатниот план останува достапен.",
                      "Abonimet online nuk janë ende të disponueshme. Plani juaj Falas mbetet i disponueshëm.",
                    )}
                  </AlertDescription>
                </Alert>
              )}
            {data.syncFailed && (
              <Alert variant="destructive">
                <AlertDescription data-replay-public>
                  {t(
                    "We could not confirm the latest subscription status. Please refresh or contact support.",
                    "Не можевме да го потврдиме најновиот статус на претплатата. Освежете или контактирајте со поддршката.",
                    "Nuk mund të konfirmonim statusin më të fundit të abonimit. Ju lutemi rifreskoni ose kontaktoni mbështetjen.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {(returned || data.syncing) && (
              <p
                data-replay-public
                role="status"
                className="text-sm text-muted-foreground"
              >
                {data.plan === "paid"
                  ? t(
                      "Pro is active for your studio.",
                      "Pro е активен за вашето студио.",
                      "Pro është aktiv për studion tuaj.",
                    )
                  : t(
                      "Pro will activate after your payment is confirmed. If you have just paid, wait a moment and refresh the status.",
                      "Pro ќе се активира по потврдата на плаќањето. Ако штотуку плативте, почекајте малку и освежете го статусот.",
                      "Pro do të aktivizohet pasi të konfirmohet pagesa juaj. Nëse sapo keni paguar, prisni një moment dhe rifreskoni statusin.",
                    )}
              </p>
            )}
          </div>
        </SettingsCard>
      )}
    </TabsContent>
  );
}
