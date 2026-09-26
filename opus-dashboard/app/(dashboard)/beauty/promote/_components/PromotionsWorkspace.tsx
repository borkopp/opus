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
import type { PromotionLanguage } from "@/convex/lib/promotionTemplates";
import { OpeningStory } from "./OpeningStory";
import { PromotionKit } from "./PromotionKit";
import { SavedReplies } from "./SavedReplies";

export function PromotionsWorkspace() {
  const { t, language } = useDashboardI18n();
  const [contentLanguage, setContentLanguage] =
    useState<PromotionLanguage>(language);
  const data = useQuery(api.promotions.getWorkspace, {
    language: contentLanguage,
  });
  const params = useSearchParams();
  const router = useRouter();
  const tab = promotionTab(params.get("tab"));
  return (
    <div className="flex min-w-0 flex-col gap-7">
      <DashboardPageHeader
        replayPublicDescription
        replayPublicTitle
        title={t("Promote your studio", "Промовирајте го студиото")}
        description={t(
          "Turn an opening into a Story, share your booking link, and reply in seconds.",
          "Претворете слободен термин во Story, споделете линк за закажување и одговорете за неколку секунди.",
        )}
      >
        <Badge data-replay-public variant="secondary">
          {t("Included in Free", "Вклучено во Free")}
        </Badge>
      </DashboardPageHeader>
      {data === undefined ? (
        <div
          className="grid gap-6 lg:grid-cols-2"
          aria-label={t(
            "Loading promotion tools",
            "Се вчитуваат алатките за промоција",
          )}
        >
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : (
        <>
          {!data.published && (
            <Alert>
              <Globe />
              <AlertTitle data-replay-public>
                {t(
                  "Publish your booking website first",
                  "Прво објавете ја веб-страницата за закажување",
                )}
              </AlertTitle>
              <AlertDescription>
                <p data-replay-public>
                  {t(
                    "Your graphics and QR code will be ready when clients can book. You can prepare saved replies now.",
                    "Сликите и QR-кодот ќе бидат достапни кога клиентите ќе можат да закажуваат. Зачуваните одговори можете да ги подготвите сега.",
                  )}
                </p>
                <Button asChild variant="outline">
                  <Link data-replay-public href="/onboarding?step=review">
                    {t("Finish website setup", "Довршете ја веб-страницата")}
                    <ExternalLink data-icon="inline-end" />
                  </Link>
                </Button>
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
            className="gap-7"
          >
            <div className="flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div className="min-w-0 overflow-x-auto pb-1">
                <TabsList variant="line">
                  <TabsTrigger data-replay-public value="opening">
                    <ImagePlus />
                    {t("Share an opening", "Сподели термин")}
                  </TabsTrigger>
                  <TabsTrigger data-replay-public value="kit">
                    <QrCode />
                    {t("Booking kit", "Промотивен пакет")}
                  </TabsTrigger>
                  <TabsTrigger data-replay-public value="replies">
                    <MessageSquareText />
                    {t("Saved replies", "Зачувани одговори")}
                  </TabsTrigger>
                </TabsList>
              </div>
              <Field className="w-full sm:w-52">
                <FieldLabel data-replay-public htmlFor="promotion-language">
                  {t("Content language", "Јазик на содржината")}
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
