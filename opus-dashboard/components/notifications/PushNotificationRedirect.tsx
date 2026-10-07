"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
export function PushNotificationRedirect() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { t } = useDashboardI18n();
  const open = useMutation(api.pushNotifications.openNotification);
  const attempted = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const valid = Boolean(id && /^[a-z0-9]{20,64}$/.test(id));
  useEffect(() => {
    if (!id || !valid) return;
    if (attempted.current === id) return;
    attempted.current = id;
    void open({ notificationId: id as Id<"notifications"> })
      .then((target) => {
        if (!target) {
          setFailed(true);
          return;
        }
        router.replace(
          target.kind === "appointment"
            ? `/beauty/bookings?booking=${encodeURIComponent(target.id)}&date=${encodeURIComponent(target.date)}`
            : `/ai-inbox?conversation=${encodeURIComponent(target.id)}`,
        );
      })
      .catch(() => setNetworkError(true));
  }, [id, valid, open, router, attempt]);
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4">
      {networkError ? (
        <>
          <p>
            {t(
              "Could not open the notification. Check your connection.",
              "Известувањето не се отвори. Провери ја врската.",
              "Njoftimi nuk u hap. Kontrolloni lidhjen.",
            )}
          </p>
          <Button
            onClick={() => {
              attempted.current = null;
              setNetworkError(false);
              setAttempt((value) => value + 1);
            }}
          >
            {t("Retry", "Обиди се повторно", "Provoni përsëri")}
          </Button>
        </>
      ) : failed || !valid ? (
        <>
          <p>
            {t(
              "This notification is no longer available.",
              "Ова известување повеќе не е достапно.",
              "Ky njoftim nuk është më i disponueshëm.",
            )}
          </p>
          <Button asChild variant="outline">
            <Link href="/beauty/bookings">
              {t("Open appointments", "Отвори термини", "Hapni terminet")}
            </Link>
          </Button>
        </>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
