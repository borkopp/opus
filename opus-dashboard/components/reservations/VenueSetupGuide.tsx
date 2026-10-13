"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Globe,
  MapPin,
  Table2,
} from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;

export function VenueSetupGuide({ workspace }: { workspace: Workspace }) {
  const { t } = useDashboardI18n();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const published = workspace.org.websiteStatus === "published";
  if (published && workspace.readiness.ready) return null;
  const status = published
    ? t(
        "Online reservations paused",
        "Онлајн резервациите се паузирани",
        "Rezervimet online janë pezulluar",
      )
    : t(
        "Online reservations are off",
        "Онлајн резервациите се исклучени",
        "Rezervimet online janë të çaktivizuara",
      );
  if (workspace.role === "staff")
    return (
      <Alert>
        <Globe />
        <AlertTitle>{status}</AlertTitle>
        <AlertDescription>
          {t(
            "Your owner or manager can finish venue setup before online reservations open.",
            "Сопственикот или менаџерот може да го доврши поставувањето пред да се отворат онлајн резервациите.",
            "Pronari ose menaxheri mund të përfundojë konfigurimin para hapjes së rezervimeve online.",
          )}
        </AlertDescription>
      </Alert>
    );
  const complete = (code: string) =>
    workspace.readiness.requirements.some(
      (item) => item.code === code && item.complete,
    );
  const steps = [
    {
      tab: "profile",
      icon: MapPin,
      title: t(
        "Add venue details",
        "Додајте детали за локалот",
        "Shtoni të dhënat e lokalit",
      ),
      description: t(
        "Address and contact phone",
        "Адреса и контакт телефон",
        "Adresa dhe telefoni i kontaktit",
      ),
      complete: complete("profile"),
      ownerOnly: true,
    },
    {
      tab: "rules",
      icon: Clock3,
      title: t(
        "Set hours and booking rules",
        "Поставете часови и правила",
        "Caktoni orarin dhe rregullat",
      ),
      description: t(
        "When guests can visit and how long they stay",
        "Кога може да дојдат гостите и колку остануваат",
        "Kur mund të vijnë mysafirët dhe sa qëndrojnë",
      ),
      complete: complete("settings"),
      ownerOnly: false,
    },
    {
      tab: "tables",
      href: "/hospitality/tables?tab=tables",
      icon: Table2,
      title: t("Add your tables", "Додајте ги масите", "Shtoni tavolinat"),
      description: t(
        "Seats, areas and optional table combinations",
        "Седишта, зони и опционални комбинации на маси",
        "Vendet, zonat dhe kombinimet opsionale të tavolinave",
      ),
      complete: complete("tables"),
      ownerOnly: false,
    },
    {
      tab: "publish",
      icon: Globe,
      title: t(
        "Preview and publish",
        "Прегледајте и објавете",
        "Shikoni dhe publikoni",
      ),
      description: t(
        "Make your reservation page available to guests",
        "Направете ја страницата достапна за гостите",
        "Bëjeni faqen e rezervimeve të disponueshme për mysafirët",
      ),
      complete: published && workspace.readiness.ready,
      ownerOnly: true,
    },
  ];
  const next = steps.find(
    (step) => !step.complete && (workspace.role === "owner" || !step.ownerOnly),
  );
  const completed = steps.filter((step) => step.complete).length;
  const highlighted = next ?? steps.find((step) => !step.complete) ?? steps[0];
  const legacyNeedsReview = !complete("legacy");
  return (
    <Card data-testid="venue-setup-guide">
      <CardHeader>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">{status}</Badge>
          <span className="text-sm text-muted-foreground">
            {t(
              `${completed} of 4 complete`,
              `${completed} од 4 завршени`,
              `${completed} nga 4 të përfunduara`,
            )}
          </span>
        </div>
        <CardTitle>
          {t(
            "Set up reservations at your pace",
            "Поставете ги резервациите со ваше темпо",
            "Konfiguroni rezervimet me ritmin tuaj",
          )}
        </CardTitle>
        <CardDescription>
          {t(
            "Your dashboard is ready. Complete these details when you’re ready to take reservations.",
            "Вашата контролна табла е подготвена. Довршете ги овие детали кога ќе бидете подготвени да примате резервации.",
            "Paneli juaj është gati. Plotësoni këto të dhëna kur të jeni gati të pranoni rezervime.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol id={listId} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.tab}
              className={cn(
                !expanded && step.tab !== highlighted.tab && "hidden sm:block",
              )}
            >
              <Link
                href={step.href ?? `/hospitality/setup?tab=${step.tab}`}
                className="group flex h-full items-start gap-3 rounded-lg border bg-background p-4 outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {step.complete ? (
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <step.icon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-medium">{step.title}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </span>
                  {step.complete && (
                    <span className="sr-only">
                      {t("Complete", "Завршено", "Përfunduar")}
                    </span>
                  )}
                  {!step.complete &&
                    step.ownerOnly &&
                    workspace.role === "manager" && (
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "Owner action",
                          "Задача за сопственикот",
                          "Veprim i pronarit",
                        )}
                      </span>
                    )}
                </div>
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 w-full sm:hidden"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? t(
                "Show next step",
                "Прикажи го следниот чекор",
                "Shfaq hapin e radhës",
              )
            : t(
                "View all setup steps",
                "Прикажи ги сите чекори",
                "Shiko të gjithë hapat",
              )}
          <ChevronDown
            data-icon="inline-end"
            className={cn(expanded && "rotate-180")}
          />
        </Button>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          {legacyNeedsReview
            ? t(
                "Existing reservations need a review before new bookings can open.",
                "Постојните резервации треба да се проверат пред да се отворат нови резервации.",
                "Rezervimet ekzistuese duhet të rishikohen para hapjes së rezervimeve të reja.",
              )
            : published
              ? t(
                  "New online reservations resume when the required details are complete.",
                  "Новите онлајн резервации продолжуваат откако ќе се довршат потребните детали.",
                  "Rezervimet e reja online rifillojnë kur plotësohen të dhënat e nevojshme.",
                )
              : t(
                  "Your venue stays private until the owner publishes it.",
                  "Локалот останува приватен додека сопственикот не го објави.",
                  "Lokali mbetet privat derisa pronari ta publikojë.",
                )}
        </p>
        {next && (
          <Button asChild>
            <Link
              href={next.href ?? `/hospitality/setup?tab=${next.tab}`}
              data-testid="venue-setup-next"
            >
              {t(
                "Continue setup",
                "Продолжи со поставување",
                "Vazhdo konfigurimin",
              )}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
