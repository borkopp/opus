"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReservationFrame({
  name,
  children,
  venueHref,
}: {
  name: string;
  children: React.ReactNode;
  venueHref?: string;
}) {
  const { t, language, setLanguage } = useDashboardI18n();
  return (
    <div className="public-site flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="min-w-0 truncate font-display text-lg font-semibold">
            {name}
          </span>
          {venueHref && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={venueHref}>
                {t(
                  "Venue website",
                  "Веб-страница на локалот",
                  "Faqja e lokalit",
                )}
              </Link>
            </Button>
          )}
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "en" | "mk" | "sq")}
          >
            <SelectTrigger
              aria-label={t("Language", "Јазик", "Gjuha")}
              className="w-auto min-w-32"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="mk">Македонски</SelectItem>
                <SelectItem value="sq">Shqip</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            © {new Date().getFullYear()} {name}
          </span>
          <Link href="https://opus.mk" className="flex items-center gap-2">
            {t("Powered by ", "Овозможено од ", "Mundësuar nga ")}
            <Logo className="text-xs" markClassName="h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
