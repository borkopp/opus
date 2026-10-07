"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function PersonalStaffCalendar({
  orgId,
  bookings,
}: {
  orgId: Id<"orgs">;
  bookings: FunctionReturnType<typeof api.bookings.listBookingsByOrg>;
}) {
  const { t, language } = useDashboardI18n();
  const context = useQuery(api.staff.getPersonalContext);
  const change = useMutation(api.mobile.changeAppointmentStatus);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const selected = useSearchParams().get("booking");
  useEffect(() => {
    if (selected && bookings.some((booking) => booking._id === selected)) {
      const card = document.getElementById(`appointment-${selected}`);
      card?.scrollIntoView({ block: "center" });
      card?.focus({ preventScroll: true });
    }
  }, [selected, bookings, context]);
  const format = (timestamp: number) =>
    new Intl.DateTimeFormat(
      language === "mk" ? "mk-MK" : language === "sq" ? "sq-AL" : "en-GB",
      { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
    ).format(timestamp);
  if (!context) return <Skeleton className="h-64 w-full" />;
  const active = bookings
    .filter(
      (booking) =>
        ["confirmed", "checked_in"].includes(booking.status) &&
        booking.endAt > context.now,
    )
    .sort((a, b) => a.startAt - b.startAt);
  const history = bookings
    .filter((booking) => !active.some((item) => item._id === booking._id))
    .sort((a, b) => b.startAt - a.startAt);
  return (
    <div
      key={orgId}
      className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-6 overflow-y-auto p-4 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">
          {t("My appointments", "Мои термини", "Terminet e mia")}
        </h1>
        <p className="text-muted-foreground">
          {context.staffName} · {context.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(
            "Your assigned appointments and the client details needed for them.",
            "Вашите доделени термини и потребните детали за клиентите.",
            "Terminet e caktuara për ju dhe detajet e nevojshme të klientëve.",
          )}
        </p>
      </div>
      {[
        { title: t("Upcoming", "Претстојни", "Të ardhshme"), rows: active },
        { title: t("History", "Историја", "Historia"), rows: history },
      ].map((group) => (
        <section key={group.title} className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">{group.title}</h2>
          {group.rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "No appointments here yet.",
                "Сè уште нема термини тука.",
                "Nuk ka ende termine këtu.",
              )}
            </p>
          )}
          {group.rows.map((booking) => (
            <Card
              key={booking._id}
              id={`appointment-${booking._id}`}
              tabIndex={-1}
              className={
                selected === booking._id ? "ring-2 ring-primary" : undefined
              }
            >
              <CardHeader>
                <CardTitle>
                  {booking.customer?.name ?? t("Client", "Клиент", "Klienti")}
                </CardTitle>
                <CardDescription>
                  {booking.services.map((service) => service.name).join(", ")} ·{" "}
                  {format(booking.startAt)}
                </CardDescription>
                <Badge variant="secondary" className="w-fit">
                  {t(
                    booking.status === "confirmed"
                      ? "Confirmed"
                      : booking.status === "checked_in"
                        ? "Confirmed"
                        : booking.status === "completed"
                          ? "Completed"
                          : booking.status === "cancelled"
                            ? "Cancelled"
                            : "No-show",
                    booking.status === "confirmed"
                      ? "Потврден"
                      : booking.status === "checked_in"
                        ? "Потврден"
                        : booking.status === "completed"
                          ? "Завршен"
                          : booking.status === "cancelled"
                            ? "Откажан"
                            : "Не се појавил",
                    booking.status === "confirmed"
                      ? "Konfirmuar"
                      : booking.status === "checked_in"
                        ? "Konfirmuar"
                        : booking.status === "completed"
                          ? "Përfunduar"
                          : booking.status === "cancelled"
                            ? "Anuluar"
                            : "Nuk u paraqit",
                  )}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {booking.customer?.phone && (
                  <a href={`tel:${booking.customer.phone}`}>
                    {booking.customer.phone}
                  </a>
                )}
                {booking.customer?.email && (
                  <a
                    className="break-all"
                    href={`mailto:${booking.customer.email}`}
                  >
                    {booking.customer.email}
                  </a>
                )}
                {booking.customerNote && (
                  <p className="text-sm text-muted-foreground">
                    {booking.customerNote}
                  </p>
                )}
              </CardContent>
              {["confirmed", "checked_in"].includes(booking.status) && (
                <CardFooter className="flex flex-wrap gap-2">
                  {[
                    {
                      status: "completed" as const,
                      label: t("Complete", "Заврши", "Përfundo"),
                    },
                    {
                      status: "no_show" as const,
                      label: t("No-show", "Не се појавил", "Nuk u paraqit"),
                    },
                  ].map((action) => (
                    <Button
                      key={action.status}
                      variant="outline"
                      disabled={busyId === booking._id}
                      onClick={async () => {
                        setBusyId(booking._id);
                        try {
                          await change({
                            bookingId: booking._id,
                            status: action.status,
                          });
                          toast.success(
                            t(
                              "Appointment updated",
                              "Терминот е ажуриран",
                              "Termini u përditësua",
                            ),
                          );
                        } catch (error) {
                          toast.error(
                            accountErrorMessage(
                              error,
                              t(
                                "Could not update appointment",
                                "Терминот не се ажурираше",
                                "Termini nuk u përditësua",
                              ),
                            ),
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                  {cancelId === booking._id ? (
                    <>
                      <Button
                        variant="destructive"
                        disabled={busyId === booking._id}
                        onClick={async () => {
                          setBusyId(booking._id);
                          try {
                            await change({
                              bookingId: booking._id,
                              status: "cancelled",
                            });
                            setCancelId(null);
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
                                  "Could not cancel appointment",
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
                        {t(
                          "Confirm cancellation",
                          "Потврди откажување",
                          "Konfirmo anulimin",
                        )}
                      </Button>
                      <Button variant="ghost" onClick={() => setCancelId(null)}>
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
                      onClick={() => setCancelId(booking._id)}
                    >
                      {t("Cancel", "Откажи", "Anulo")}
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
