"use client";

import Link from "next/link";
import { ArrowUpRight, LockKeyhole, UsersRound } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UPGRADE_PATH } from "@/lib/upgrade";

// Deliberately fictional placeholders. Free clients never fetch the directory.
const samples = [
  { name: "Sample client one", visits: 12, value: "18,000" },
  { name: "Sample client two", visits: 8, value: "12,400" },
  { name: "Sample client three", visits: 6, value: "9,600" },
];

export function AnalyticsClientPreview() {
  const { t } = useDashboardI18n();
  return (
    <Card className="min-w-0 gap-5 rounded-3xl border-0 py-6 shadow-none">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <CardTitle>
            {t(
              "Client directory",
              "Именик на клиенти",
              "Regjistri i klientëve",
            )}
          </CardTitle>
          <CardDescription>
            {t(
              "A little preview of the bigger picture.",
              "Мал преглед на целосната слика.",
              "Një pamje e vogël e tablosë së plotë.",
            )}
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {t("3 sample clients", "3 демо корисници", "3 klientë shembull")}
        </Badge>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        <div className="flex flex-col divide-y">
          {samples.map((sample, index) => (
            <div key={sample.name} className="flex items-center gap-3 py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                <UsersRound className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  aria-hidden
                  className="pointer-events-none select-none text-sm font-medium blur-[5px]"
                >
                  {t(sample.name, `Демо корисник ${index + 1}`, sample.name)}
                </p>
                <span className="sr-only">
                  {t(
                    "Hidden sample name",
                    "Скриено име на демо корисник",
                    "Emër shembull i fshehur",
                  )}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Sample profile", "Демо профил", "Profil shembull")}
                </p>
              </div>
              <div className="text-right text-sm tabular-nums">
                <p>
                  {sample.visits} {t("visits", "посети", "vizita")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sample.value} MKD
                </p>
              </div>
              <LockKeyhole
                className="ml-2 size-3.5 text-muted-foreground"
                aria-hidden
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary/70 p-4">
          <p className="max-w-sm text-sm text-muted-foreground">
            {t(
              "See every client, their visit history, and contact details with Pro.",
              "Со Pro видете ги сите клиенти, нивните посети и контакт-податоци.",
              "Shikoni çdo klient, historikun e vizitave dhe kontaktet me Pro.",
            )}
          </p>
          <Button asChild size="sm">
            <Link href={UPGRADE_PATH}>
              {t("Unlock clients", "Отклучи клиенти", "Zhblloko klientët")}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
