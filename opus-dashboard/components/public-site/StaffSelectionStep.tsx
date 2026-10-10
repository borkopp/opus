"use client";

import { UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { initials } from "@/lib/dashboard-overview";
import { BookingChoiceCard } from "./BookingChoiceCard";
import { BookingStepShell } from "./BookingStepShell";
import { BookingSummary } from "./BookingSummary";
import { usePublicBookingI18n } from "./PublicBookingI18n";
import type { PublicSite } from "./types";

interface StaffSelectionStepProps {
  site: PublicSite;
  selectedServiceId: string;
  selectedStaffId?: string | "any";
  onSelectStaff: (staffId: string | "any") => void;
  onBack: () => void;
}

export function StaffSelectionStep({
  site,
  selectedServiceId,
  selectedStaffId,
  onSelectStaff,
  onBack,
}: StaffSelectionStepProps) {
  const { text } = usePublicBookingI18n();
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const eligibleStaff = site.staff.filter((member) =>
    (service?.staffIds as string[] | undefined)?.includes(member._id),
  );
  return (
    <BookingStepShell
      title={text("Изберете специјалист")}
      description={text(
        "Изберете член од тимот или прикажете термини кај сите достапни специјалисти.",
      )}
      backLabel={text("Назад кон услуги")}
      onBack={onBack}
      summary={
        service && (
          <BookingSummary
            serviceName={service.name}
            durationMins={service.durationMins}
            priceMinorUnits={service.priceMinorUnits}
            currency={service.currency}
          />
        )
      }
    >
      {eligibleStaff.length > 0 ? (
        <div className="grid gap-3">
          <BookingChoiceCard
            selected={selectedStaffId === "any"}
            onClick={() => onSelectStaff("any")}
          >
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold leading-6">
                  {text("Без претпочитан специјалист")}
                </span>
                <span className="text-sm leading-5 text-muted-foreground">
                  {text("Прикажи ги сите слободни термини за оваа услуга.")}
                </span>
              </span>
            </div>
          </BookingChoiceCard>
          {eligibleStaff.map((member) => (
            <BookingChoiceCard
              key={member._id}
              selected={selectedStaffId === member._id}
              onClick={() => onSelectStaff(member._id)}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar size="lg" className="size-12" aria-hidden="true">
                  {member.avatarUrl && (
                    <AvatarImage src={member.avatarUrl} alt="" />
                  )}
                  <AvatarFallback>
                    {initials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold leading-6 [overflow-wrap:anywhere]">
                    {member.displayName}
                  </span>
                  {member.specialties.length > 0 && (
                    <span className="text-pretty text-sm leading-5 text-muted-foreground">
                      {member.specialties.join(" · ")}
                    </span>
                  )}
                </span>
              </div>
            </BookingChoiceCard>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{text("Нема достапни специјалисти")}</EmptyTitle>
            <EmptyDescription>
              {text("Изберете друга услуга или контактирајте го студиото.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </BookingStepShell>
  );
}
