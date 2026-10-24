"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Globe,
  ImagePlus,
  MessageSquareText,
  QrCode,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Appear } from "@/components/ui/appear";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { promotionTab } from "@/lib/promotions";
import { BILLING_PATH } from "@/lib/upgrade";
import type { PromotionLanguage } from "@/convex/lib/promotionTemplates";
import { OpeningStory } from "./OpeningStory";
import { PromotionKit } from "./PromotionKit";
import { SavedReplies } from "./SavedReplies";

export function PromotionsWorkspace() {
  const { t, language } = useDashboardI18n();
  const [contentLanguage, setContentLanguage] = useState<PromotionLanguage>(
    language === "mk" ? "mk" : "en",
  );
  const data = useQuery(api.promotions.getWorkspace, {
    language: contentLanguage,
  });
  const params = useSearchParams();
  const router = useRouter();
  const tab = promotionTab(params.get("tab"));
  const expired = data?.accessState === "expired";
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardPageHeader
        replayPublicDescription
        replayPublicTitle
        title={t(
          "Promote your studio",
          "Промовирајте го студиото",
          "Promovoni studion tuaj",
        )}
        description={t(
          "Turn an opening into a Story, share your booking link, and reply in seconds.",
          "Претворете слободен термин во Story, споделете линк за закажување и одговорете за неколку секунди.",
          "Ktheni një termin të lirë në Story, ndani linkun e rezervimit dhe përgjigjuni në sekonda.",
        )}
      >
        {data && !expired && (
          <Badge data-replay-public variant="secondary">
            {t(
              "Included in your plan",
              "Вклучено во вашиот план",
              "Përfshirë në planin tuaj",
            )}
          </Badge>
        )}
        {data?.published && (
          <Button asChild variant="outline">
            <a href={data.websiteUrl} target="_blank" rel="noreferrer">
              {t("View website", "Види веб-страница", "Shiko faqen")}
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        )}
      </DashboardPageHeader>
      {data === undefined ? (
        <div
          className="grid gap-6 lg:grid-cols-2"
          aria-label={t(
            "Loading promotion tools",
            "Се вчитуваат алатките за промоција",
            "Po ngarkohen mjetet e promovimit",
          )}
        >
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : (
        <>
          {!data.acceptingBookings && (
            <Alert>
              <Globe />
              <AlertTitle data-replay-public>
                {expired
                  ? t(
                      "A paid plan is needed",
                      "Потребен е платен план",
                      "Nevojitet një plan me pagesë",
                    )
                  : t(
                      "Publish your booking website first",
                      "Прво објавете ја веб-страницата за закажување",
                      "Publikoni fillimisht faqen tuaj të rezervimit",
                    )}
              </AlertTitle>
              <AlertDescription>
                <p data-replay-public>
                  {expired
                    ? t(
                        "Choose a paid plan to accept new bookings and share booking graphics again. Your saved replies are kept.",
                        "Изберете платен план за повторно да примате нови закажувања и да споделувате слики за закажување. Зачуваните одговори остануваат.",
                        "Zgjidhni një plan me pagesë për të pranuar rezervime të reja dhe për të shpërndarë sërish grafika rezervimi. Përgjigjet tuaja të ruajtura mbeten.",
                      )
                    : t(
                        "Your graphics and QR code will be ready when clients can book. You can prepare saved replies now.",
                        "Сликите и QR-кодот ќе бидат достапни кога клиентите ќе можат да закажуваат. Зачуваните одговори можете да ги подготвите сега.",
                        "Grafikat dhe QR-kodi juaj do të jenë gati kur klientët të mund të rezervojnë. Mund të përgatitni përgjigjet e ruajtura tani.",
                      )}
                </p>
                {!expired || data.canManageBilling ? (
                  <Button asChild variant="outline">
                    <Link
                      data-replay-public
                      href={expired ? BILLING_PATH : "/onboarding?step=review"}
                    >
                      {expired
                        ? t(
                            "Choose a plan",
                            "Изберете план",
                            "Zgjidhni një plan",
                          )
                        : t(
                            "Finish website setup",
                            "Довршете ја веб-страницата",
                            "Përfundo konfigurimin e faqes",
                          )}
                      <ExternalLink data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : (
                  <p data-replay-public>
                    {t(
                      "Contact your studio owner.",
                      "Контактирајте го сопственикот на студиото.",
                      "Kontaktoni pronarin e studios.",
                    )}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const next = new URLSearchParams(params);
              next.set("tab", value);
              router.replace(`/beauty/promote?${next}`, { scroll: false });
            }}
            className="gap-6"
          >
            <div className="flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div className="min-w-0 overflow-x-auto pb-1">
                <TabsList className="workspace-segments">
                  <TabsTrigger data-replay-public value="kit">
                    <QrCode />
                    {t(
                      "Booking kit",
                      "Промотивен пакет",
                      "Paketa e rezervimit",
                    )}
                  </TabsTrigger>
                  <TabsTrigger data-replay-public value="opening">
                    <ImagePlus />
                    {t(
                      "Share an opening",
                      "Сподели термин",
                      "Shpërndaj një termin të lirë",
                    )}
                  </TabsTrigger>
                  <TabsTrigger data-replay-public value="replies">
                    <MessageSquareText />
                    {t(
                      "Saved replies",
                      "Зачувани одговори",
                      "Përgjigjet e ruajtura",
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              <Field className="w-full sm:w-52">
                <FieldLabel data-replay-public htmlFor="promotion-language">
                  {t(
                    "Content language",
                    "Јазик на содржината",
                    "Gjuha e përmbajtjes",
                  )}
                </FieldLabel>
                <Select
                  value={contentLanguage}
                  onValueChange={(value) =>
                    setContentLanguage(value as PromotionLanguage)
                  }
                >
                  <SelectTrigger id="promotion-language" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem data-replay-public value="mk">
                        Македонски
                      </SelectItem>
                      <SelectItem data-replay-public value="en">
                        English
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <TabsContent value="opening">
              <Appear key={`${data.orgId}-opening-${contentLanguage}`}>
                <OpeningStory
                  data={data}
                  language={contentLanguage}
                  initialDate={params.get("date")}
                  initialStaff={params.get("staff")}
                  initialTime={params.get("at")}
                />
              </Appear>
            </TabsContent>
            <TabsContent value="kit">
              <Appear key={`${data.orgId}-kit-${contentLanguage}`}>
                <PromotionKit data={data} language={contentLanguage} />
              </Appear>
            </TabsContent>
            <TabsContent value="replies">
              <Appear key={`${data.orgId}-replies-${contentLanguage}`}>
                <SavedReplies data={data} language={contentLanguage} />
              </Appear>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
