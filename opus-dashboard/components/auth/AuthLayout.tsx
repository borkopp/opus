"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import s from "./auth.module.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useDashboardI18n();

  return (
    <main className={`auth-shell ${s.stage}`}>
      <div className={s.workspace}>
        <header className={s.topbar}>
          <a href="https://opus.mk" aria-label={t("OPUS home", "OPUS почетна")}>
            <Logo className={s.brand} />
          </a>
          <Button asChild variant="outline" className={s.backLink}>
            <a data-replay-public href="https://opus.mk">
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              {t("Back to OPUS", "Назад кон OPUS")}
            </a>
          </Button>
        </header>

        <div className={s.content}>
          <div className={s.formCard}>
            <div className={s.formContent}>{children}</div>
          </div>
          <aside className={s.studioCard}>
            <div className={s.portrait}>
              <Image
                src="/images/auth/studio-team-blue.png"
                alt={t(
                  "Three beauty professionals together in a bright salon with cool blue interiors",
                  "Тројца професионалци за убавина во светол салон со син ентериер",
                )}
                fill
                quality={90}
                sizes="(min-width: 1440px) 622px, (min-width: 1024px) 44vw, 1px"
                className={s.photo}
              />
            </div>
            <div className={s.studioCopy}>
              <p data-replay-public className={s.eyebrow}>
                {t("YOUR STUDIO, CONNECTED", "ВАШЕТО СТУДИО, ПОВРЗАНО")}
              </p>
              <h2 data-replay-public>
                {t("Everything in its place.", "Сè на свое место.")}
              </h2>
              <p data-replay-public className={s.studioDescription}>
                {t(
                  "Your appointments, your team, and your clients. Together in one simple workspace.",
                  "Вашите термини, вашиот тим и вашите клиенти. Заедно на едно место.",
                )}
              </p>
            </div>
          </aside>
        </div>

        <footer className={s.footer}>
          <p data-replay-public>
            {t(
              "A little more room for your day.",
              "Повеќе простор во вашиот ден.",
            )}
          </p>
          <nav aria-label={t("Support and legal", "Помош и правни информации")}>
            <a data-replay-public href="https://opus.mk/privacy">
              {t("Privacy policy", "Политика за приватност")}
            </a>
            <a data-replay-public href="https://opus.mk/terms">
              {t("Terms of service", "Услови за користење")}
            </a>
            <a data-replay-public href="https://opus.mk/contact">
              {t("Need a hand?", "Ви треба помош?")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
