import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import { ArrowDownLeft, ArrowUpRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import type { OverviewData } from "@/lib/dashboard-overview";
import type { QuickBookingSelection } from "@/components/bookings/QuickBookingProvider";
import s from "../../clarity.module.css";
export function OpenSlotsCard({
  loaded,
  available,
  staff,
  onBook,
  onShare,
}: {
  loaded: boolean;
  available: QuickBookingSelection[];
  staff: OverviewData["staff"];
  onBook: (slot?: QuickBookingSelection) => void;
  onShare?: (slot: QuickBookingSelection) => void;
}) {
  const { t } = useDashboardI18n();
  return (
    <Appear as="section" delay={60} className={`${s.panel} ${s.openSlots}`}>
      <div data-appear="item" className={s.openSlotsTitle}>
        <span className={s.roundIcon}>
          <ArrowDownLeft size={20} />
        </span>
        <span>{t("AVAILABLE TODAY", "СЛОБОДНО ДЕНЕС")}</span>
      </div>
      <h2 data-appear="item" style={appearStep(2)}>
        {loaded
          ? t(
              `${available.length} openings.`,
              `${available.length} слободни термини.`,
            )
          : t("Finding openings…", "Се бараат слободни термини…")}
        <br />
        {t("Make room for more.", "Место за уште еден клиент.")}
      </h2>
      <p data-appear="item" style={appearStep(3)}>
        {t(
          "Book a client into an available slot.",
          "Закажете клиент во слободен термин.",
        )}
      </p>
      <div className={s.openingList}>
        {available.slice(0, 3).map((slot, index) => (
          <div
            key={`${slot.staffId}-${slot.startAt}`}
            className="flex min-w-0 items-center gap-1"
          >
            <button
              type="button"
              className="min-w-0 flex-1"
              data-appear="item"
              style={appearStep(4 + index)}
              onClick={() => onBook(slot)}
            >
              <strong>{bookingTimeLabel(slot.startAt)}</strong>
              <span>
                {slot.durationMins} min ·{" "}
                {staff.find((person) => person.id === slot.staffId)?.name ??
                  "—"}
              </span>
              <ArrowUpRight size={17} />
            </button>
            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onShare(slot)}
                aria-label={t(
                  `Share the ${bookingTimeLabel(slot.startAt)} opening`,
                  `Сподели го терминот во ${bookingTimeLabel(slot.startAt)}`,
                )}
              >
                <Share2 />
              </Button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        data-appear="item"
        style={appearStep(7)}
        className={s.openSlotsFooter}
        onClick={() => onBook()}
      >
        {t("View all available times", "Прегледај ги сите слободни термини")} ↗
      </button>
    </Appear>
  );
}
