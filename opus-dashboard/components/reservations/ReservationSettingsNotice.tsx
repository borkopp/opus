"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ReservationSettingsNotice({
  missing = false,
}: {
  missing?: boolean;
}) {
  const { t } = useDashboardI18n();
  return (
    <Alert>
      <AlertTitle>
        {missing
          ? t(
              "Reservation settings are missing",
              "Недостигаат поставките за резервации",
              "Mungojnë cilësimet e rezervimeve",
            )
          : t(
              "Review your reservation settings",
              "Проверете ги поставките за резервации",
              "Rishikoni cilësimet e rezervimeve",
            )}
      </AlertTitle>
      <AlertDescription>
        <p>
          {missing
            ? t(
                "Contact OPUS support to restore this venue’s settings before configuring reservations. Your existing data is preserved.",
                "Контактирајте ја поддршката на OPUS за да ги обновите поставките пред да поставите резервации. Постојните податоци се зачувани.",
                "Kontaktoni mbështetjen e OPUS për të rikthyer cilësimet para konfigurimit të rezervimeve. Të dhënat ekzistuese janë ruajtur.",
              )
            : t(
                "Confirm the venue timezone and reservation rules before configuring closures.",
                "Потврдете ги временската зона и правилата за резервации пред да поставите затворања.",
                "Konfirmoni zonën kohore dhe rregullat e rezervimeve para konfigurimit të mbylljeve.",
              )}
        </p>
        {!missing && (
          <Button asChild variant="outline">
            <Link href="/hospitality/setup?tab=rules">
              {t(
                "Review hours and rules",
                "Проверете ги часовите и правилата",
                "Rishikoni orarin dhe rregullat",
              )}
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
