"use client";

import { useId, useRef, type Ref } from "react";
import { Search, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ReservationStatusFilter } from "@/lib/reservation-list";

export function ReservationListFilters({
  search,
  status,
  counts,
  total,
  visible,
  hasPending,
  selectedStatusRef,
  onSearchChange,
  onStatusChange,
  onReset,
}: {
  search: string;
  status: ReservationStatusFilter;
  counts: Record<ReservationStatusFilter, number> | undefined;
  total: number | undefined;
  visible: number;
  hasPending: boolean;
  selectedStatusRef: Ref<HTMLButtonElement>;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: ReservationStatusFilter) => void;
  onReset: () => void;
}) {
  const { t } = useDashboardI18n();
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const options: Array<{ value: ReservationStatusFilter; label: string }> = [
    { value: "all", label: t("All", "Сите", "Të gjitha") },
    { value: "upcoming", label: t("Upcoming", "Очекувани", "Në pritje") },
    { value: "arrived", label: t("Arrived", "Пристигнати", "Të mbërritur") },
    { value: "seated", label: t("Seated", "Седнати", "Të ulur") },
    { value: "completed", label: t("Completed", "Завршени", "Të përfunduara") },
    { value: "cancelled", label: t("Cancelled", "Откажани", "Të anuluara") },
    { value: "no_show", label: t("No-show", "Не дојдоа", "Nuk u paraqitën") },
  ];
  if (hasPending || status === "pending") {
    options.push({
      value: "pending",
      label: t("Pending", "Непотврдени", "Të pakonfirmuara"),
    });
  }
  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-4 sm:p-5"
      aria-label={t(
        "Reservation filters",
        "Филтри за резервации",
        "Filtrat e rezervimeve",
      )}
    >
      <FieldGroup>
        <Field className="min-w-0 sm:max-w-md">
          <FieldLabel htmlFor={searchId}>
            {t("Search guests", "Пребарај гости", "Kërko mysafirë")}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={searchId}
              ref={input}
              placeholder={t(
                "Name or phone number",
                "Име или телефонски број",
                "Emri ose numri i telefonit",
              )}
              autoComplete="off"
              spellCheck={false}
              maxLength={150}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onSearchChange("");
              }}
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  aria-label={t(
                    "Clear search",
                    "Исчисти пребарување",
                    "Pastro kërkimin",
                  )}
                  onClick={() => {
                    onSearchChange("");
                    input.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </Field>
      </FieldGroup>
      <ToggleGroup
        type="single"
        variant="selection"
        spacing={2}
        className="w-full flex-wrap justify-start"
        aria-label={t(
          "Visit status",
          "Статус на посетата",
          "Statusi i vizitës",
        )}
        value={status}
        onValueChange={(value) => {
          if (value) onStatusChange(value as ReservationStatusFilter);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            ref={status === option.value ? selectedStatusRef : undefined}
            aria-description={
              counts
                ? t(
                    `${counts[option.value]} matching visits`,
                    `${counts[option.value]} соодветни посети`,
                    `${counts[option.value]} vizita që përputhen`,
                  )
                : undefined
            }
          >
            {option.label}
            <span className="tabular-nums" aria-hidden="true">
              {counts?.[option.value] ?? "—"}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          <p role="status" aria-live="polite" aria-atomic="true">
            {total === undefined
              ? t(
                  "Loading reservations…",
                  "Се вчитуваат резервациите…",
                  "Duke ngarkuar rezervimet…",
                )
              : t(
                  `Showing ${visible} of ${total} visits`,
                  `Прикажани ${visible} од ${total} посети`,
                  `Shfaqen ${visible} nga ${total} vizita`,
                )}
          </p>
          <p>
            {t(
              "Selected service date and carried-over visits. Counts match your search.",
              "Избраниот датум и пренесените посети. Бројките се според пребарувањето.",
              "Data e zgjedhur dhe vizitat e bartura. Numrat përputhen me kërkimin.",
            )}
          </p>
        </div>
        {(search || status !== "all") && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t("Reset filters", "Ресетирај филтри", "Rivendos filtrat")}
          </Button>
        )}
      </div>
    </section>
  );
}
