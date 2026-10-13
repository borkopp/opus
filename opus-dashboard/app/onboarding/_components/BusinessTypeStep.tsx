"use client";

import Link from "next/link";
import { ArrowRight, Scissors, Utensils } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { onboardingChoicePath } from "@/lib/onboarding";
import { businessTypes } from "@/lib/i18n/onboarding";
import { StepFrame } from "./OnboardingStep";

export function BusinessTypeStep({ search }: { search: string }) {
  const { t } = useDashboardI18n();
  return (
    <StepFrame
      wide
      replayPublicTitle
      replayPublicDescription
      title={t(
        "What kind of business do you run?",
        "Каков бизнис водите?",
        "Çfarë biznesi drejtoni?",
      )}
      description={t(
        "Choose your business type to set up the right booking experience.",
        "Изберете тип на бизнис за да го поставите соодветниот начин на резервирање.",
        "Zgjidhni llojin e biznesit për të konfiguruar rezervimet e duhura.",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {businessTypes.map((option) => {
          const Icon =
            option.industry === "beauty_wellness" ? Scissors : Utensils;
          return (
            <Card key={option.industry}>
              <CardHeader>
                <CardTitle>
                  {t(option.label[0], option.label[1], option.label[2])}
                </CardTitle>
                <CardDescription>
                  {t(
                    option.description[0],
                    option.description[1],
                    option.description[2],
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <Icon
                  className="size-8 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardContent>
              <CardFooter>
                <Button asChild className="min-h-12 w-full">
                  <Link
                    data-testid={
                      option.industry === "beauty_wellness"
                        ? "choose-beauty"
                        : "choose-hospitality"
                    }
                    href={onboardingChoicePath(search, option.industry)}
                  >
                    {t(option.label[0], option.label[1], option.label[2])}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </StepFrame>
  );
}
