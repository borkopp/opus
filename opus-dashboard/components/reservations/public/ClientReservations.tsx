"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { reservationDateTime } from "@/lib/reservation-format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Separate projection keeps old beauty consumers and their response shape intact. */
export function ClientReservations() {
  const copy = useReservationCopy();
  const { t, locale } = useDashboardI18n();
  const reservations = useQuery(api.reservationPublic.listMine, {});
  // Keep the account view focused when this client has no table reservations.
  if (!reservations?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t(
            "Table reservations",
            "Резервации на маси",
            "Rezervime tavolinash",
          )}
        </CardTitle>
        <CardDescription>
          {t(
            "Your latest restaurant and café visits",
            "Вашите најнови посети во ресторани и кафулиња",
            "Vizitat tuaja të fundit në restorante dhe kafene",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          {t(
            "Shows up to 100 recent reservations per venue. You can also open an older reservation using its confirmation email.",
            "Се прикажуваат до 100 најнови резервации по локал. Постара резервација можете да отворите преку потврдата по е-пошта.",
            "Shfaqen deri në 100 rezervimet e fundit për lokal. Mund të hapni edhe një rezervim më të vjetër nga emaili i konfirmimit.",
          )}
        </p>
        {reservations.map(({ venue, reservation }) => (
          <div
            key={reservation.id}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{venue.name}</p>
              <Badge variant="secondary">
                {copy(reservation.status).replaceAll("_", " ")}
              </Badge>
            </div>
            <p className="text-sm">
              {reservationDateTime(reservation.startAt, venue.timezone, locale)}{" "}
              · {reservation.partySize}
              {t(" guests", " гости", " mysafirë")}
            </p>
            <Button asChild variant="outline">
              <Link href={`/reserve/${venue.slug}/manage/${reservation.id}`}>
                {t(
                  "Manage reservation",
                  "Управувајте со резервацијата",
                  "Menaxhoni rezervimin",
                )}
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
