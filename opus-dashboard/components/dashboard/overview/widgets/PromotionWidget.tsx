"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ImagePlus,
  MessageSquareText,
  QrCode,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { appearStep } from "@/lib/appear";
import { WidgetFrame } from "../WidgetFrame";

export function PromotionWidget() {
  const { t } = useDashboardI18n();
  const tools = [
    {
      tab: "opening",
      icon: ImagePlus,
      title: t("Share an opening", "Сподели термин"),
      description: t(
        "A ready-to-post Instagram Story.",
        "Instagram Story подготвено за објава.",
      ),
    },
    {
      tab: "kit",
      icon: QrCode,
      title: t("Booking promotion kit", "Промотивен пакет"),
      description: t(
        "Your QR code, counter sign, and booking Story.",
        "QR-код, постер за пулт и Story за закажување.",
      ),
    },
    {
      tab: "replies",
      icon: MessageSquareText,
      title: t("Saved replies", "Зачувани одговори"),
      description: t(
        "Your answers, ready to copy.",
        "Вашите одговори, подготвени за копирање.",
      ),
    },
  ];
  return (
    <WidgetFrame
      title={t("Promote your studio", "Промовирајте го студиото")}
      subtitle={t(
        "Share your booking link and fill your calendar.",
        "Олеснете им на клиентите да закажат.",
      )}
      action={<Badge variant="secondary">Free</Badge>}
      delay={70}
    >
      <div className="grid mt-4 gap-3 sm:grid-cols-3">
        {tools.map((tool, index) => (
          <Link
            key={tool.tab}
            href={`/beauty/promote?tab=${tool.tab}`}
            data-appear="item"
            style={appearStep(3 + index)}
            className="group flex min-w-0 flex-col gap-4 rounded-2xl bg-muted/60 p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex items-center justify-between">
              <tool.icon className="size-5 text-primary" />
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{tool.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </WidgetFrame>
  );
}
