import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your OPUS account",
  robots: { index: false, follow: false },
};

export default async function ClientSignIn({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [locale, params] = await Promise.all([
    getRequestLocale(),
    searchParams,
  ]);
  return (
    <AuthLayout purpose="client">
      <EmailOtpForm
        purpose="client"
        callbackUrl={params.callbackUrl}
        title={
          locale === "mk"
            ? "Вашата OPUS сметка"
            : locale === "sq"
              ? "Llogaria juaj OPUS"
              : "Your OPUS account"
        }
        description={
          locale === "mk"
            ? "Една сметка за вашите термини во сите OPUS студија. Најавете се со е-пошта."
            : locale === "sq"
              ? "Një llogari për terminet tuaja në të gjitha studiot OPUS. Hyni me email."
              : "One account for your appointments at every OPUS studio. Sign in with email."
        }
      />
    </AuthLayout>
  );
}
