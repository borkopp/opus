"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { accountErrorMessage } from "@/lib/account-errors";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type Appointments = FunctionReturnType<typeof api.opusUsers.getMyBookings>;

export function ClientAppointments({
  appointments,
}: {
  appointments: Appointments;
}) {
  const { t, language } = useDashboardI18n();
  const cancel = useMutation(api.opusUsers.cancelMyBooking);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const upcoming = appointments
    .filter((booking) => booking.isUpcoming)
    .sort((a, b) => a.startAt - b.startAt);
  const history = appointments.filter((booking) => !booking.isUpcoming);
  const date = (timestamp: number) =>
    new Intl.DateTimeFormat(
      language === "mk" ? "mk-MK" : language === "sq" ? "sq-AL" : "en-GB",
      { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
    ).format(timestamp);
  return (
    <div className="flex flex-col gap-6">
      {[
        {
          title: t(
            "Upcoming appointments",
            "Претстојни термини",
            "Terminet e ardhshme",
          ),
          bookings: upcoming,
        },
        {
          title: t(
            "Appointment history",
            "Историја на термини",
            "Historia e termineve",
          ),
          bookings: history,
        },
      ].map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">{group.title}</h2>
          {group.bookings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "No appointments here yet.",
                "Сè уште нема термини тука.",
                "Nuk ka ende termine këtu.",
              )}
            </p>
          )}
          {group.bookings.map((booking) => (
            <Card key={booking._id}>
              <CardHeader>
                <CardTitle>{booking.serviceName}</CardTitle>
                <CardDescription>
                  {booking.orgName} · {booking.staffName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <span>{date(booking.startAt)}</span>
                <Badge variant="secondary">
                  {t(
                    booking.status === "confirmed"
                      ? "Confirmed"
                      : booking.status === "cancelled"
                        ? "Cancelled"
                        : booking.status === "completed"
                          ? "Completed"
                          : booking.status === "checked_in"
                            ? "Arrived"
                            : "No-show",
                    booking.status === "confirmed"
                      ? "Потврден"
                      : booking.status === "cancelled"
                        ? "Откажан"
                        : booking.status === "completed"
                          ? "Завршен"
                          : booking.status === "checked_in"
                            ? "Пристигнат"
                            : "Не се појавил",
                    booking.status === "confirmed"
                      ? "Konfirmuar"
                      : booking.status === "cancelled"
                        ? "Anuluar"
                        : booking.status === "completed"
                          ? "Përfunduar"
                          : booking.status === "checked_in"
                            ? "Mbërritur"
                            : "Nuk u paraqit",
                  )}
                </Badge>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/book/${encodeURIComponent(booking.orgSlug)}`}>
                    {t("Book again", "Закажи повторно", "Rezervo përsëri")}
                  </Link>
                </Button>
                {booking.canCancel &&
                  (confirmId === booking._id ? (
                    <>
                      <Button
                        variant="destructive"
                        disabled={busyId === booking._id}
                        onClick={async () => {
                          setBusyId(booking._id);
                          try {
                            await cancel({ bookingId: booking._id });
                            setConfirmId(null);
                            toast.success(
                              t(
                                "Appointment cancelled",
                                "Терминот е откажан",
                                "Termini u anulua",
                              ),
                            );
                          } catch (error) {
                            toast.error(
                              accountErrorMessage(
                                error,
                                t(
                                  "Could not cancel",
                                  "Откажувањето не успеа",
                                  "Anulimi dështoi",
                                ),
                              ),
                            );
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        {busyId === booking._id && (
                          <Spinner data-icon="inline-start" />
                        )}
                        {t(
                          "Confirm cancellation",
                          "Потврди откажување",
                          "Konfirmo anulimin",
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        {t(
                          "Keep appointment",
                          "Задржи термин",
                          "Mbaj terminin",
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmId(booking._id)}
                    >
                      {t(
                        "Cancel appointment",
                        "Откажи термин",
                        "Anulo terminin",
                      )}
                    </Button>
                  ))}
                {booking.isUpcoming && !booking.canCancel && (
                  <p className="w-full text-sm text-muted-foreground">
                    {t(
                      "Contact the studio to change this appointment.",
                      "Контактирајте го студиото за промена на терминот.",
                      "Kontaktoni studion për të ndryshuar këtë termin.",
                    )}
                  </p>
                )}
              </CardFooter>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
