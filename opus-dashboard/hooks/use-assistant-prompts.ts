"use client";

import {
  CalendarDays,
  ChartNoAxesCombined,
  TrendingDown,
  Users,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function useAssistantPrompts() {
  const { t } = useDashboardI18n();
  return [
    {
      icon: ChartNoAxesCombined,
      label: t("Review my month", "Преглед на месецот", "Rishiko muajin tim"),
      question: t(
        "How did last month compare with the month before?",
        "Каков беше минатиот месец во споредба со претходниот?",
        "Si u krahasua muaji i kaluar me muajin para tij?",
      ),
    },
    {
      icon: Users,
      label: t(
        "Understand my clients",
        "Запознај ги клиентите",
        "Kupto klientët e mi",
      ),
      question: t(
        "How many of my clients returned last month?",
        "Колку од моите клиенти се вратија минатиот месец?",
        "Sa nga klientët e mi u kthyen muajin e kaluar?",
      ),
    },
    {
      icon: CalendarDays,
      label: t(
        "Explore my calendar",
        "Истражи го календарот",
        "Shqyrto kalendarin tim",
      ),
      question: t(
        "What was my weakest day last month?",
        "Кој ми беше најслабиот ден минатиот месец?",
        "Cila ishte dita ime më e dobët muajin e kaluar?",
      ),
    },
    {
      icon: TrendingDown,
      label: t(
        "Look into cancellations",
        "Преглед на откажувања",
        "Shqyrto anulimet",
      ),
      question: t(
        "Which services had the most cancellations last month?",
        "Кои услуги имаа најмногу откажувања минатиот месец?",
        "Cilat shërbime patën më shumë anulime muajin e kaluar?",
      ),
    },
  ];
}
