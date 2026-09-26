import { getRequestLocale } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const locale = await getRequestLocale();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthLayout>
      <EmailOtpForm
        replayPublicTitle
        replayPublicDescription
        title={
          locale === "mk"
            ? "Создајте простор за вашето студио"
            : "Create your studio space"
        }
        description={
          locale === "mk"
            ? "Внесете ја е-поштата на студиото. Ќе ви испратиме код за да продолжите."
            : "Start with your studio email. We’ll send one secure code to continue."
        }
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
