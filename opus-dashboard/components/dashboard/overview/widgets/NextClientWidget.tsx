import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { Clock3, Scissors, Wallet, ArrowUpRight } from "lucide-react";
import {
  appointmentHref,
  initials,
  overviewNumber,
  type OverviewData,
} from "@/lib/dashboard-overview";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame, WidgetEmpty } from "../WidgetFrame";
import s from "../../clarity.module.css";
export function NextClientWidget({
  booking,
  featured = false,
}: {
  booking: OverviewData["next"];
  featured?: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  return (
    <WidgetFrame
      delay={45}
      title={t("Up next", "Следен термин")}
      className={s.nextClient}
      action={
        booking && (
          <span className={s.livePill}>
            <i />
            {booking.status === "checked_in"
              ? t("Client arrived", "Клиентот пристигна")
              : bookingTimeLabel(booking.startAt)}
          </span>
        )
      }
    >
      {booking ? (
        <>
          {featured && (
            <div className={s.clientArtwork} aria-hidden="true">
              <span className={s.artPetals}>
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className={s.clientMonogram}>
                {initials(booking.customerName)}
              </span>
              <span className={s.artCaption}>
                {t("A little time for you.", "Малку време за себе.")}
              </span>
            </div>
          )}
          <div
            data-appear="item"
            style={appearStep(3)}
            className={s.clientIdentity}
          >
            {!featured && (
              <span className={s.avatar} data-tone="peach">
                {initials(booking.customerName)}
              </span>
            )}
            <div>
              <h3>{booking.customerName}</h3>
              <p>{booking.serviceName}</p>
            </div>
          </div>
          <div className={s.clientFacts}>
            <div data-appear="item" style={appearStep(4)}>
              <Clock3 size={15} />
              <strong>{bookingTimeLabel(booking.startAt)}</strong>
              <span>
                {Math.round((booking.endAt - booking.startAt) / 60_000)} min
              </span>
            </div>
            <div data-appear="item" style={appearStep(5)}>
              <Scissors size={15} />
              <strong>{booking.staffName}</strong>
              <span>{t("Your team", "Вашиот тим")}</span>
            </div>
            <div data-appear="item" style={appearStep(6)}>
              <Wallet size={15} />
              <strong>{overviewNumber(booking.priceMinorUnits, locale)}</strong>
              <span>{booking.currency}</span>
            </div>
          </div>
          <div
            data-appear="item"
            style={appearStep(7)}
            className={s.clientNote}
          >
            <span>{t("GOOD TO KNOW", "КОРИСНО ДА ЗНАЕТЕ")}</span>
            <p>
              {booking.notes ||
                t(
                  "No appointment notes yet.",
                  "Сè уште нема белешки за терминот.",
                )}
            </p>
          </div>
          <Link
            data-appear="item"
            style={appearStep(8)}
            className={s.clientButton}
            href={appointmentHref(booking)}
          >
            {t("View appointment", "Прегледај термин")}
            <ArrowUpRight size={17} />
          </Link>
        </>
      ) : (
        <WidgetEmpty>
          {t("No more appointments today.", "Нема повеќе термини денес.")}
        </WidgetEmpty>
      )}
    </WidgetFrame>
  );
}
