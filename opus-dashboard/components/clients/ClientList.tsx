"use client";

import { ArrowUpRight, UsersRound } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientDate, type ClientRecord, type ClientValue } from "@/lib/clients";
import { formatPrice } from "@/lib/format-price";
import { ClientIdentity } from "./ClientIdentity";

export function ClientAmounts({ values }: { values: ClientValue[] }) {
  const { locale } = useDashboardI18n();
  return (
    <span className="flex flex-col gap-1 tabular-nums">
      {values.length
        ? values.map((value) => (
            <span key={value.currency}>
              {formatPrice(
                value.amountMinorUnits,
                value.currency,
                locale,
                value.amountMinorUnits % 100 !== 0,
              )}
            </span>
          ))
        : "—"}
    </span>
  );
}

export function ClientList({
  clients,
  filtered,
  onSelect,
  onClear,
}: {
  clients: ClientRecord[];
  filtered: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const { t, locale } = useDashboardI18n();
  if (!clients.length)
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRound />
          </EmptyMedia>
          <EmptyTitle>
            {filtered
              ? t("No matching clients", "Нема пронајдени клиенти")
              : t(
                  "Your clients will appear here",
                  "Вашите клиенти ќе се прикажат тука",
                )}
          </EmptyTitle>
          <EmptyDescription>
            {filtered
              ? t(
                  "Try another name, email, or phone number.",
                  "Обидете се со друго име, е-пошта или телефон.",
                )
              : t(
                  "Clients are added automatically when your team or a client makes an appointment.",
                  "Клиентите се додаваат автоматски кога вашиот тим или клиент ќе закаже термин.",
                )}
          </EmptyDescription>
        </EmptyHeader>
        {filtered && (
          <EmptyContent>
            <Button variant="outline" onClick={onClear}>
              {t("Clear filters", "Исчисти филтри")}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Client", "Клиент")}</TableHead>
              <TableHead>{t("Phone", "Телефон")}</TableHead>
              <TableHead>{t("Last visit", "Последна посета")}</TableHead>
              <TableHead className="text-right">
                {t("Visits", "Посети")}
              </TableHead>
              <TableHead className="text-right">
                {t("Completed value", "Вредност на посетите")}
              </TableHead>
              <TableHead>
                <span className="sr-only">
                  {t("Open profile", "Отвори профил")}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="max-w-64 py-4">
                  <button
                    className="w-full min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSelect(client.id)}
                    aria-label={t(
                      `View ${client.name}`,
                      `Погледни го профилот на ${client.name}`,
                    )}
                  >
                    <ClientIdentity client={client} />
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.phone || "—"}
                </TableCell>
                <TableCell>
                  {client.lastVisitAt
                    ? clientDate(client.lastVisitAt, locale)
                    : t("No visits yet", "Сè уште нема посети")}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{client.visits}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ClientAmounts values={client.completedValue} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelect(client.id)}
                    aria-label={t(
                      `Open ${client.name}'s profile`,
                      `Отвори профил на ${client.name}`,
                    )}
                  >
                    <ArrowUpRight />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {clients.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelect(client.id)}
            className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center justify-between gap-3">
              <ClientIdentity client={client} />
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </span>
            <span className="flex flex-wrap items-end justify-between gap-3 text-sm">
              <span className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t("Last visit", "Последна посета")}
                </span>
                {clientDate(client.lastVisitAt, locale)}
              </span>
              <Badge variant="secondary">
                {client.visits}{" "}
                {client.visits === 1
                  ? t("visit", "посета")
                  : t("visits", "посети")}
              </Badge>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
