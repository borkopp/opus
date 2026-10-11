import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { clientSignInDestination } from "@/lib/client-account";
import { DashboardI18nProvider } from "@/components/dashboard-i18n-provider";
import { isLocale } from "../../../../shared/i18n/locale";

export const metadata: Metadata = {
  title: "Your OPUS account",
  robots: { index: false, follow: false },
};

export default async function ClientSignIn({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    lang?: string | string[];
  }>;
}) {
  const [requestLocale, params] = await Promise.all([
    getRequestLocale(),
    searchParams,
  ]);
  const destination = clientSignInDestination(
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined,
  );
  const bookingHref = destination.startsWith("/book/")
    ? destination
    : undefined;
  const requestedLocale =
    (typeof params.lang === "string" ? params.lang : undefined) ??
    new URL(destination, "https://studio.opus.mk").searchParams.get("lang");
  const locale = isLocale(requestedLocale) ? requestedLocale : requestLocale;
  return (
    <DashboardI18nProvider locale={locale}>
      <AuthLayout purpose="client" bookingHref={bookingHref}>
        <EmailOtpForm
          purpose="client"
          callbackUrl={destination}
          title={
            locale === "mk"
              ? "Најава за вашите термини"
              : locale === "sq"
                ? "Hyni për terminet tuaja"
                : "Sign in for your appointments"
          }
          description={
            locale === "mk"
              ? "Зачувајте ги вашите податоци и управувајте со термините. Најавете се со код испратен на вашата е-пошта."
              : locale === "sq"
                ? "Ruani detajet tuaja dhe menaxhoni terminet. Hyni me një kod të dërguar në emailin tuaj."
                : "Save your details and manage your appointments. Sign in with a code sent to your email."
          }
        />
      </AuthLayout>
    </DashboardI18nProvider>
  );
}
